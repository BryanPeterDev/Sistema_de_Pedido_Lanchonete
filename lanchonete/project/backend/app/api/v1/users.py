from typing import Annotated

from app.core.database import get_db
from app.core.deps import AdminUser, CurrentUser
from app.schemas.user import UserPublic, UserUpdate, UserUpdateRole
from app.services.user_service import UserService
from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

router = APIRouter()

Db = Annotated[Session, Depends(get_db)]


class PasswordReset(BaseModel):
    new_password: str = Field(min_length=8, max_length=128)


# ── Perfil próprio ────────────────────────────────────────────────────────────


@router.patch("/me", response_model=UserPublic)
def update_me(payload: UserUpdate, db: Db, current_user: CurrentUser):
    return UserService.update(db, current_user.id, payload)


# ── Admin: gestão de usuários ─────────────────────────────────────────────────


@router.get("", response_model=list[UserPublic])
def list_users(
    db: Db,
    _: AdminUser,
    role: str | None = Query(default=None),
):
    return UserService.list_all(db, role=role)


@router.get("/{user_id}", response_model=UserPublic)
def get_user(user_id: int, db: Db, _: AdminUser):
    return UserService.get_or_404(db, user_id)


@router.patch("/{user_id}", response_model=UserPublic)
def update_user(user_id: int, payload: UserUpdate, db: Db, _: AdminUser):
    return UserService.update(db, user_id, payload)


@router.patch("/{user_id}/role", response_model=UserPublic)
def update_role(user_id: int, payload: UserUpdateRole, db: Db, _: AdminUser):
    return UserService.update_role(db, user_id, payload)


@router.post("/{user_id}/toggle-active", response_model=UserPublic)
def toggle_active(user_id: int, db: Db, _: AdminUser):
    return UserService.toggle_active(db, user_id)


@router.post("/{user_id}/reset-password", status_code=status.HTTP_204_NO_CONTENT)
def reset_password(user_id: int, payload: PasswordReset, db: Db, _: AdminUser):
    UserService.reset_password(db, user_id, payload.new_password)
