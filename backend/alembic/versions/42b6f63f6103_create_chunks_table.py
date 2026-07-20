"""create chunks table

Revision ID: 42b6f63f6103
Revises: 80a0a0b077ba
Create Date: 2026-07-14 00:22:18.729914

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from pgvector.sqlalchemy import Vector


# revision identifiers, used by Alembic.
revision: str = '42b6f63f6103'
down_revision: Union[str, Sequence[str], None] = '80a0a0b077ba'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "chunks",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", UUID(as_uuid=True), nullable=False),
        sa.Column("source_type", sa.String(20), nullable=False),
        sa.Column("source_id", UUID(as_uuid=True), nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("embedding", Vector(384), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_chunks_project_id", "chunks", ["project_id"])
    op.create_index("ix_chunks_source", "chunks", ["source_type", "source_id"])

    # ivfflat index for fast approximate cosine search
    op.execute(
        "CREATE INDEX ix_chunks_embedding ON chunks "
        "USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)"
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_chunks_embedding", table_name="chunks")
    op.drop_index("ix_chunks_source", table_name="chunks")
    op.drop_index("ix_chunks_project_id", table_name="chunks")
    op.drop_table("chunks")
