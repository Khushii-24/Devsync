"""add new activity event types

Revision ID: 10786d1ead68
Revises: b3f901c278e4
Create Date: 2026-07-22 02:18:52.824501

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '10786d1ead68'
down_revision: Union[str, Sequence[str], None] = 'b3f901c278e4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE activity_event_type ADD VALUE 'project_archived'")
        op.execute("ALTER TYPE activity_event_type ADD VALUE 'project_restored'")
        op.execute("ALTER TYPE activity_event_type ADD VALUE 'task_restored'")


def downgrade() -> None:
    pass
