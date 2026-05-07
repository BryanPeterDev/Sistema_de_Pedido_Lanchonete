"""
test_auth_endpoints.py — Testes de integração HTTP para /api/v1/auth.

Cobre: POST /register, POST /login, POST /refresh, GET /me.
"""

import pytest

BASE = "/api/v1/auth"


class TestRegisterEndpoint:
    def test_register_success(self, client, admin_token):
        resp = client.post(
            f"{BASE}/register",
            json={
                "name": "Novo Func",
                "email": "novofunc@test.com",
                "phone": "11988887777",
                "password": "senha123",
                "role": "atendente",
            },
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["email"] == "novofunc@test.com"
        assert "hashed_password" not in data

    def test_register_requires_admin(self, client, atendente_token):
        resp = client.post(
            f"{BASE}/register",
            json={
                "name": "Bloqueado",
                "email": "bloqueado@test.com",
                "phone": "11988887777",
                "password": "senha123",
                "role": "atendente",
            },
            headers={"Authorization": f"Bearer {atendente_token}"},
        )
        assert resp.status_code == 403

    def test_register_duplicate_email_returns_409(self, client, admin_token):
        payload = {
            "name": "Dup",
            "email": "dup_api@test.com",
            "phone": "11988887777",
            "password": "senha123",
            "role": "atendente",
        }
        client.post(
            f"{BASE}/register", json=payload, headers={"Authorization": f"Bearer {admin_token}"}
        )
        resp = client.post(
            f"{BASE}/register", json=payload, headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 409

    def test_register_without_token_returns_401(self, client):
        resp = client.post(
            f"{BASE}/register",
            json={
                "name": "Sem Token",
                "email": "semtoken@test.com",
                "phone": "11988887777",
                "password": "senha123",
                "role": "atendente",
            },
        )
        assert resp.status_code == 401


class TestLoginEndpoint:
    def test_login_success(self, client, admin_user):
        resp = client.post(
            f"{BASE}/login",
            data={"username": admin_user.email, "password": "senha123"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data

    def test_login_wrong_password(self, client, admin_user):
        resp = client.post(
            f"{BASE}/login",
            data={"username": admin_user.email, "password": "errada"},
        )
        assert resp.status_code == 401

    def test_login_nonexistent_user(self, client):
        resp = client.post(
            f"{BASE}/login",
            data={"username": "naoexiste@test.com", "password": "qualquer"},
        )
        assert resp.status_code == 401


class TestRefreshEndpoint:
    def test_refresh_returns_new_access_token(self, client, admin_user):
        login_resp = client.post(
            f"{BASE}/login",
            data={"username": admin_user.email, "password": "senha123"},
        )
        refresh_token = login_resp.json()["refresh_token"]

        resp = client.post(f"{BASE}/refresh", json={"refresh_token": refresh_token})
        assert resp.status_code == 200
        assert "access_token" in resp.json()

    def test_refresh_invalid_token_returns_401(self, client):
        resp = client.post(f"{BASE}/refresh", json={"refresh_token": "invalido"})
        assert resp.status_code == 401


class TestMeEndpoint:
    def test_me_returns_current_user(self, client, admin_token, admin_user):
        resp = client.get(f"{BASE}/me", headers={"Authorization": f"Bearer {admin_token}"})
        assert resp.status_code == 200
        assert resp.json()["email"] == admin_user.email

    def test_me_without_token_returns_401(self, client):
        resp = client.get(f"{BASE}/me")
        assert resp.status_code == 401
