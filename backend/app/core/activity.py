from typing import Optional
from uuid import UUID
from sqlalchemy.orm import Session
from app.models.activity_log import ActivityLog, ActivityEventType


def log_activity(
    db: Session,
    *,
    workspace_id: UUID,
    project_id: UUID,
    event_type: ActivityEventType,
    task_id: Optional[UUID] = None,
    actor_id: Optional[UUID] = None,
    event_data: Optional[dict] = None,

):  
    print("event_data:", event_data)
    entry = ActivityLog(
        workspace_id=workspace_id,
        project_id=project_id,
        task_id=task_id,
        actor_id=actor_id,
        event_type=event_type,
        event_data=event_data or {},
    )

    db.add(entry)
    db.flush()
    return entry