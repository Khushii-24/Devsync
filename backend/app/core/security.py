from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.core.config import settings

# CryptContext manages the hashing algorithm. "deprecated=auto" means if you ever
# add a newer algorithm later, passlib auto-upgrades old hashes on next login.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    # bcrypt re-hashes the plain password with the SAME salt stored in hashed_password,
    # then compares the two hashes — the plain password is never stored or logged anywhere
    return pwd_context.verify(plain_password, hashed_password)


def create_token(data: dict, expires_delta: timedelta) -> str:
    to_encode = data.copy()  # copy so we don't mutate the caller's dict
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode.update({"exp": expire})  # "exp" is a reserved JWT claim — jose checks it on decode automatically
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_access_token(user_id: str) -> str:
    return create_token(
        {"sub": user_id, "type": "access"},
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )


def create_refresh_token(user_id: str) -> str:
    return create_token(
        {"sub": user_id, "type": "refresh"},
        timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )


def verify_token(token: str, token_type: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        # Reject if it's the wrong token type — stops someone using a refresh token
        # to authenticate a normal API request (they're meant for different jobs)
        if payload.get("type") != token_type or user_id is None:
            return None
        return user_id
    except JWTError:
        # Covers expired tokens, bad signatures, malformed tokens — all collapse to "invalid"
        return None