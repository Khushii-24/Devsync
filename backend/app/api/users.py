from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from uuid import UUID
from typing import Optional

from app.db.database import get_db
from app.models.user import User
from app.models.activity_log import ActivityLog
from app.core.dependencies import get_current_user
from app.core.security import hash_password, verify_password

router = APIRouter(prefix="/users", tags=["users"])

# Response schema — controls exactly what fields come back, hashed_password is intentionally absent
class UserResponse(BaseModel):
    id: UUID
    email: str
    username: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ProfileUpdateRequest(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None

class ActivityLogResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    project_id: UUID
    task_id: Optional[UUID] = None
    actor_id: Optional[UUID] = None
    event_type: str
    event_data: dict
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserResponse)
def update_profile(
    payload: ProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # If password is changing, current_password must be correct
    if payload.new_password:
        if not payload.current_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is required to change password",
            )
        if not verify_password(payload.current_password, current_user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect current password",
            )
        current_user.hashed_password = hash_password(payload.new_password)

    if payload.username and payload.username != current_user.username:
        # Check if username is taken
        if db.query(User).filter(User.username == payload.username).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken",
            )
        current_user.username = payload.username

    if payload.email and payload.email != current_user.email:
        # Check if email is taken
        if db.query(User).filter(User.email == payload.email).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already taken",
            )
        current_user.email = payload.email

    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/me/activity", response_model=list[ActivityLogResponse])
def get_user_activity(
    page: int = 1,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    offset = (page - 1) * limit
    logs = (
        db.query(ActivityLog)
        .filter(ActivityLog.actor_id == current_user.id)
        .order_by(desc(ActivityLog.created_at))
        .offset(offset)
        .limit(limit)
        .all()
    )
    return logs