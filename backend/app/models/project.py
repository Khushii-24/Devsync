from sqlalchemy import Column, String, Text, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from app.db.database import Base

class Project(Base):
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)  # Text = unlimited length, vs String which is varchar
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    workspace = relationship("Workspace", back_populates="projects")
    columns = relationship(
        "Column",
        back_populates="project",
        order_by="Column.position",
        cascade="all, delete-orphan",
    )
    documents = relationship(
        "Document",
        back_populates="project",
        cascade="all, delete-orphan",
    )
    tasks = relationship(
    "Task",
    back_populates="project",
    cascade="all, delete-orphan",
    )