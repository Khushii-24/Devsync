from pydantic import BaseModel, ConfigDict
from typing import Optional
from uuid import UUID
from datetime import datetime


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None


class ProjectUpdate(BaseModel):
    # every field optional — PATCH means "update whatever's sent," not "replace everything"
    name: Optional[str] = None
    description: Optional[str] = None


class ProjectResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    name: str
    description: Optional[str] = None
    created_at: datetime
    task_count: int = 0

    model_config = ConfigDict(from_attributes=True)  # lets Pydantic read straight off the SQLAlchemy object, no manual dict conversion