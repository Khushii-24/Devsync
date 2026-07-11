from app.core.events import build_event
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, WebSocketException, status
from sqlalchemy.orm import Session
from app.core.websocket_manager import manager
from app.core.security import verify_token
from app.db.database import SessionLocal
from app.models import WorkspaceMember, Project
import json
from app.core.security import decode_access_token
router = APIRouter()

def get_db_sync():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# backend/app/api/websocket.py — changes from Day 1's version
@router.websocket("/ws/projects/{project_id}")
async def project_websocket(
    websocket: WebSocket,
    project_id: str,
    token: str = Query(...),
):
    db = SessionLocal()
    try:
        payload = decode_access_token(token)
        if payload is None:
            raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION)
        user_id = payload.get("sub")

        project = db.query(Project).filter(Project.id == project_id).first()
        if project is None:
            raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION)

        is_member = db.query(WorkspaceMember).filter(
            WorkspaceMember.workspace_id == project.workspace_id,
            WorkspaceMember.user_id == user_id,
        ).first()
        if is_member is None:
            raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION)
    finally:
        db.close()

    await manager.connect(websocket, project_id, user_id)   # now passes user_id
    
    online_users = await manager.get_online_users(project_id)
    sync_event = build_event("presence.sync", project_id, {"user_ids": online_users}, user_id)
    await websocket.send_text(json.dumps(sync_event))

    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect(websocket, project_id)   # now awaited