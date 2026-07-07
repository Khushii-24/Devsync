from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime


class WorkspaceMemberResponse(BaseModel):
    user_id: UUID
    workspace_id: UUID
    role: str
    joined_at: datetime

    email: str
    username: str

    model_config = ConfigDict(from_attributes=True)