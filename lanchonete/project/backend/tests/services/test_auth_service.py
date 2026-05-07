"""
test_auth_service.py — Testes unitários do AuthService.

Cobre: register, login, refresh.
"""

import pytest

from app.models.user import UserRole
from app.schemas.user import UserRegister
from app.services.auth_service import AuthService
from fastapi import HTTPException


def _register_payload(**kwargs):
    defaults = dict(
        name="Teste",
        email="teste@lanchonete.com",
        phone="11999999999",
        password="senha123",
        role=UserRole.atendente,
    )
    defaults.update(kwargs)
    return UserRegister(**defaults)


class TestAuthServiceRegister:
    def test_register_success(self, db):
        payload = _register_payload()
        user = AuthService.register(db, payload)

        assert user.id is not None
        assert user.email == "teste@lanchonete.com"
        assert user.name == "Teste"
        # senha não deve estar em texto puro
        assert user.hashed_password != "senha123"

    def test_register_duplicate_email_raises_409(self, db):
        payload = _register_payload(email="dup@lanchonete.com")
        AuthService.register(db, payload)

        with pytest.raises(HTTPException) as exc:
            AuthService.register(db, _register_payload(email="dup@lanchonete.com"))

        assert exc.value.status_code == 409

    def test_register_sets_correct_role(self, db):
        payload = _register_payload(email="cozinha@lanchonete.com", role=UserRole.cozinha)
        user = AuthService.register(db, payload)
        assert user.role == UserRole.cozinha

    def test_register_user_is_active_by_default(self, db):
        payload = _register_payload(email="active@lanchonete.com")
        user = AuthService.register(db, payload)
        assert user.is_active is True


class TestAuthServiceLogin:
    def test_login_success_returns_tokens(self, db):
        payload = _register_payload(email="login@lanchonete.com")
        AuthService.register(db, payload)

        response = AuthService.login(db, "login@lanchonete.com", "senha123")

        assert response.access_token
        assert response.refresh_token
        assert response.user.email == "login@lanchonete.com"

    def test_login_wrong_password_raises_401(self, db):
        payload = _register_payload(email="wrongpw@lanchonete.com")
        AuthService.register(db, payload)

        with pytest.raises(HTTPException) as exc:
            AuthService.login(db, "wrongpw@lanchonete.com", "errada")

        assert exc.value.status_code == 401

    def test_login_nonexistent_email_raises_401(self, db):
        with pytest.raises(HTTPException) as exc:
            AuthService.login(db, "naoexiste@lanchonete.com", "qualquer")

        assert exc.value.status_code == 401

    def test_login_inactive_user_raises_403(self, db):
        payload = _register_payload(email="inactive@lanchonete.com")
        user = AuthService.register(db, payload)
        user.is_active = False
        db.commit()

        with pytest.raises(HTTPException) as exc:
            AuthService.login(db, "inactive@lanchonete.com", "senha123")

        assert exc.value.status_code == 403


class TestAuthServiceRefresh:
    def test_refresh_with_valid_token_returns_access_token(self, db):
        payload = _register_payload(email="refresh@lanchonete.com")
        user = AuthService.register(db, payload)

        login_resp = AuthService.login(db, "refresh@lanchonete.com", "senha123")
        refresh_resp = AuthService.refresh(db, login_resp.refresh_token)

        assert refresh_resp.access_token
        # Tokens podem ser iguais se gerados no mesmo segundo (JWT usa exp em segundos)
        assert isinstance(refresh_resp.access_token, str)
        assert len(refresh_resp.access_token) > 20

    def test_refresh_with_invalid_token_raises_401(self, db):
        with pytest.raises(HTTPException) as exc:
            AuthService.refresh(db, "token.invalido.aqui")

        assert exc.value.status_code == 401

    def test_refresh_with_access_token_raises_401(self, db):
        """Não deve aceitar access token no lugar do refresh token."""
        payload = _register_payload(email="wrong_type@lanchonete.com")
        AuthService.register(db, payload)

        login_resp = AuthService.login(db, "wrong_type@lanchonete.com", "senha123")

        with pytest.raises(HTTPException) as exc:
            AuthService.refresh(db, login_resp.access_token)

        assert exc.value.status_code == 401
