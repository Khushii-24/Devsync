from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Enum, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid, enum
from app.db.database import Base

class WorkspaceRole(str, enum.Enum):  # str mixin = serializes cleanly to JSON as "owner", not WorkspaceRole.OWNER
    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"

class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, nullable=False, index=True)  # URL-safe identifier, e.g. "my-team"
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    members = relationship("WorkspaceMember", back_populates="workspace")
    projects = relationship("Project", back_populates="workspace")

class WorkspaceMember(Base):
    """Join table: links Users <-> Workspaces, with a role attached to that link."""
    __tablename__ = "workspace_members"

    # composite primary key — one row per (user, workspace) pair, can't duplicate
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), primary_key=True)
    role = Column(Enum(WorkspaceRole), default=WorkspaceRole.MEMBER, nullable=False)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    notifications_muted = Column(Boolean, default=False, nullable=False)

    user = relationship("User", back_populates="workspaces")
    workspace = relationship("Workspace", back_populates="members")