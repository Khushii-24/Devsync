from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from uuid import UUID

from app.db.database import get_db
from app.core.dependencies import get_current_user
from app.models import Project, User
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse
from app.api.deps import require_workspace_member, get_project_or_404

router = APIRouter(tags=["projects"])


@router.post("/workspaces/{workspace_id}/projects", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    workspace_id: UUID,
    payload: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_workspace_member(workspace_id, current_user, db)

    project = Project(workspace_id=workspace_id, **payload.model_dump())
    db.add(project)
    db.commit()
    db.refresh(project)  # pulls back DB-generated id/created_at so the response has real values, not None
    return project


@router.get("/workspaces/{workspace_id}/projects", response_model=list[ProjectResponse])
def list_projects(
    workspace_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_workspace_member(workspace_id, current_user, db)
    return db.query(Project).filter(Project.workspace_id == workspace_id, Project.deleted_at.is_(None)).order_by(Project.created_at).all()


@router.get("/projects/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = get_project_or_404(project_id, db)
    require_workspace_member(project.workspace_id, current_user, db)
    return project


@router.patch("/projects/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: UUID,
    payload: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = get_project_or_404(project_id, db)
    require_workspace_member(project.workspace_id, current_user, db)

    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(project, field, value)

    db.commit()
    db.refresh(project)
    return project


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = get_project_or_404(project_id, db)
    require_workspace_member(project.workspace_id, current_user, db)

    from sqlalchemy import func
    from app.core.activity import log_activity
    from app.models.activity_log import ActivityEventType

    project.deleted_at = func.now()
    log_activity(
        db,
        workspace_id=project.workspace_id,
        project_id=project.id,
        actor_id=current_user.id,
        event_type=ActivityEventType.PROJECT_ARCHIVED,
        event_data={"name": project.name},
    )
    db.commit()


@router.post("/projects/{project_id}/restore", response_model=ProjectResponse)
def restore_project(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id, Project.deleted_at.isnot(None)).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Archived project not found")

    require_workspace_member(project.workspace_id, current_user, db)

    from app.core.activity import log_activity
    from app.models.activity_log import ActivityEventType

    project.deleted_at = None
    log_activity(
        db,
        workspace_id=project.workspace_id,
        project_id=project.id,
        actor_id=current_user.id,
        event_type=ActivityEventType.PROJECT_RESTORED,
        event_data={"name": project.name},
    )
    db.commit()
    db.refresh(project)
    return project


# Project Role Overrides endpoints
from app.models.project_member import ProjectMember, ProjectRole
from app.models.workspace import WorkspaceMember
from app.schemas.project_member import ProjectMemberResponse, ProjectMemberOverride

@router.get("/projects/{project_id}/members", response_model=list[ProjectMemberResponse])
def list_project_members_and_overrides(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = get_project_or_404(project_id, db)
    require_workspace_member(project.workspace_id, current_user, db)

    # 1. Fetch all members of the workspace
    workspace_members = (
        db.query(WorkspaceMember)
        .join(User)
        .filter(WorkspaceMember.workspace_id == project.workspace_id)
        .all()
    )

    # 2. Fetch all existing project override rows
    overrides = {
        o.user_id: o.role
        for o in db.query(ProjectMember).filter(ProjectMember.project_id == project_id).all()
    }

    # 3. Build response, defaulting to EDITOR or matching override
    res = []
    for wm in workspace_members:
        # If there is a project-specific override role, use it. Otherwise, defaults to EDITOR.
        role = overrides.get(wm.user_id, ProjectRole.EDITOR)
        res.append(ProjectMemberResponse(
            project_id=project_id,
            user_id=wm.user_id,
            role=role,
            username=wm.user.username,
            email=wm.user.email
        ))
    return res


@router.post("/projects/{project_id}/members", response_model=ProjectMemberResponse)
def create_or_update_project_override(
    project_id: UUID,
    payload: ProjectMemberOverride,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = get_project_or_404(project_id, db)
    # Only workspace owner/admin can set project overrides
    caller_member = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == project.workspace_id,
        WorkspaceMember.user_id == current_user.id
    ).first()
    if not caller_member or caller_member.role not in ("owner", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workspace owners or admins can set project overrides",
        )

    # Verify target user is in workspace
    target_user = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == project.workspace_id,
        WorkspaceMember.user_id == payload.user_id
    ).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not a member of the workspace",
        )

    # Upsert project override row
    override = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == payload.user_id
    ).first()

    if not override:
        override = ProjectMember(
            project_id=project_id,
            user_id=payload.user_id,
            role=payload.role
        )
        db.add(override)
    else:
        override.role = payload.role
    
    db.commit()
    db.refresh(override)

    return ProjectMemberResponse(
        project_id=project_id,
        user_id=override.user_id,
        role=override.role,
        username=target_user.user.username,
        email=target_user.user.email
    )


@router.delete("/projects/{project_id}/members/{user_id}", status_code=status.HTTP_200_OK)
def delete_project_override(
    project_id: UUID,
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = get_project_or_404(project_id, db)
    caller_member = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == project.workspace_id,
        WorkspaceMember.user_id == current_user.id
    ).first()
    if not caller_member or caller_member.role not in ("owner", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workspace owners or admins can remove project overrides",
        )

    override = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == user_id
    ).first()

    if override:
        db.delete(override)
        db.commit()

    return {"status": "success", "detail": "Project override removed."}