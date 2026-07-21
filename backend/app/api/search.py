from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from uuid import UUID

from app.db.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.task import Task
from app.models.document import Document
from app.models.project import Project
from app.models.workspace import WorkspaceMember
from app.schemas.search import SearchResults

router = APIRouter(prefix="/search", tags=["search"])

@router.get("", response_model=SearchResults)
def search(
    q: str = Query(..., min_length=1),
    project_id: UUID | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Get all workspace IDs the user is a member of
    allowed_workspace_ids = [
        row[0] for row in db.execute(
            select(WorkspaceMember.workspace_id).where(WorkspaceMember.user_id == current_user.id)
        ).all()
    ]

    if not allowed_workspace_ids:
        return SearchResults(tasks=[], documents=[])

    # 1. Search Tasks
    tasks_q = (
        select(Task)
        .join(Project, Task.project_id == Project.id)
        .where(
            Project.workspace_id.in_(allowed_workspace_ids),
            Project.deleted_at.is_(None),
            Task.deleted_at.is_(None),
            Task.search_vector.op("@@")(func.plainto_tsquery("english", q))
        )
    )
    if project_id:
        tasks_q = tasks_q.where(Task.project_id == project_id)

    # 2. Search Documents
    docs_q = (
        select(Document)
        .where(
            Document.workspace_id.in_(allowed_workspace_ids),
            Document.is_deleted.is_(False),
            Document.search_vector.op("@@")(func.plainto_tsquery("english", q))
        )
    )
    if project_id:
        docs_q = docs_q.where(Document.project_id == project_id)

    tasks_result = db.execute(tasks_q).scalars().all()
    docs_result = db.execute(docs_q).scalars().all()

    return SearchResults(
        tasks=list(tasks_result),
        documents=list(docs_result)
    )
