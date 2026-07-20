"""add full text search

Revision ID: 464a12f66091
Revises: 7f4ca6bbd70c
Create Date: 2026-07-20 14:47:15.176777

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '464a12f66091'
down_revision: Union[str, Sequence[str], None] = '7f4ca6bbd70c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add content_text column to documents table
    op.add_column('documents', sa.Column('content_text', sa.Text(), nullable=True))
    
    # Add search_vector to tasks
    op.execute(
        "ALTER TABLE tasks ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))) STORED"
    )
    op.create_index('ix_tasks_search_vector', 'tasks', ['search_vector'], postgresql_using='gin')

    # Add search_vector to documents
    op.execute(
        "ALTER TABLE documents ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content_text, ''))) STORED"
    )
    op.create_index('ix_documents_search_vector', 'documents', ['search_vector'], postgresql_using='gin')


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_documents_search_vector', table_name='documents')
    op.drop_column('documents', 'search_vector')
    op.drop_column('documents', 'content_text')
    
    op.drop_index('ix_tasks_search_vector', table_name='tasks')
    op.drop_column('tasks', 'search_vector')
