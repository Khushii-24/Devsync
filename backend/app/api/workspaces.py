import re
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, update

from app.db.database import get_db
from app.core.dependencies import get_current_user
from app.models import Workspace, WorkspaceMember, User, WorkspaceRole
from app.schemas.workspace import WorkspaceCreate, WorkspaceResponse, WorkspaceInviteRequest
from app.schemas.workspace_member import WorkspaceMemberResponse
from app.api.deps import require_workspace_member

router = APIRouter(tags=["workspaces"])


def get_workspace_or_404(workspace_id: UUID, db: Session):
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found",
        )
    return workspace


@router.get("/workspaces", response_model=list[WorkspaceResponse])
def list_workspaces(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Fetch workspaces where the user is a member
    workspaces = (
        db.query(Workspace)
        .join(WorkspaceMember)
        .filter(WorkspaceMember.user_id == current_user.id)
        .all()
    )
    return workspaces


@router.post("/workspaces", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
def create_workspace(
    payload: WorkspaceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Generate unique slug
    base_slug = payload.slug or re.sub(r'[^a-z0-9-]', '', payload.name.lower().replace(" ", "-"))
    if not base_slug:
        base_slug = "workspace"
    
    slug = base_slug
    counter = 1
    while db.query(Workspace).filter(Workspace.slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1

    workspace = Workspace(name=payload.name, slug=slug)
    db.add(workspace)
    db.flush()  # generates workspace.id

    # Create Owner link
    member = WorkspaceMember(
        user_id=current_user.id,
        workspace_id=workspace.id,
        role=WorkspaceRole.OWNER,
    )
    db.add(member)
    db.commit()
    db.refresh(workspace)
    return workspace


@router.post("/workspaces/{workspace_id}/invite", status_code=status.HTTP_200_OK)
def invite_workspace_member(
    workspace_id: UUID,
    payload: WorkspaceInviteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workspace = get_workspace_or_404(workspace_id, db)
    # Check that current user is an owner/admin of the workspace to invite others
    member_record = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == current_user.id
    ).first()
    
    if not member_record or member_record.role not in (WorkspaceRole.OWNER, WorkspaceRole.ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workspace owners or admins can invite new members",
        )

    # Find recipient by email
    invited_user = db.query(User).filter(User.email == payload.email).first()
    if not invited_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found. Invites require an existing account.",
        )

    # Check if already a member
    existing = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == invited_user.id
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member of this workspace",
        )

    # Add as workspace member
    new_member = WorkspaceMember(
        user_id=invited_user.id,
        workspace_id=workspace_id,
        role=payload.role or WorkspaceRole.MEMBER
    )
    db.add(new_member)
    db.commit()
    return {"status": "success", "detail": f"Invited {invited_user.username} to the workspace."}


@router.get("/workspaces/{workspace_id}/members", response_model=list[WorkspaceMemberResponse])
def list_workspace_members(
    workspace_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workspace = get_workspace_or_404(workspace_id, db)
    require_workspace_member(workspace.id, current_user, db)

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


@router.patch("/workspaces/{workspace_id}/members/{user_id}", response_model=WorkspaceMemberResponse)
def update_workspace_member_role(
    workspace_id: UUID,
    user_id: UUID,
    role: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workspace = get_workspace_or_404(workspace_id, db)
    # Check caller has OWNER role
    caller_member = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == current_user.id
    ).first()
    if not caller_member or caller_member.role != WorkspaceRole.OWNER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workspace owners can modify member roles",
        )

    # Retrieve member to update
    target_member = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == user_id
    ).first()
    if not target_member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace member not found",
        )

    # Validate role input
    if role not in (WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.MEMBER):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid workspace role",
        )

    target_member.role = WorkspaceRole(role)
    db.commit()
    db.refresh(target_member)
    
    return WorkspaceMemberResponse(
        user_id=target_member.user_id,
        workspace_id=target_member.workspace_id,
        role=target_member.role.value,
        joined_at=target_member.joined_at,
        email=target_member.user.email,
        username=target_member.user.username,
    )


@router.delete("/workspaces/{workspace_id}/members/{user_id}", status_code=status.HTTP_200_OK)
def remove_workspace_member(
    workspace_id: UUID,
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workspace = get_workspace_or_404(workspace_id, db)
    # Check caller has OWNER/ADMIN role (OWNER can remove anyone, ADMIN can remove members)
    caller_member = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == current_user.id
    ).first()
    if not caller_member or caller_member.role not in (WorkspaceRole.OWNER, WorkspaceRole.ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to remove members",
        )

    target_member = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == user_id
    ).first()
    if not target_member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace member not found",
        )

    if target_member.role == WorkspaceRole.OWNER and caller_member.role != WorkspaceRole.OWNER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners can remove other owners",
        )

    db.delete(target_member)
    db.commit()
    return {"status": "success", "detail": "Member removed from workspace."}


