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
    return db.query(Project).filter(Project.workspace_id == workspace_id).order_by(Project.created_at).all()


@router.get("/projects/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = get_project_or_404(project_id, db)
    # membership derived from the project's OWN workspace_id, not a URL param — can't be spoofed
    # by e.g. hitting /projects/{someone-elses-project-id} and claiming a workspace_id you belong to.
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

    updates = payload.model_dump(exclude_unset=True)  # only fields actually sent get overwritten
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

    # Relies on Column/Task relationships having cascade="all, delete-orphan".
    # Confirm that's set on the Project model — otherwise this throws a FK violation
    # instead of cleanly deleting child columns/tasks.
    db.delete(project)
    db.commit()