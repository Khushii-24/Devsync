from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional

class WorkspaceCreate(BaseModel):
    name: str
    slug: Optional[str] = None

class WorkspaceResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class WorkspaceInviteRequest(BaseModel):
    email: str
    role: Optional[str] = "member"
