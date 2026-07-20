import enum
import uuid

from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func

from app.db.database import Base


class NotificationType(str, enum.Enum):
    MENTION = "mention"
    ASSIGNED = "assigned"
    TASK_DONE = "task_done"


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Who receives it — always a specific user, never broadcast.
    recipient_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    # Who caused it, for "X mentioned you" / "X assigned you" copy. Nullable
    # for system-triggered events (e.g. automation later) with no actor.
    actor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    # SET NULL, not CASCADE — same pattern as ActivityLog.task_id from Week 6:
    # a notification about a deleted task should still show up in history,
    # just without a working link.
    task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True)

    type = Column(SAEnum(NotificationType), nullable=False)
    # Free-form payload per type — e.g. {"task_title": "...", "column_name": "Done"}
    # so the frontend can render copy without a second fetch.
    payload = Column(JSONB, nullable=False, default=dict)

    is_read = Column(Boolean, nullable=False, default=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)