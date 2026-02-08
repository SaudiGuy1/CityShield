"""Tests for security module."""
import pytest
from datetime import timedelta
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    decode_token
)


def test_password_hashing():
    """Test password hashing and verification."""
    password = "TestPassword123!"
    hashed = get_password_hash(password)

    # Verify correct password
    assert verify_password(password, hashed) is True

    # Verify incorrect password
    assert verify_password("WrongPassword", hashed) is False


def test_create_and_decode_token():
    """Test JWT token creation and decoding."""
    data = {
        "sub": "testuser",
        "role": "Administrator",
        "email": "test@example.com"
    }

    # Create token
    token = create_access_token(data, expires_delta=timedelta(minutes=30))
    assert token is not None
    assert isinstance(token, str)

    # Decode token
    payload = decode_token(token)
    assert payload["sub"] == "testuser"
    assert payload["role"] == "Administrator"
    assert payload["email"] == "test@example.com"
    assert "exp" in payload


def test_decode_invalid_token():
    """Test decoding invalid token raises exception."""
    from fastapi import HTTPException

    invalid_token = "invalid.token.here"

    with pytest.raises(HTTPException) as exc_info:
        decode_token(invalid_token)

    assert exc_info.value.status_code == 401
