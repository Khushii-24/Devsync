# This file must import every model so Alembic's autogenerate can discover all tables.
# Without this, alembic only sees Base.metadata as empty and generates a blank migration.
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember, WorkspaceRole
from app.models.project import Project
from app.models.column import Column
from app.models.task import Task, TaskPriority
from app.models.comment import Comment
from app.models.document import Document