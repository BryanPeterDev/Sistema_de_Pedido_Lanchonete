from typing import Annotated, Any

from app.core.database import get_db
from app.core.security import decode_token
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


# ── Extrai usuário do JWT ─────────────────────────────────────────────────────
def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[Session, Depends(get_db)],
):
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido ou expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise credentials_exc
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exc
    except JWTError:
        raise credentials_exc

    # import local para evitar circular
    from app.models.user import User

    user = db.get(User, int(user_id))
    if user is None or not user.is_active:
        raise credentials_exc
    return user


# ── Guards de role ────────────────────────────────────────────────────────────
def _require_role(*roles: str):
    def guard(current_user=Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permissão insuficiente",
            )
        return current_user

    return guard


require_admin = _require_role("admin")
require_atendente = _require_role("atendente", "admin")
require_cozinha = _require_role("cozinha", "admin")
require_motoboy = _require_role("motoboy", "admin")

# Aliases tipados para uso com Annotated
CurrentUser = Annotated[Any, Depends(get_current_user)]
AdminUser = Annotated[Any, Depends(require_admin)]
AtendenteUser = Annotated[Any, Depends(require_atendente)]
CozinhaUser = Annotated[Any, Depends(require_cozinha)]
MotoboyUser = Annotated[Any, Depends(require_motoboy)]
