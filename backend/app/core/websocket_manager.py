# backend/app/core/websocket_manager.py
from fastapi import WebSocket
from typing import Dict, List
import json
import redis.asyncio as redis   # the async client — matters because our WS
                                 # handlers are async; the sync redis client
                                 # would block the event loop

REDIS_URL = "redis://localhost:6379"  # "redis" here is the docker-compose service
                                     # name above — Docker's internal DNS resolves
                                     # it to the container's IP, same reason your
                                     # backend connects to postgres by service name
                                     # rather than localhost

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
        self.redis_client = redis.from_url(REDIS_URL, decode_responses=True)
        self.pubsub = self.redis_client.pubsub()

    async def connect(self, websocket: WebSocket, project_id: str):
        await websocket.accept()
        if project_id not in self.active_connections:
            self.active_connections[project_id] = []
        self.active_connections[project_id].append(websocket)

    def disconnect(self, websocket: WebSocket, project_id: str):
        connections = self.active_connections.get(project_id, [])
        if websocket in connections:
            connections.remove(websocket)
        if project_id in self.active_connections and not self.active_connections[project_id]:
            del self.active_connections[project_id]

    async def publish(self, project_id: str, message: dict):
        channel = f"project:{project_id}"

        print("Publishing to:", channel)
        print("Payload:", message)

        await self.redis_client.publish(channel, json.dumps(message))

    async def _deliver_locally(self, project_id: str, message: dict, exclude_id: str = None):
        # This is what Day 1's broadcast() used to do directly. Now it's only
        # ever called from the Redis listener, never called directly by
        # route handlers — so REST endpoints never touch local sockets at all.
        connections = self.active_connections.get(project_id, [])
        for connection in list(connections):
            try:
                await connection.send_text(json.dumps(message))
            except Exception:
                self.disconnect(connection, project_id)

    async def start_listener(self):
        # Subscribes this instance to ALL project channels using a Redis
        # pattern match ("project:*") rather than subscribing individually
        # per project — simpler than tracking subscribe/unsubscribe as rooms
        # come and go, at the cost of receiving events for projects this
        # instance has zero local connections for (harmless — _deliver_locally
        # just finds an empty list and does nothing).
        await self.pubsub.psubscribe("project:*")
        print("Redis listener started")
        async for message in self.pubsub.listen():
            print("Redis Event:", message)
            if message["type"] != "pmessage":
                # Redis sends confirmation/meta messages too (e.g. the
                # subscribe acknowledgment) — only "pmessage" is an actual
                # published event we care about.
                continue
            channel = message["channel"]          # e.g. "project:abc123"
            project_id = channel.split(":", 1)[1]
            payload = json.loads(message["data"])
            await self._deliver_locally(project_id, payload)

manager = ConnectionManager()