from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.dependencies import get_current_user
from app.models import Workspace, WorkspaceMember, User
from app.schemas.workspace_member import WorkspaceMemberResponse
from app.api.deps import require_workspace_member

router = APIRouter(tags=["workspaces"])


def get_workspace_or_404(workspace_id: UUID, db: Session):
    workspace = (
        db.query(Workspace)
        .filter(Workspace.id == workspace_id)
        .first()
    )

    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found",
        )

    return workspace


@router.get(
    "/workspaces/{workspace_id}/members",
    response_model=list[WorkspaceMemberResponse],
)
def list_workspace_members(
    workspace_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workspace = get_workspace_or_404(workspace_id, db)

    require_workspace_member(
        workspace.id,
        current_user,
        db,
    )

    members = (
        db.query(WorkspaceMember)
        .join(User)
        .filter(WorkspaceMember.workspace_id == workspace_id)
        .all()
    )

    return [
        WorkspaceMemberResponse(
            user_id=m.user_id,
            workspace_id=m.workspace_id,
            role=m.role.value,
            joined_at=m.joined_at,
            email=m.user.email,
            username=m.user.username,
        )
        for m in members
    ]