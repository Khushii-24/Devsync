from venv import logger

from app.schemas import project
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from uuid import UUID
import logging
from app.db.database import get_db
from app.core.dependencies import get_current_user
from app.models import Column, User
from app.schemas.column import ColumnCreate, ColumnUpdate, ColumnResponse
from app.api.deps import require_workspace_member, get_project_or_404
from app.core.websocket_manager import manager
from app.core.events import build_event

router = APIRouter(tags=["columns"])


def get_column_or_404(column_id: UUID, db: Session) -> Column:
    column = db.query(Column).filter(Column.id == column_id).first()
    if not column:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Column not found")
    return column


@router.post("/projects/{project_id}/columns", response_model=ColumnResponse, status_code=status.HTTP_201_CREATED)
async def create_column(
    project_id: UUID,
    payload: ColumnCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = get_project_or_404(project_id, db)
    require_workspace_member(project.workspace_id, current_user, db)

    # New column lands at the end of the board: max existing position + 1.
    # coalesce(..., -1) means the FIRST column in a project gets position 0
    # instead of erroring on None + 1 when the project has no columns yet.
    max_position = (
        db.query(func.coalesce(func.max(Column.position), -1))
        .filter(Column.project_id == project_id)
        .scalar()
    )

    column = Column(project_id=project_id, position=max_position + 1, **payload.model_dump())
    db.add(column)
    db.commit()
    db.refresh(column)
    event = build_event(
        "column.created",
        str(project.id),
        ColumnResponse.model_validate(column).model_dump(mode="json"),
        current_user.id,
    )

    try:
        await manager.publish(str(project.id), event)
    except Exception:
        logger.exception("Failed to publish column.created event")

    return column


@router.get("/projects/{project_id}/columns", response_model=list[ColumnResponse])
def list_columns(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = get_project_or_404(project_id, db)
    require_workspace_member(project.workspace_id, current_user, db)
    # order_by(position) is what makes the board render columns left-to-right in the right order
    return db.query(Column).filter(Column.project_id == project_id).order_by(Column.position).all()


@router.patch("/columns/{column_id}", response_model=ColumnResponse)
async def update_column(
    column_id: UUID,
    payload: ColumnUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    column = get_column_or_404(column_id, db)
    project = get_project_or_404(column.project_id, db)
    require_workspace_member(project.workspace_id, current_user, db)

    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(column, field, value)

    db.commit()
    db.refresh(column)
    event = build_event(
    "column.updated",
    str(column.project_id),
    ColumnResponse.model_validate(column).model_dump(mode="json"),
    current_user.id,
)

    try:
        await manager.publish(str(column.project_id), event)
    except Exception:
        logger.exception("Failed to publish column.updated event")
    return column


@router.delete("/columns/{column_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_column(
    column_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    column = get_column_or_404(column_id, db)
    project = get_project_or_404(column.project_id, db)
    require_workspace_member(project.workspace_id, current_user, db)

    db.delete(column)  # cascades to Tasks in this column — same cascade caveat as project delete
    db.commit()