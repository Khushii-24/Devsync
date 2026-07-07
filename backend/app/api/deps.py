from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from app.models import Project, WorkspaceMember, User


def require_workspace_member(workspace_id: UUID, current_user: User, db: Session) -> WorkspaceMember:
    """Every project/column/task route funnels through this. Confirms current_user
    actually belongs to the workspace before touching anything inside it."""
    membership = (
        db.query(WorkspaceMember)
        .filter(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == current_user.id,
        )
        .first()
    )
    if not membership:
        # 403, not 404 — the workspace exists, this user just isn't in it (see your own
        # 401 vs 403 note from Week 1: we know exactly who they are, they're just not allowed).
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this workspace")
    return membership


def get_project_or_404(project_id: UUID, db: Session) -> Project:
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project