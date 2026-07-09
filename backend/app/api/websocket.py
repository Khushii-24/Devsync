from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, WebSocketException, status
from sqlalchemy.orm import Session
from app.core.websocket_manager import manager
from app.core.security import verify_token
from app.db.database import SessionLocal
from app.models import WorkspaceMember, Project
import json

router = APIRouter()

def get_db_sync():
    # A plain (non-generator-dependency) DB session grabber, because WebSocket
    # routes can't use Depends(get_db) the same way REST routes do — more on
    # that below.
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.websocket("/ws/projects/{project_id}")
async def project_websocket(
    websocket: WebSocket,
    project_id: str,
    token: str = Query(...),   # pulled from ?token=... in the connection URL
):
    db = SessionLocal()
    try:
        # 1. Verify the JWT is valid and get the user it belongs to.
        user_id = verify_token(token, "access")

        print("User ID:", user_id)

        if user_id is None:
            raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION)

        # 2. Verify the project exists and belongs to some workspace.
        project = db.query(Project).filter(Project.id == project_id).first()
        if project is None:
            raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION)

        # 3. Same access-control principle as your REST deps.py: derive
        # workspace membership from the resource's own workspace_id, never
        # trust anything the client claims about itself.
        is_member = db.query(WorkspaceMember).filter(
            WorkspaceMember.workspace_id == project.workspace_id,
            WorkspaceMember.user_id == user_id,
        ).first()
        if is_member is None:
            raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION)

    finally:
        db.close()

    # Auth passed — now join the room.
    await manager.connect(websocket, project_id)

    try:
        while True:
            # For now clients don't need to send anything meaningful — the
            # server pushes events, it doesn't expect requests back. But we
            # still have to await receive_*() to keep the loop alive and to
            # detect disconnects. Tomorrow this becomes useful for presence
            # (e.g. a client pinging "still here").
            data = await websocket.receive_text()

            # in project_websocket, wherever you had the temporary test broadcast:
            await manager.publish(project_id, {"type": "test", "data": data})
    except WebSocketDisconnect:
        manager.disconnect(websocket, project_id)