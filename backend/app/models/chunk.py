# backend/app/models/chunk.py
import uuid
from sqlalchemy import Column, String, Text, DateTime, func, Index
from sqlalchemy.dialects.postgresql import UUID
from pgvector.sqlalchemy import Vector
# pyrefly: ignore [missing-import]
from app.db.database import Base 


class Chunk(Base):
    __tablename__ = "chunks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), nullable=False, index=True)  # scoping — never trust client-supplied scope

    # Polymorphic source reference — NOT a real FK (no single source table).
    # Enforced at app layer: source_type + source_id must be validated against
    # documents/tasks tables in embeddings.py before insert.
    source_type = Column(String(20), nullable=False)  # "document" | "task"
    source_id = Column(UUID(as_uuid=True), nullable=False)

    content = Column(Text, nullable=False)          # raw chunk text (used as LLM context + citation display)
    embedding = Column(Vector(384), nullable=False)  # MiniLM dim — do not change without re-embedding everything

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("ix_chunks_source", "source_type", "source_id"),  # for cleanup-on-delete lookups (Day 2)
    )