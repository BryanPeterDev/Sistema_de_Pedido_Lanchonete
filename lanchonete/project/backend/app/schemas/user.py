from datetime import datetime

from app.models.user import UserRole
from app.schemas.base import AppModel
from pydantic import EmailStr, Field, field_validator


class UserRegister(AppModel):
    """Admin cria novo funcionário com role definida."""

    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: str | None = Field(default=None, pattern=r"^\+?[1-9]\d{7,14}$")
    password: str = Field(min_length=8, max_length=128)
    role: UserRole = UserRole.atendente

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not any(c.isdigit() for c in v):
            raise ValueError("A senha deve conter ao menos um número")
        return v


class UserUpdate(AppModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    phone: str | None = Field(default=None, pattern=r"^\+?[1-9]\d{7,14}$")


class UserUpdateRole(AppModel):
    role: UserRole


class UserPublic(AppModel):
    id: int
    name: str
    email: EmailStr
    phone: str | None
    role: UserRole
    is_active: bool
    created_at: datetime
