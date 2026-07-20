# backend/app/api/analytics.py
from alembic import autogenerate
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.core.dependencies import get_current_user
from app.models.task import Task
from app.models.column import Column
from app.models.activity_log import ActivityLog, ActivityEventType
from app.models.user import User
from app.schemas.analytics import (
    VelocityPoint,
    VelocityResponse,
    AssigneeStat,
    AssigneeResponse,
    CycleTimeColumn,
    CycleTimeResponse,
)

router = APIRouter(prefix="/projects/{project_id}/analytics", tags=["analytics"])

@router.get("/velocity", response_model=VelocityResponse)
async def get_velocity(
    project_id: str,
    days: int = Query(30, ge=1, le=180),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    since = datetime.utcnow() - timedelta(days=days)

    # Created: group Task.created_at by day
    created_q = (
        select(
            func.date(Task.created_at).label("day"),
            func.count(Task.id).label("count"),
        )
        .where(Task.project_id == project_id, Task.created_at >= since)
        .group_by(func.date(Task.created_at))
    )
    created_rows = ( db.execute(created_q)).all()

   
    done_column_ids_q = select(Column.id).where(
        Column.project_id == project_id,
        func.lower(Column.name) == "done",
    )
    done_column_ids = [r[0] for r in ( db.execute(done_column_ids_q)).all()]

    completed_rows = []
    if done_column_ids:
        completed_q = (
            select(
                func.date(ActivityLog.created_at).label("day"),
                func.count(ActivityLog.id).label("count"),
            )
            .where(
                ActivityLog.project_id == project_id,
                ActivityLog.event_type == ActivityEventType.TASK_MOVED,
                ActivityLog.created_at >= since,
                ActivityLog.event_data["to_column_id"].astext.in_(
                    [str(cid) for cid in done_column_ids]
                ),
            )
            .group_by(func.date(ActivityLog.created_at))
        )
        completed_rows = ( db.execute(completed_q)).all()

    created_map = {r.day: r.count for r in created_rows}
    completed_map = {r.day: r.count for r in completed_rows}
    all_days = sorted(set(created_map) | set(completed_map))

    points = [
        VelocityPoint(
            date=day.isoformat(),
            created=created_map.get(day, 0),
            completed=completed_map.get(day, 0),
        )
        for day in all_days
    ]
    return VelocityResponse(points=points)


@router.get("/by-assignee", response_model=AssigneeResponse)
async def get_by_assignee(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    done_col_subq = (
        select(Column.id)
        .where(Column.project_id == project_id, func.lower(Column.name) == "done")
        .scalar_subquery()
    )

    q = (
        select(
            User.id,
            User.username,
            func.count(Task.id).label("total"),
            func.sum(
                case((Task.column_id == done_col_subq, 1), else_=0)
            ).label("done"),
        )
        .join(Task, Task.assignee_id == User.id)
        .where(Task.project_id == project_id)
        .group_by(User.id, User.username)
        .order_by(func.count(Task.id).desc())
    )
    rows = ( db.execute(q)).all()

    stats = [
        AssigneeStat(
            user_id=str(r.id),
            name=r.username,
            total=r.total,
            done=r.done or 0,
            open=r.total - (r.done or 0),
        )
        for r in rows
    ]
    return AssigneeResponse(stats=stats)


@router.get("/cycle-time", response_model=CycleTimeResponse)
async def get_cycle_time(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    moves_q = (
        select(ActivityLog.task_id, ActivityLog.event_data, ActivityLog.created_at)
        .where(
            ActivityLog.project_id == project_id,
            ActivityLog.event_type == ActivityEventType.TASK_MOVED,
        )
        .order_by(ActivityLog.task_id, ActivityLog.created_at)
    )
    moves = ( db.execute(moves_q)).all()

    columns_q = select(Column.id, Column.name).where(Column.project_id == project_id)
    column_names = {str(r.id): r.name for r in ( db.execute(columns_q)).all()}

    # durations[column_id] -> list of seconds spent there
    durations: dict[str, list[float]] = {}
    last_move_per_task: dict[str, tuple] = {}

    for task_id, metadata, created_at in moves:
        from_col = str(metadata.get("from_column_id")) if metadata else None
        if from_col and task_id in last_move_per_task:
            prev_time = last_move_per_task[task_id][1]
            durations.setdefault(from_col, []).append(
                (created_at - prev_time).total_seconds()
            )
        last_move_per_task[task_id] = (metadata, created_at)

    results = [
        CycleTimeColumn(
            column_id=col_id,
            column_name=column_names.get(col_id, "Unknown"),
            avg_days=round(sum(secs) / len(secs) / 86400, 2),
            sample_size=len(secs),
        )
        for col_id, secs in durations.items()
        if secs
    ]
    results.sort(key=lambda c: c.avg_days, reverse=True)
    return CycleTimeResponse(columns=results)