"""enable pgvector extension

Revision ID: 80a0a0b077ba
Revises: 8eb68c1e6c69
Create Date: 2026-07-14 00:22:08.583701

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '80a0a0b077ba'
down_revision: Union[str, Sequence[str], None] = '8eb68c1e6c69'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DROP EXTENSION IF EXISTS vector")
