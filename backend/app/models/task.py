from ctypes import ARRAY
from sqlite3 import Date

from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey, Enum, func
from sqlalchemy.dialects.postgresql import UUID, ARRAY, TSVECTOR
from sqlalchemy.orm import relationship
import uuid, enum
from app.db.database import Base
from sqlalchemy import (
    Column,
    String,
    Text,
    Integer,
    Date,
    DateTime,
    ForeignKey,
    Enum,
    func,
)
class TaskPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class Task(Base):
    __tablename__ = "tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    project_id = Column(
        UUID(as_uuid=True),
        ForeignKey("projects.id"),
        nullable=False,
    )

    column_id = Column(
        UUID(as_uuid=True),
        ForeignKey("columns.id"),
        nullable=False,
    )

    assignee_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=True,
    )

    title = Column(String, nullable=False)

    description = Column(Text)

    priority = Column(
        Enum(TaskPriority),
        default=TaskPriority.MEDIUM,
    )

    labels = Column(ARRAY(String), default=list)

    position = Column(Integer, nullable=False)

    due_date = Column(Date, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    search_vector = Column(TSVECTOR, nullable=True)

    project = relationship("Project", back_populates="tasks")
    column = relationship("Column", back_populates="tasks")
    assignee = relationship("User", back_populates="tasks_assigned")
    comments = relationship("Comment", back_populates="task")