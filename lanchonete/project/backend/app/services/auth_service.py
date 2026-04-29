from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.user import User
from app.schemas.auth import AccessTokenResponse, TokenResponse
from app.schemas.user import UserRegister
from fastapi import HTTPException, status
from jose import JWTError
from sqlalchemy.orm import Session


class AuthService:
    # ── Registro ──────────────────────────────────────────────────────────────
    @staticmethod
    def register(db: Session, payload: UserRegister) -> User:
        if db.query(User).filter(User.email == payload.email).first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="E-mail já cadastrado",
            )
        user = User(
            name=payload.name,
            email=payload.email,
            phone=payload.phone,
            hashed_password=hash_password(payload.password),
            role=payload.role,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    # ── Login ─────────────────────────────────────────────────────────────────
    @staticmethod
    def login(db: Session, email: str, password: str) -> TokenResponse:
        user = db.query(User).filter(User.email == email).first()

        if not user or not verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciais inválidas",
                headers={"WWW-Authenticate": "Bearer"},
            )
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Conta desativada",
            )

        return TokenResponse(
            access_token=create_access_token(str(user.id), user.role),
            refresh_token=create_refresh_token(str(user.id)),
            user=user,
        )

    # ── Refresh ───────────────────────────────────────────────────────────────
    @staticmethod
    def refresh(db: Session, refresh_token: str) -> AccessTokenResponse:
        credentials_exc = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token inválido ou expirado",
        )
        try:
            payload = decode_token(refresh_token)
            if payload.get("type") != "refresh":
                raise credentials_exc
            user_id: str = payload.get("sub")
            if not user_id:
                raise credentials_exc
        except JWTError:
            raise credentials_exc

        user = db.get(User, int(user_id))
        if not user or not user.is_active:
            raise credentials_exc

        return AccessTokenResponse(
            access_token=create_access_token(str(user.id), user.role),
        )
