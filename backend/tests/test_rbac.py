"""Tests for RBAC module."""
from fastapi import HTTPException
import pytest
from app.core.rbac import (
    Role,
    VALID_ROLES,
    require_admin,
    require_analyst_or_admin,
    require_manager_or_admin,
    require_researcher_or_admin,
)


def test_valid_roles():
    """Every named Role constant is registered in VALID_ROLES."""
    assert set(VALID_ROLES) == {
        Role.ADMINISTRATOR,
        Role.ANALYST,
        Role.RESEARCHER,
        Role.MANAGER,
        Role.VIEWER,
    }


def test_role_constants():
    """Role string values are stable."""
    assert Role.ADMINISTRATOR == "Administrator"
    assert Role.ANALYST == "Analyst"
    assert Role.RESEARCHER == "Researcher"
    assert Role.MANAGER == "Manager"
    assert Role.VIEWER == "Viewer"


def _user(role: str) -> dict:
    return {"username": "u", "role": role, "email": "u@example.com"}


@pytest.mark.parametrize(
    "role,allowed",
    [
        (Role.ADMINISTRATOR, True),
        (Role.MANAGER, True),
        (Role.ANALYST, False),
        (Role.RESEARCHER, False),
        (Role.VIEWER, False),
    ],
)
def test_require_manager_or_admin(role, allowed):
    """Only Manager and Administrator pass `require_manager_or_admin`."""
    if allowed:
        assert require_manager_or_admin(_user(role)) == _user(role)
    else:
        with pytest.raises(HTTPException) as exc:
            require_manager_or_admin(_user(role))
        assert exc.value.status_code == 403


@pytest.mark.parametrize(
    "guard,role,allowed",
    [
        (require_admin, Role.ADMINISTRATOR, True),
        (require_admin, Role.MANAGER, False),
        (require_analyst_or_admin, Role.ANALYST, True),
        (require_analyst_or_admin, Role.MANAGER, False),
        (require_researcher_or_admin, Role.RESEARCHER, True),
        (require_researcher_or_admin, Role.MANAGER, False),
    ],
)
def test_existing_guards_reject_manager_outside_their_scope(guard, role, allowed):
    """Adding Manager must not silently widen any other guard's allow-list."""
    if allowed:
        assert guard(_user(role)) == _user(role)
    else:
        with pytest.raises(HTTPException) as exc:
            guard(_user(role))
        assert exc.value.status_code == 403
