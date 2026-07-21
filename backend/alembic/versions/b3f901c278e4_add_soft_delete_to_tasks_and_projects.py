"""add soft delete columns to tasks and projects

Revision ID: b3f901c278e4
Revises: 9bed469f649a
Create Date: 2026-07-21 15:20:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b3f901c278e4'
down_revision = '9bed469f649a'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('tasks', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('projects', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))


def downgrade():
    op.drop_column('tasks', 'deleted_at')
    op.drop_column('projects', 'deleted_at')
