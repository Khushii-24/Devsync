# backend/app/models/document.py

import uuid
from datetime import datetime, timezone
from typing import Any
from sqlalchemy import String, ForeignKey, DateTime, Integer, Boolean, Text, FetchedValue
from sqlalchemy.dialects.postgresql import UUID, JSONB, TSVECTOR
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # Denormalized workspace_id — NOT trusted for access control (that's derived
    # from project.workspace_id at query time per our Week 2 principle), but
    # having it here lets us index/filter documents by workspace without a join.
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False, default="Untitled")

    # TipTap's native JSON doc shape: {"type": "doc", "content": [...]}
    # default=dict here would share a mutable dict across rows — use a lambda instead.
    content: Mapped[dict] = mapped_column(
        JSONB, nullable=False, default=lambda: {"type": "doc", "content": []}
    )

    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    content_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    search_vector: Mapped[Any] = mapped_column(TSVECTOR, FetchedValue(), nullable=True)

    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    project = relationship("Project", back_populates="documents")
    versions = relationship(
        "DocumentVersion", back_populates="document",
        cascade="all, delete-orphan", order_by="DocumentVersion.version_number.desc()"
    )


class DocumentVersion(Base):
    __tablename__ = "document_versions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # Immutable snapshot at save time — never mutated after insert.
    content: Mapped[dict] = mapped_column(JSONB, nullable=False)

    # Per-document incrementing counter (1, 2, 3...), NOT a global id.
    # Assigned server-side in the CRUD layer using the same
    # coalesce(max, 0) + 1 pattern as Week 2's position field.
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)

    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    document = relationship("Document", back_populates="versions")
    creator = relationship("User")