from app.schemas.base import AppModel
from app.schemas.user import UserPublic
from pydantic import EmailStr, Field


class LoginRequest(AppModel):
    email: EmailStr
    password: str = Field(min_length=1)


class TokenResponse(AppModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserPublic


class RefreshRequest(AppModel):
    refresh_token: str


class AccessTokenResponse(AppModel):
    access_token: str
    token_type: str = "bearer"
