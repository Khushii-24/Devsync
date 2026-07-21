from uuid import UUID
from datetime import datetime
from pydantic import BaseModel

from app.models.notification import NotificationType


class NotificationOut(BaseModel):
    id: UUID
    actor_id: UUID | None
    type: NotificationType
    payload: dict
    task_id: UUID | None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UnreadCountOut(BaseModel):
    count: int