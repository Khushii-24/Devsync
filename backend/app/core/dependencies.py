from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.user import User
from app.core.security import verify_token

# HTTPBearer tells FastAPI to look for "Authorization: Bearer <token>" in the request header.
# It also makes this endpoint show a padlock icon in /docs — automatic Swagger UI integration.
bearer_scheme = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    # credentials.credentials is the raw token string (everything after "Bearer ")
    user_id = verify_token(credentials.credentials, "access")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
            # WWW-Authenticate header tells the client what auth scheme is expected —
            # it's part of the HTTP spec for 401 responses, some clients use it automatically
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account deactivated",
            # 403 Forbidden (not 401) — the token is valid, but this user isn't allowed in
        )

    return user  # FastAPI injects this User object into whatever endpoint called Depends(get_current_user)