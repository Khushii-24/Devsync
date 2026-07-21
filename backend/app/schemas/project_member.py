from pydantic import BaseModel, ConfigDict
from uuid import UUID
from app.models.project_member import ProjectRole

class ProjectMemberOverride(BaseModel):
    user_id: UUID
    role: ProjectRole

class ProjectMemberResponse(BaseModel):
    project_id: UUID
    user_id: UUID
    role: ProjectRole
    username: str
    email: str

    model_config = ConfigDict(from_attributes=True)
