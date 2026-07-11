# backend/app/api/documents.py

import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.dependencies import get_current_user
from app.models.document import Document, DocumentVersion
from app.models.project import Project
from app.models.workspace import WorkspaceMember
from app.models.user import User
from app.schemas.document import (
    DocumentCreate, DocumentUpdate, DocumentResponse,
    DocumentSummary, DocumentVersionSummary, DocumentVersionDetail,
)

router = APIRouter(tags=["documents"])


def verify_workspace_member(workspace_id: uuid.UUID, user: User, db: Session) -> None:
    """Same principle as Week 2: access is checked against the resource's own
    workspace_id (never a client-supplied one), by confirming a WorkspaceMember
    row exists for (workspace_id, user.id)."""
    result =  db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user.id,
        )
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not a member of this workspace")


def _get_document_or_404(document_id: uuid.UUID, db:  Session) -> Document:
    document = db.get(Document, document_id)
    if document is None or document.is_deleted:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found")
    return document


def _next_version_number(document_id: uuid.UUID, db:  Session) -> int:
    # coalesce(max, 0) + 1 — same pattern as Week 2's task position field.
    result =  db.execute(
        select(func.coalesce(func.max(DocumentVersion.version_number), 0)).where(
            DocumentVersion.document_id == document_id
        )
    )
    return result.scalar_one() + 1


# ---------- Create ----------

@router.post("/projects/{project_id}/documents", response_model=DocumentResponse, status_code=201)
def create_document(
    project_id: uuid.UUID,
    payload: DocumentCreate,
    db:   Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(404, "Project not found")
    verify_workspace_member(project.workspace_id, user, db)

    document = Document(
        project_id=project.id,
        workspace_id=project.workspace_id,  # derived from the project, never from client input
        title=payload.title,
        content=payload.content or {"type": "doc", "content": []},
        created_by=user.id,
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    return document


# ---------- List (sidebar) ----------

@router.get("/projects/{project_id}/documents", response_model=list[DocumentSummary])
def list_documents(
    project_id: uuid.UUID,
    db:   Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project =    db.get(Project, project_id)
    if project is None:
        raise HTTPException(404, "Project not found")
    verify_workspace_member(project.workspace_id, user, db)

    result =    db.execute(
        select(Document)
        .where(Document.project_id == project_id, Document.is_deleted.is_(False))
        .order_by(Document.updated_at.desc())
    )
    return result.scalars().all()


# ---------- Get single doc (full content) ----------

@router.get("/documents/{document_id}", response_model=DocumentResponse)
def get_document(
    document_id: uuid.UUID,
    db:   Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    document =    _get_document_or_404(document_id, db)
    verify_workspace_member(document.workspace_id, user, db)
    return document


# ---------- Update (autosave target) — this is where version snapshotting lives ----------

@router.patch("/documents/{document_id}", response_model=DocumentResponse)
def update_document(
    document_id: uuid.UUID,
    payload: DocumentUpdate,
    db:   Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    document =    _get_document_or_404(document_id, db)
    verify_workspace_member(document.workspace_id, user, db)

    # Snapshot decision made BEFORE mutating document.content, comparing
    # against the currently-stored value. Since document.content always
    # mirrors the latest DocumentVersion after every prior save, this is
    # equivalent to "diff against latest version" without an extra query.
    content_changed = payload.content is not None and payload.content != document.content

    if payload.title is not None:
        document.title = payload.title
    if payload.content is not None:
        document.content = payload.content

    if content_changed:
        version_number =    _next_version_number(document.id, db)
        db.add(DocumentVersion(
            document_id=document.id,
            content=payload.content,
            version_number=version_number,
            created_by=user.id,
        ))
        
    db.commit()
    db.refresh(document)
    return document


# ---------- Soft delete ----------

@router.delete("/documents/{document_id}", status_code=204)
def delete_document(
    document_id: uuid.UUID,
    db:   Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    document =    _get_document_or_404(document_id, db)
    verify_workspace_member(document.workspace_id, user, db)
    document.is_deleted = True
    db.commit()


# ---------- Version list (metadata only) ----------

@router.get("/documents/{document_id}/versions", response_model=list[DocumentVersionSummary])
def list_versions(
    document_id: uuid.UUID,
    db:  Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    document =    _get_document_or_404(document_id, db)
    verify_workspace_member(document.workspace_id, user, db)

    result =    db.execute(
        select(DocumentVersion)
        .where(DocumentVersion.document_id == document_id)
        .order_by(DocumentVersion.version_number.desc())
    )
    return result.scalars().all()


# ---------- Single version detail (for diff preview) ----------

@router.get("/documents/{document_id}/versions/{version_id}", response_model=DocumentVersionDetail)
def get_version(
    document_id: uuid.UUID,
    version_id: uuid.UUID,
    db:  Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    document =    _get_document_or_404(document_id, db)
    verify_workspace_member(document.workspace_id, user, db)

    version =    db.get(DocumentVersion, version_id)
    # Cross-check version.document_id — prevents fetching a version that
    # belongs to a DIFFERENT document by guessing/reusing a valid version_id.
    if version is None or version.document_id != document.id:
        raise HTTPException(404, "Version not found")
    return version


# ---------- Rollback ----------

@router.post("/documents/{document_id}/rollback/{version_id}", response_model=DocumentResponse)
def rollback_document(
    document_id: uuid.UUID,
    version_id: uuid.UUID,
    db:  Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    document =    _get_document_or_404(document_id, db)
    verify_workspace_member(document.workspace_id, user, db)

    target_version =    db.get(DocumentVersion, version_id)
    if target_version is None or target_version.document_id != document.id:
        raise HTTPException(404, "Version not found")

    # Rollback is applied AS a new version (not a silent overwrite) so the
    # rollback itself is recorded — you can always roll back a rollback.
    version_number =    _next_version_number(document.id, db)
    document.content = target_version.content
    db.add(DocumentVersion(
        document_id=document.id,
        content=target_version.content,
        version_number=version_number,
        created_by=user.id,
    ))
    db.commit()
    db.refresh(document)
    return document