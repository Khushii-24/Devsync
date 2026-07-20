"""add activity_logs table

Revision ID: xxxx_add_activity_logs
Revises: <PREVIOUS_REVISION_ID>
Create Date: 2026-07-15
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "xxxx_add_activity_logs"
down_revision = "42b6f63f6103"  # ASSUMPTION: fill in from `poetry run alembic history`
branch_labels = None
depends_on = None

activity_event_type = postgresql.ENUM(
    "task_created",
    "task_updated",
    "task_moved",
    "task_deleted",
    "comment_added",
    name="activity_event_type",
    create_type=False,     
)


def upgrade():
    activity_event_type.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "activity_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("task_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True),
        sa.Column("actor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("event_type", activity_event_type, nullable=False),
        sa.Column("event_data", postgresql.JSONB, nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_activity_logs_workspace_id", "activity_logs", ["workspace_id"])
    op.create_index("ix_activity_logs_project_id", "activity_logs", ["project_id"])
    op.create_index("ix_activity_logs_task_id", "activity_logs", ["task_id"])
    op.create_index("ix_activity_logs_created_at", "activity_logs", ["created_at"])


def downgrade():
    op.drop_index("ix_activity_logs_created_at", table_name="activity_logs")
    op.drop_index("ix_activity_logs_task_id", table_name="activity_logs")
    op.drop_index("ix_activity_logs_project_id", table_name="activity_logs")
    op.drop_index("ix_activity_logs_workspace_id", table_name="activity_logs")
    op.drop_table("activity_logs")
    activity_event_type.drop(op.get_bind(), checkfirst=True)