from venv import logger

import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, cast
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Session
from uuid import UUID
from app.core.embeddings import upsert_embedding,delete_embeddings
from app.core.activity import log_activity
from app.models.activity_log import ActivityLog, ActivityEventType
from app.db.database import get_db
from app.core.dependencies import get_current_user
from app.models import Task, Column, User
from app.schemas.task import TaskCreate, TaskUpdate, TaskResponse, TaskReorderRequest
from app.api.deps import require_workspace_member, get_project_or_404
from app.core.websocket_manager import manager
from app.core.events import build_event

router = APIRouter(tags=["tasks"])


def get_task_or_404(task_id: UUID, db: Session) -> Task:
    task = db.query(Task).filter(Task.id == task_id, Task.deleted_at.is_(None)).first()
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
    db.flush() 
    print("Task title:", task.title) # generates task.id before using it
    log_activity(
        db=db,
        workspace_id=project.workspace_id,
        project_id=project.id,
        task_id=task.id,
        actor_id=current_user.id,
        event_type=ActivityEventType.TASK_CREATED,
        event_data={
            "title": task.title,
            "column_id": str(task.column_id),
        },

    )
    db.commit()
    def _sync_task_embedding(db: Session, task):
        text = f"{task.title}\n{task.description or ''}"
        upsert_embedding(db, project_id=task.project_id, source_type="task",
                        source_id=task.id, text=text)
    db.refresh(task)
    _sync_task_embedding(db, task)
    event = build_event(
        event_type="task.created",
        project_id=str(task.project_id),
        payload=TaskResponse.model_validate(task).model_dump(mode="json"),
        user_id=current_user.id,
    )
    try:
        await manager.publish(str(task.project_id), event)
    except Exception:
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
        .filter(Task.project_id == project_id, Task.deleted_at.is_(None))
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

    project = get_project_or_404(payload.project_id, db)
    require_workspace_member(project.workspace_id, current_user, db)

    task_ids = [item.task_id for item in payload.tasks]

    tasks = db.query(Task).filter(Task.id.in_(task_ids), Task.deleted_at.is_(None)).all()
    tasks_by_id = {t.id: t for t in tasks}

    if len(tasks_by_id) != len(task_ids):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="One or more tasks not found")

    for task in tasks:
        if task.project_id != payload.project_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Task {task.id} does not belong to project {payload.project_id}",
            )

    moved_tasks = []
    for item in payload.tasks:
        task = tasks_by_id[item.task_id]
        old_column_id = task.column_id
        if old_column_id != item.column_id:
            moved_tasks.append((task, old_column_id, item.column_id))
        task.column_id = item.column_id
        task.position = item.position

    # Log individual TASK_MOVED events for the actual movements
    for task, old_col_id, new_col_id in moved_tasks:
        log_activity(
            db=db,
            workspace_id=project.workspace_id,
            project_id=project.id,
            task_id=task.id,
            actor_id=current_user.id,
            event_type=ActivityEventType.TASK_MOVED,
            event_data={
                "title": task.title,
                "from_column_id": str(old_col_id),
                "to_column_id": str(new_col_id),
            },
        )
        new_column = db.query(Column).filter(Column.id == new_col_id).first()
        if new_column and new_column.name.lower() == "done" and task.assignee_id:
            from app.core.notifications import create_notification
            from app.models.notification import NotificationType
            await create_notification(
                db=db,
                recipient_id=str(task.assignee_id),
                actor_id=str(current_user.id),
                workspace_id=str(project.workspace_id),
                project_id=str(project.id),
                task_id=str(task.id),
                type=NotificationType.TASK_DONE,
                payload={
                    "task_title": task.title,
                    "column_name": new_column.name,
                    "actor_name": current_user.username
                }
            )

    log_activity(
        db=db,
        workspace_id=project.workspace_id,
        project_id=project.id,
        actor_id=current_user.id,
        event_type=ActivityEventType.TASK_MOVED,
        event_data={
            "task_count": len(payload.tasks),
        },
    )
    
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

    old_column_id = task.column_id
    old_assignee_id = task.assignee_id
    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(task, field, value)

    log_activity(
        db,
        workspace_id=task.project.workspace_id,
        project_id=task.project_id,
        task_id=task.id,
        actor_id=current_user.id,
        event_type=ActivityEventType.TASK_UPDATED,
        event_data={"changed_fields": list(updates.keys())},
    )

    if "column_id" in updates and updates["column_id"] is not None:
        new_col_uuid = UUID(str(updates["column_id"]))
        if old_column_id != new_col_uuid:
            log_activity(
                db=db,
                workspace_id=project.workspace_id,
                project_id=project.id,
                task_id=task.id,
                actor_id=current_user.id,
                event_type=ActivityEventType.TASK_MOVED,
                event_data={
                    "title": task.title,
                    "from_column_id": str(old_column_id),
                    "to_column_id": str(new_col_uuid),
                },
            )

    if "title" in updates:
        val = json.dumps(updates["title"])
        db.query(ActivityLog).filter(ActivityLog.task_id == task.id).update(
            {ActivityLog.event_data: func.jsonb_set(ActivityLog.event_data, '{title}', cast(val, JSONB))},
            synchronize_session=False
        )

    # Trigger Notifications
    if "assignee_id" in updates and str(old_assignee_id) != str(updates["assignee_id"]) and updates["assignee_id"] is not None:
        from app.core.notifications import create_notification
        from app.models.notification import NotificationType
        await create_notification(
            db=db,
            recipient_id=str(updates["assignee_id"]),
            actor_id=str(current_user.id),
            workspace_id=str(project.workspace_id),
            project_id=str(project.id),
            task_id=str(task.id),
            type=NotificationType.ASSIGNED,
            payload={
                "task_title": task.title,
                "actor_name": current_user.username
            }
        )

    if "column_id" in updates and updates["column_id"] is not None:
        new_col_uuid = UUID(str(updates["column_id"]))
        if old_column_id != new_col_uuid:
            # Check if new column name is "Done"
            new_column = db.query(Column).filter(Column.id == new_col_uuid).first()
            if new_column and new_column.name.lower() == "done" and task.assignee_id:
                from app.core.notifications import create_notification
                from app.models.notification import NotificationType
                await create_notification(
                    db=db,
                    recipient_id=str(task.assignee_id),
                    actor_id=str(current_user.id),
                    workspace_id=str(project.workspace_id),
                    project_id=str(project.id),
                    task_id=str(task.id),
                    type=NotificationType.TASK_DONE,
                    payload={
                        "task_title": task.title,
                        "column_name": new_column.name,
                        "actor_name": current_user.username
                    }
                )

    db.commit()
    def _sync_task_embedding(db: Session, task):
        text = f"{task.title}\n{task.description or ''}"
        upsert_embedding(db, project_id=task.project_id, source_type="task",
                        source_id=task.id, text=text)
    db.refresh(task)
    _sync_task_embedding(db, task)
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
    task = get_task_or_404(task_id, db)
    project = get_project_or_404(task.project_id, db)
    require_workspace_member(project.workspace_id, current_user, db)

    project_id = project.id
    task.deleted_at = func.now()
    log_activity(
        db,
        workspace_id=task.project.workspace_id,
        project_id=task.project_id,
        task_id=task.id,
        actor_id=current_user.id,
        event_type=ActivityEventType.TASK_DELETED,
        event_data={"title": task.title},
    )
    delete_embeddings(db, source_type="task", source_id=task_id)
    db.commit()

    event = build_event("task.deleted", str(project_id), {"task_id": str(task_id)}, current_user.id)
    try:
        await manager.publish(str(project_id), event)
    except Exception:
        logger.exception("Failed to publish task.deleted event")


@router.post("/tasks/{task_id}/restore", response_model=TaskResponse)
async def restore_task(
    task_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id, Task.deleted_at.isnot(None)).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Archived task not found")

    project = db.query(Project).filter(Project.id == task.project_id, Project.deleted_at.is_(None)).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot restore task belonging to an archived project")

    require_workspace_member(project.workspace_id, current_user, db)

    task.deleted_at = None
    log_activity(
        db,
        workspace_id=project.workspace_id,
        project_id=project.id,
        task_id=task.id,
        actor_id=current_user.id,
        event_type=ActivityEventType.TASK_RESTORED,
        event_data={"title": task.title},
    )
    db.commit()
    db.refresh(task)

    event = build_event("task.created", str(project.id), TaskResponse.model_validate(task).model_dump(mode="json"), current_user.id)
    try:
        await manager.publish(str(project.id), event)
    except Exception:
        logger.exception("Failed to publish task.restored event")

    return task


