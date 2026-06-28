from sqlalchemy import Column, String, Boolean, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from app.db.database import Base

class User(Base):
    __tablename__ = "users"

    # default=uuid.uuid4 generates the ID in Python before insert — no DB round-trip needed
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)

    # server_default tells POSTGRES (not Python) to stamp the time — survives raw SQL inserts too
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # back_populates means: keep both sides of this relationship in sync automatically
    workspaces = relationship("WorkspaceMember", back_populates="user")
    tasks_assigned = relationship("Task", back_populates="assignee")
    comments = relationship("Comment", back_populates="author")