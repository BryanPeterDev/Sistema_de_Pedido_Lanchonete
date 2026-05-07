"""
test_security.py — Testes do módulo core/security.py

Cobre: hash_password, verify_password, create_access_token,
       create_refresh_token, decode_token.
"""

import pytest
from jose import JWTError

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)


class TestPasswordHashing:
    def test_hash_is_different_from_plain(self):
        plain = "minhasenha123"
        hashed = hash_password(plain)
        assert hashed != plain

    def test_verify_correct_password(self):
        plain = "minhasenha123"
        hashed = hash_password(plain)
        assert verify_password(plain, hashed) is True

    def test_verify_wrong_password(self):
        hashed = hash_password("correta")
        assert verify_password("errada", hashed) is False

    def test_two_hashes_of_same_password_differ(self):
        """bcrypt gera salt diferente a cada chamada."""
        h1 = hash_password("abc")
        h2 = hash_password("abc")
        assert h1 != h2


class TestJWT:
    def test_access_token_has_correct_claims(self):
        token = create_access_token("42", "admin")
        payload = decode_token(token)
        assert payload["sub"] == "42"
        assert payload["role"] == "admin"
        assert payload["type"] == "access"

    def test_refresh_token_has_correct_claims(self):
        token = create_refresh_token("7")
        payload = decode_token(token)
        assert payload["sub"] == "7"
        assert payload["type"] == "refresh"

    def test_decode_invalid_token_raises_jwt_error(self):
        with pytest.raises(JWTError):
            decode_token("token.invalido.aqui")

    def test_decode_tampered_token_raises_jwt_error(self):
        token = create_access_token("1", "admin")
        tampered = token[:-5] + "XXXXX"
        with pytest.raises(JWTError):
            decode_token(tampered)
