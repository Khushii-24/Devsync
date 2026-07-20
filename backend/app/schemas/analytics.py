from pydantic import BaseModel


class VelocityPoint(BaseModel):
    date: str
    created: int
    completed: int


class VelocityResponse(BaseModel):
    points: list[VelocityPoint]


class AssigneeStat(BaseModel):
    user_id: str
    name: str
    total: int
    done: int
    open: int


class AssigneeResponse(BaseModel):
    stats: list[AssigneeStat]


class CycleTimeColumn(BaseModel):
    column_id: str
    column_name: str
    avg_days: float
    sample_size: int


class CycleTimeResponse(BaseModel):
    columns: list[CycleTimeColumn]