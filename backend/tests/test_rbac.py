"""Tests for RBAC module."""
import pytest
from app.core.rbac import Role, VALID_ROLES


def test_valid_roles():
    """Test that valid roles are defined correctly."""
    assert Role.ADMINISTRATOR in VALID_ROLES
    assert Role.ANALYST in VALID_ROLES
    assert Role.RESEARCHER in VALID_ROLES
    assert len(VALID_ROLES) == 3


def test_role_constants():
    """Test role constants."""
    assert Role.ADMINISTRATOR == "Administrator"
    assert Role.ANALYST == "Analyst"
    assert Role.RESEARCHER == "Researcher"
