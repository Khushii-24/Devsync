# backend/app/core/websocket_manager.py
from fastapi import WebSocket
from typing import Dict, List, Tuple
import json
import redis.asyncio as redis

REDIS_URL = "redis://127.0.0.1:6379"

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # NEW: reverse lookup so that when a socket dies (e.g. a failed send
        # in _deliver_locally, which only has the WebSocket object on hand,
        # not who it belongs to), we can still find which project/user it
        # was and correctly decrement presence for the right person.
        self.socket_meta: Dict[WebSocket, Tuple[str, str]] = {}
        self.redis_client = redis.from_url(REDIS_URL, decode_responses=True)
        self.pubsub = self.redis_client.pubsub()

    async def connect(self, websocket: WebSocket, project_id: str, user_id: str):
        await websocket.accept()
        self.active_connections.setdefault(project_id, []).append(websocket)
        self.socket_meta[websocket] = (project_id, user_id)
        await self._join_presence(project_id, user_id)

    async def disconnect(self, websocket: WebSocket, project_id: str):
        connections = self.active_connections.get(project_id, [])
        if websocket in connections:
            connections.remove(websocket)
        if project_id in self.active_connections and not self.active_connections[project_id]:
            del self.active_connections[project_id]

        meta = self.socket_meta.pop(websocket, None)
        if meta:
            _, user_id = meta
            await self._leave_presence(project_id, user_id)
        # Note: disconnect() is now async (it wasn't in Day 1/2), because
        # _leave_presence below does a Redis round-trip. Every existing call
        # site needs `await` added — see _deliver_locally and websocket.py below.

    async def _join_presence(self, project_id: str, user_id: str):
        key = f"presence:{project_id}"
        # HINCRBY is atomic at the Redis level — even if two of this user's
        # tabs connect on two different instances in the same millisecond,
        # Redis serializes the increments so the count is still correct.
        # No client-side locking needed; this is exactly the kind of shared
        # counter a local Python dict could never safely be across processes.
        new_count = await self.redis_client.hincrby(key, user_id, 1)
        if new_count == 1:
            # This was their FIRST connection to this project (not a 2nd tab)
            # — only now do we tell everyone else they joined.
            from app.core.events import build_event
            event = build_event("user.joined", project_id, {"user_id": user_id}, user_id)
            await self.publish(project_id, event)

    async def _leave_presence(self, project_id: str, user_id: str):
        key = f"presence:{project_id}"
        new_count = await self.redis_client.hincrby(key, user_id, -1)
        if new_count <= 0:
            # Their LAST connection just closed — actually gone now.
            await self.redis_client.hdel(key, user_id)
            from app.core.events import build_event
            event = build_event("user.left", project_id, {"user_id": user_id}, user_id)
            await self.publish(project_id, event)

    async def get_online_users(self, project_id: str) -> list:
        key = f"presence:{project_id}"
        # hkeys returns just the user_ids (the hash keys), not the counts —
        # a newly-connecting client only needs to know WHO's online, not how
        # many tabs each of them has open.
        return await self.redis_client.hkeys(key)

    async def publish(self, project_id: str, message: dict):
        channel = f"project:{project_id}"
        await self.redis_client.publish(channel, json.dumps(message))

    async def _deliver_locally(self, project_id: str, message: dict):
        connections = self.active_connections.get(project_id, [])
        for connection in list(connections):
            try:
                await connection.send_text(json.dumps(message))
            except Exception:
                await self.disconnect(connection, project_id)   # now awaited

    async def start_listener(self):
        await self.pubsub.psubscribe("project:*")
        async for message in self.pubsub.listen():
            if message["type"] != "pmessage":
                continue
            channel = message["channel"]
            project_id = channel.split(":", 1)[1]
            payload = json.loads(message["data"])
            await self._deliver_locally(project_id, payload)

manager = ConnectionManager()