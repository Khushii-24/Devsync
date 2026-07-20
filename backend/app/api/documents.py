# backend/app/api/documents.py
from app.core.events import build_event
from venv import logger
import uuid
from app.core.embeddings import upsert_embedding, delete_embeddings, extract_plain_text
from app.models import document
from sqlalchemy.orm import selectinload
from asyncio import get_event_loop
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from app.core.websocket_manager import manager

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
from app.core.events import build_event  # <- adjust import path if yours differs

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
async def update_document(
    document_id: uuid.UUID,
    payload: DocumentUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    document =  _get_document_or_404(document_id, db)
    verify_workspace_member(document.workspace_id, user, db)

    content_changed = payload.content is not None and payload.content != document.content

    if payload.title is not None:
        document.title = payload.title
    if payload.content is not None:
        document.content = payload.content

    version_number = None
    if content_changed:
        version_number = _next_version_number(document.id, db)
        db.add(DocumentVersion(
            document_id=document.id, content=payload.content,
            version_number=version_number, created_by=user.id,
        ))

    db.commit()
    plain_text = extract_plain_text(document.content)  # strip TipTap JSON down to text — see note below
    upsert_embedding(db, project_id=document.project_id, source_type="document",
                      source_id=document.id, text=plain_text)
    db.refresh(document)

    # Commit-before-publish, same rule as Week 3 — clients must never receive
    # a WS event referencing state that isn't durably persisted yet.
    event = build_event(
        project_id=str(document.project_id),
        event_type="document.updated",
        payload={
            "document_id": str(document.id),
            "title": document.title,
            "content": document.content,
            "version_number": version_number,
        },
        user_id=str(user.id),
    )
    print("\n========== PATCH ==========")
    print(document.content)
    print("===========================\n")
    try:
        await manager.publish(event["project_id"], event)
    except Exception:
        logger.exception("Failed to publish document.updated event")

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
    delete_embeddings(db, source_type="document", source_id=document.id)



# ---------- Version list (metadata only) ----------

@router.get("/documents/{document_id}/versions", response_model=list[DocumentVersionSummary])
def list_versions(
    document_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    document =  _get_document_or_404(document_id, db)
    verify_workspace_member(document.workspace_id, user, db)

    result =  db.execute(
        select(DocumentVersion)
        .options(selectinload(DocumentVersion.creator))  # avoids N+1 lazy-load per row
        .where(DocumentVersion.document_id == document_id)
        .order_by(DocumentVersion.version_number.desc())
    )
    versions = result.scalars().all()
    # from_attributes doesn't reach through relationships to build a flat
    # `created_by_name` field automatically — set it explicitly per row.
    return [
        DocumentVersionSummary(
            id=v.id, version_number=v.version_number, created_by=v.created_by,
            created_by_name=v.creator.username, created_at=v.created_at,
        )
        for v in versions
    ]

@router.get("/documents/{document_id}/versions/{version_id}", response_model=DocumentVersionDetail)
def get_version(
    document_id: uuid.UUID,
    version_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    document =  _get_document_or_404(document_id, db)
    verify_workspace_member(document.workspace_id, user, db)

    result =  db.execute(
        select(DocumentVersion)
        .options(selectinload(DocumentVersion.creator))
        .where(DocumentVersion.id == version_id, DocumentVersion.document_id == document_id)
    )
    version = result.scalar_one_or_none()
    if version is None:
        raise HTTPException(404, "Version not found")
    return DocumentVersionDetail(
        id=version.id, version_number=version.version_number, created_by=version.created_by,
        created_by_name=version.creator.username, created_at=version.created_at, content=version.content,
    )

# ---------- Rollback ----------

# backend/app/api/documents.py — rollback endpoint, add the same publish after commit

@router.post("/documents/{document_id}/rollback/{version_id}", response_model=DocumentResponse)
def rollback_document(
    document_id: uuid.UUID,
    version_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    document =  _get_document_or_404(document_id, db)
    verify_workspace_member(document.workspace_id, user, db)

    target_version =  db.get(DocumentVersion, version_id)
    if target_version is None or target_version.document_id != document.id:
        raise HTTPException(404, "Version not found")

    version_number =  _next_version_number(document.id, db)
    document.content = target_version.content
    db.add(DocumentVersion(
        document_id=document.id, content=target_version.content,
        version_number=version_number, created_by=user.id,
    ))
    db.commit()
    db.refresh(document)

    build_event(
        project_id=document.project_id,
        event_type="document.updated",
        payload={
            "document_id": str(document.id), "title": document.title,
            "content": document.content, "version_number": version_number,
        },
        user_id=str(user.id),
    )
    return document