@router.post("/workspaces/{workspace_id}/mute", status_code=status.HTTP_200_OK)
def toggle_workspace_mute(
    workspace_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workspace = get_workspace_or_404(workspace_id, db)
    member_record = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == current_user.id
    ).first()
    if not member_record:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of this workspace",
        )

    member_record.notifications_muted = not member_record.notifications_muted
    db.commit()
    db.refresh(member_record)
    return {"status": "success", "notifications_muted": member_record.notifications_muted}


@router.get("/workspaces/{workspace_id}/mute-status", status_code=status.HTTP_200_OK)
def get_workspace_mute_status(
    workspace_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workspace = get_workspace_or_404(workspace_id, db)
    member_record = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == current_user.id
    ).first()
    if not member_record:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of this workspace",
        )
    return {"notifications_muted": member_record.notifications_muted}


@router.get("/workspaces/{workspace_id}/archive", status_code=status.HTTP_200_OK)
def get_workspace_archive(
    workspace_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workspace = get_workspace_or_404(workspace_id, db)
    require_workspace_member(workspace.id, current_user, db)

    from app.models.task import Task
    from app.models.project import Project
    from app.models.activity_log import ActivityLog, ActivityEventType

    # Fetch soft-deleted tasks in workspace
    deleted_tasks = (
        db.query(Task)
        .join(Project, Task.project_id == Project.id)
        .filter(Project.workspace_id == workspace_id, Task.deleted_at.isnot(None))
        .all()
    )

    # Fetch soft-deleted projects in workspace
    deleted_projects = (
        db.query(Project)
        .filter(Project.workspace_id == workspace_id, Project.deleted_at.isnot(None))
        .all()
    )

    items = []
    for t in deleted_tasks:
        # Find deletion log to extract who deleted it
        deletion_log = (
            db.query(ActivityLog)
            .filter(
                ActivityLog.workspace_id == workspace_id,
                ActivityLog.event_type == ActivityEventType.TASK_DELETED,
                ActivityLog.event_data["title"].astext == t.title
            )
            .order_by(ActivityLog.created_at.desc())
            .first()
        )
        items.append({
            "id": str(t.id),
            "name": t.title,
            "type": "task",
            "deleted_at": t.deleted_at.isoformat() if t.deleted_at else None,
            "deleted_by": deletion_log.actor.username if deletion_log and deletion_log.actor else "System",
            "deleted_by_user_id": str(deletion_log.actor_id) if deletion_log and deletion_log.actor_id else None,
        })

    for p in deleted_projects:
        deletion_log = (
            db.query(ActivityLog)
            .filter(
                ActivityLog.workspace_id == workspace_id,
                ActivityLog.event_type == ActivityEventType.PROJECT_ARCHIVED,
                ActivityLog.event_data["name"].astext == p.name
            )
            .order_by(ActivityLog.created_at.desc())
            .first()
        )
        items.append({
            "id": str(p.id),
            "name": p.name,
            "type": "project",
            "deleted_at": p.deleted_at.isoformat() if p.deleted_at else None,
            "deleted_by": deletion_log.actor.username if deletion_log and deletion_log.actor else "System",
            "deleted_by_user_id": str(deletion_log.actor_id) if deletion_log and deletion_log.actor_id else None,
        })

    return items


@router.get("/workspaces/{workspace_id}/audit-log", status_code=status.HTTP_200_OK)
def get_workspace_audit_log(
    workspace_id: UUID,
    actor_id: UUID | None = None,
    event_type: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    page: int = 1,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workspace = get_workspace_or_404(workspace_id, db)
    # RBAC check: Only OWNER or ADMIN roles can view workspace audit log
    member_record = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == current_user.id
    ).first()
    if not member_record or member_record.role not in (WorkspaceRole.OWNER, WorkspaceRole.ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workspace owners or admins can view the audit log",
        )

    from app.models.activity_log import ActivityLog
    from datetime import datetime

    query = db.query(ActivityLog).filter(ActivityLog.workspace_id == workspace_id)

    if actor_id:
        query = query.filter(ActivityLog.actor_id == actor_id)

    if event_type:
        query = query.filter(ActivityLog.event_type == event_type)

    if start_date:
        try:
            dt_start = datetime.fromisoformat(start_date)
            query = query.filter(ActivityLog.created_at >= dt_start)
        except ValueError:
            pass

    if end_date:
        try:
            dt_end = datetime.fromisoformat(end_date)
            query = query.filter(ActivityLog.created_at <= dt_end)
        except ValueError:
            pass

    total = query.count()
    offset = (page - 1) * limit
    logs = query.order_by(ActivityLog.created_at.desc()).offset(offset).limit(limit).all()

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "items": [
            {
                "id": str(log.id),
                "workspace_id": str(log.workspace_id),
                "project_id": str(log.project_id),
                "task_id": str(log.task_id) if log.task_id else None,
                "actor_id": str(log.actor_id) if log.actor_id else None,
                "actor_username": log.actor.username if log.actor else "System",
                "actor_email": log.actor.email if log.actor else None,
                "event_type": log.event_type.value if hasattr(log.event_type, "value") else str(log.event_type),
                "event_data": log.event_data,
                "created_at": log.created_at.isoformat(),
            }
            for log in logs
        ]
    }