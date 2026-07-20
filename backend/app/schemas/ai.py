# backend/app/schemas/ai.py (extend)
from pydantic import BaseModel, Field, ValidationError
from uuid import UUID

class SubtaskSuggestion(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(default="", max_length=1000)


class DecomposeResponse(BaseModel):
    subtasks: list[SubtaskSuggestion]

class DecomposeRequest(BaseModel):
    task_id: UUID

# backend/app/schemas/ai.py (extend)
class ContributorStat(BaseModel):
    name: str
    activity_count: int


class DigestResponse(BaseModel):
    period_summary: str = Field(..., max_length=500)
    completed_tasks: list[str]
    blockers: list[str]
    top_contributors: list[ContributorStat]


class DigestRequest(BaseModel):
    project_id: UUID


class ExplainCodeRequest(BaseModel):
    task_id: UUID
    code: str
    language: str | None = None


class ExplainCodeResponse(BaseModel):
    explanation: str