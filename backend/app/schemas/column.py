from pydantic import BaseModel, ConfigDict
from typing import Optional
from uuid import UUID


class ColumnCreate(BaseModel):
    name: str
    # no position here — the server assigns it (see create_column below).
    # letting the client set it invites duplicate/out-of-order positions.


class ColumnUpdate(BaseModel):
    name: Optional[str] = None
    position: Optional[int] = None  # single-column position edits are fine here; the *batch* reorder endpoint is Day 2


class ColumnResponse(BaseModel):
    id: UUID
    project_id: UUID
    name: str
    position: int

    model_config = ConfigDict(from_attributes=True)