from fastapi import APIRouter, Depends
from app.models.user import User
from app.core.dependencies import get_current_user
from pydantic import BaseModel
from datetime import datetime
from uuid import UUID

router = APIRouter(prefix="/users", tags=["users"])

# Response schema — controls exactly what fields come back, hashed_password is intentionally absent
class UserResponse(BaseModel):
    id: UUID
    email: str
    username: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True  # allows Pydantic to read from SQLAlchemy model attributes directly

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    # current_user is already fetched and validated by get_current_user —
    # this endpoint's entire job is just returning it
    return current_user