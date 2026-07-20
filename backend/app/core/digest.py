from datetime import datetime, timedelta, timezone
from uuid import UUID
from collections import defaultdict

from sqlalchemy.orm import Session
from app.models.activity_log import ActivityLog, ActivityEventType
from app.models.task import Task
from app.models.column import Column
from app.models.user import User


def build_digest_input(db: Session, project_id: UUID) -> dict:
    since = datetime.now(timezone.utc) - timedelta(days=7)

    logs = (
        db.query(ActivityLog)
        .filter(ActivityLog.project_id == project_id, ActivityLog.created_at >= since)
        .order_by(ActivityLog.created_at)
        .all()
    )

    # Column positions, fetched once — used to detect backward moves.
    columns = db.query(Column).filter(Column.project_id == project_id).all()
    column_positions = {str(c.id): c.position for c in columns}
    column_names = {str(c.id): c.name for c in columns}

    # Actor names, fetched once
    actor_ids = {log.actor_id for log in logs if log.actor_id}
    actors = {}
    if actor_ids:
        users = db.query(User).filter(User.id.in_(actor_ids)).all()
        actors = {str(u.id): u.username for u in users}

    completed = []
    backward_moves = []
    contributor_counts = defaultdict(int)

    for log in logs:
        if log.actor_id:
            contributor_counts[str(log.actor_id)] += 1

        if log.event_type == ActivityEventType.TASK_MOVED:
            to_col = log.event_data.get("to_column_id")
            from_col = log.event_data.get("from_column_id")
            if to_col and column_names.get(to_col, "").lower() == "done":
                completed.append(log.event_data.get("title") or f"task {log.task_id}")
            if (
                from_col and to_col
                and from_col in column_positions and to_col in column_positions
                and column_positions[to_col] < column_positions[from_col]
            ):
                backward_moves.append(
                    f"{log.event_data.get('title') or ('task ' + str(log.task_id))}: "
                    f"{column_names.get(from_col, '?')} -> {column_names.get(to_col, '?')}"
                )

    top_contributors = sorted(
        ({"name": actors.get(uid, "Unknown"), "activity_count": c} for uid, c in contributor_counts.items()),
        key=lambda x: x["activity_count"],
        reverse=True,
    )[:5]

    return {
        "period_days": 7,
        "total_events": len(logs),
        "completed_task_moves": completed[:8],
        "backward_moves": backward_moves[:8],
        "top_contributors": top_contributors,
    }