from venv import logger

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from uuid import UUID

from app.db.database import get_db
from app.core.dependencies import get_current_user
from app.models import Task, Column, User
from app.schemas.task import TaskCreate, TaskUpdate, TaskResponse, TaskReorderRequest
from app.api.deps import require_workspace_member, get_project_or_404
from app.core.websocket_manager import manager
from app.core.events import build_event

router = APIRouter(tags=["tasks"])


def get_task_or_404(task_id: UUID, db: Session) -> Task:
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return task


def get_column_or_404(column_id: UUID, db: Session) -> Column:
    column = db.query(Column).filter(Column.id == column_id).first()
    if not column:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Column not found")
    return column


@router.post("/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    payload: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    column = get_column_or_404(payload.column_id, db)
    project = get_project_or_404(column.project_id, db)
    require_workspace_member(project.workspace_id, current_user, db)

    # same "append to end" logic as columns on Day 1, scoped to this specific column
    max_position = (
        db.query(func.coalesce(func.max(Task.position), -1))
        .filter(Task.column_id == payload.column_id)
        .scalar()
    )

    task = Task(project_id=project.id, position=max_position + 1, **payload.model_dump())
    db.add(task)
    db.commit()
    db.refresh(task)
    event = build_event(
        event_type="task.created",
        project_id=str(task.project_id),
        payload=TaskResponse.model_validate(task).model_dump(mode="json"),
        user_id=current_user.id,
    )
    try:
        await manager.publish(str(task.project_id), event)
    except Exception:
        # A Redis hiccup should never roll back or fail a successful DB write.
        # The REST response below is still correct and already committed;
        # worst case here is other users just don't get a live update for
        # this one change until their next refetch. Log it, don't raise.
        logger.exception("Failed to publish task.created event")
    return task


@router.get("/projects/{project_id}/tasks", response_model=list[TaskResponse])
def list_tasks(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = get_project_or_404(project_id, db)
    require_workspace_member(project.workspace_id, current_user, db)
    # ordering by (column_id, position) means the frontend can just group-by column_id
    # on the array it receives and each group is already correctly sorted — no client-side sort needed
    return (
        db.query(Task)
        .filter(Task.project_id == project_id)
        .order_by(Task.column_id, Task.position)
        .all()
    )


@router.get("/tasks/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = get_task_or_404(task_id, db)
    project = get_project_or_404(task.project_id, db)
    require_workspace_member(project.workspace_id, current_user, db)
    return task

@router.patch("/tasks/reorder", status_code=status.HTTP_200_OK)
async def reorder_tasks(
    payload: TaskReorderRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Called once per drag-drop event (Day 5). The frontend sends the FULL new
    arrangement for every task whose column or position changed as a result of
    one drag — could be just the moved task, or that task plus everyone below it
    in both the source and destination columns (their positions shifted by one).
    """
    project = get_project_or_404(payload.project_id, db)
    require_workspace_member(project.workspace_id, current_user, db)

    task_ids = [item.task_id for item in payload.tasks]

    # Fetch all target tasks in ONE query instead of one query per item —
    # this is the actual "batch" part that avoids N round-trips.
    tasks = db.query(Task).filter(Task.id.in_(task_ids)).all()
    tasks_by_id = {t.id: t for t in tasks}

    if len(tasks_by_id) != len(task_ids):
        # someone sent a task_id that doesn't exist, or a stale/deleted id
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="One or more tasks not found")

    for task in tasks:
        # Guards against a manipulated payload trying to reorder tasks from a
        # DIFFERENT project into this one's membership check — every task here
        # must actually belong to the project we validated membership against.
        if task.project_id != payload.project_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Task {task.id} does not belong to project {payload.project_id}",
            )

    # All validation passed — now apply every update. Nothing is committed yet,
    # so if anything above had raised, none of these would exist.
    for item in payload.tasks:
        task = tasks_by_id[item.task_id]
        task.column_id = item.column_id
        task.position = item.position

    db.commit() 
    event = build_event(
    "task.reordered",
    str(payload.project_id),
    {
        "tasks": [item.model_dump() for item in payload.tasks]
    },
    current_user.id,
)

    try:
        await manager.publish(str(payload.project_id), event)
    except Exception:
        logger.exception("Failed to publish task.reordered event")

    return {"updated": len(payload.tasks)}

@router.patch("/tasks/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: UUID,
    payload: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = get_task_or_404(task_id, db)
    project = get_project_or_404(task.project_id, db)
    require_workspace_member(project.workspace_id, current_user, db)

    # if column_id is being changed here, we do NOT touch position — that's what
    # the dedicated reorder endpoint below is for. A plain PATCH from the detail panel
    # shouldn't silently corrupt drag ordering.
    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(task, field, value)

    db.commit()
    db.refresh(task)
    event = build_event(
        "task.updated",
        str(task.column.project_id),
        TaskResponse.model_validate(task).model_dump(mode="json"),
        current_user.id,
    )
    try:
        await manager.publish(event["project_id"], event)
    except Exception:
        logger.exception("Failed to publish task.updated event")

    return task
    return task


@router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    # ...existing 404 + access-control checks...
    project_id = task.column.project_id
    db.delete(task)
    db.commit()

    # There's no object left to serialize through TaskResponse — the payload
    # for a delete is intentionally minimal: just enough for the frontend to
    # know which cache entry to remove.
    event = build_event("task.deleted", str(project_id), {"task_id": str(task_id)}, current_user.id)
    try:
        await manager.publish(str(project_id), event)
    except Exception:
        logger.exception("Failed to publish task.deleted event")


