from pydantic import BaseModel, EmailStr


class RegisterRequest(BaseModel):
    email: EmailStr      # EmailStr validates proper email format automatically
    username: str
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"   # tells the client how to use this token in headers


class RefreshRequest(BaseModel):
    refresh_token: str