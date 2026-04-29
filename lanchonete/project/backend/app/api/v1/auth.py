from typing import Annotated

from app.core.database import get_db
from app.core.deps import AdminUser, CurrentUser
from app.schemas.auth import AccessTokenResponse, RefreshRequest, TokenResponse
from app.schemas.user import UserPublic, UserRegister
from app.services.auth_service import AuthService
from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

router = APIRouter()

Db = Annotated[Session, Depends(get_db)]


@router.post(
    "/register",
    response_model=UserPublic,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar novo funcionário (admin only)",
)
def register(payload: UserRegister, db: Db, _: AdminUser):
    """Apenas admin pode criar novos usuários do sistema."""
    user = AuthService.register(db, payload)
    return user


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login — retorna access + refresh token",
)
def login(form: Annotated[OAuth2PasswordRequestForm, Depends()], db: Db):
    """
    Usa OAuth2PasswordRequestForm para compatibilidade com /docs.
    O campo `username` do form recebe o e-mail.
    """
    return AuthService.login(db, email=form.username, password=form.password)


@router.post(
    "/refresh",
    response_model=AccessTokenResponse,
    summary="Gerar novo access token via refresh token",
)
def refresh(payload: RefreshRequest, db: Db):
    return AuthService.refresh(db, payload.refresh_token)


@router.get(
    "/me",
    response_model=UserPublic,
    summary="Dados do usuário autenticado",
)
def me(current_user: CurrentUser):
    return current_user
