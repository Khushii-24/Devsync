# backend/app/schemas/document.py

import uuid
from datetime import datetime
from pydantic import BaseModel, Field


class DocumentCreate(BaseModel):
    title: str = Field(default="Untitled", max_length=255)
    # Content is optional on create — most docs start empty and get their
    # first real content via the first autosave PATCH, not at creation time.
    content: dict | None = None


class DocumentUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=255)
    content: dict | None = None


class DocumentResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    workspace_id: uuid.UUID
    title: str
    content: dict
    created_by: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Sidebar list view — deliberately excludes `content`. A project can have many
# docs; shipping full JSONB content for every row on every sidebar load is
# wasted bandwidth. Fetch content only when a doc is opened.
class DocumentSummary(BaseModel):
    id: uuid.UUID
    title: str
    updated_at: datetime

    class Config:
        from_attributes = True


class DocumentVersionSummary(BaseModel):
    id: uuid.UUID
    version_number: int
    created_by: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True


# Only the detail endpoint (single version fetch, for diff/rollback preview)
# includes content — same lazy-load reasoning as DocumentSummary above.
class DocumentVersionDetail(DocumentVersionSummary):
    content: dict