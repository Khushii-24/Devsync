import enum
from sqlalchemy import Column, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.database import Base

class ProjectRole(str, enum.Enum):
    EDITOR = "editor"
    VIEWER = "viewer"

class ProjectMember(Base):
    __tablename__ = "project_members"

    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    role = Column(SAEnum(ProjectRole), default=ProjectRole.EDITOR, nullable=False)

    project = relationship("Project")
    user = relationship("User")
