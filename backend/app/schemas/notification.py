from datetime import datetime
from pydantic import BaseModel

from app.models.notification import NotificationType


class NotificationOut(BaseModel):
    id: str
    actor_id: str | None
    type: NotificationType
    payload: dict
    task_id: str | None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UnreadCountOut(BaseModel):
    count: int