from dataclasses import Field

from pydantic import BaseModel, ConfigDict,Field
from typing import Optional
from uuid import UUID
from datetime import date, datetime
from enum import Enum


class Priority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    urgent = "urgent"


class TaskCreate(BaseModel):
    column_id: UUID
    title: str
    description: Optional[str] = None
    assignee_id: Optional[UUID] = None
    due_date: Optional[date] = None
    priority: Priority = Priority.medium
    labels: list[str] = Field(default_factory=list)


class TaskUpdate(BaseModel):
    # all optional — this is the model for the task detail panel's "save" action (Day 6),
    # where any subset of fields might change
    title: Optional[str] = None
    description: Optional[str] = None
    assignee_id: Optional[UUID] = None
    due_date: Optional[date] = None
    priority: Optional[Priority] = None
    labels: Optional[list[str]] = None
    column_id: Optional[UUID] = None  # lets a PATCH move a task to a different column without dragging


class TaskResponse(BaseModel):
    id: UUID
    project_id: UUID
    column_id: UUID
    title: str
    description: Optional[str] = None
    assignee_id: Optional[UUID] = None
    due_date: Optional[date] = None
    priority: Priority
    labels: list[str]
    position: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TaskReorderItem(BaseModel):
    """One row of the drag-drop result: this task now lives in this column, at this position."""
    task_id: UUID
    column_id: UUID
    position: int


class TaskReorderRequest(BaseModel):
    project_id: UUID  # used once to check membership for the whole batch, not per-item
    tasks: list[TaskReorderItem]