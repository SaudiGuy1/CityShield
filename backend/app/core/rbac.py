"""Role-Based Access Control."""
from typing import List
from fastapi import HTTPException, status, Depends
from .security import get_current_user

# Role definitions
class Role:
    ADMINISTRATOR = "Administrator"
    ANALYST = "Analyst"
    RESEARCHER = "Researcher"

# Valid roles
VALID_ROLES = [Role.ADMINISTRATOR, Role.ANALYST, Role.RESEARCHER]


def require_roles(allowed_roles: List[str]):
    """Decorator to require specific roles for an endpoint."""
    def role_checker(current_user: dict = Depends(get_current_user)):
        user_role = current_user.get("role")
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required roles: {', '.join(allowed_roles)}"
            )
        return current_user
    return role_checker


# Convenience functions for common role checks
def require_admin(current_user: dict = Depends(get_current_user)):
    """Require administrator role."""
    return require_roles([Role.ADMINISTRATOR])(current_user)


def require_analyst_or_admin(current_user: dict = Depends(get_current_user)):
    """Require analyst or administrator role."""
    return require_roles([Role.ANALYST, Role.ADMINISTRATOR])(current_user)


def require_researcher_or_admin(current_user: dict = Depends(get_current_user)):
    """Require researcher or administrator role."""
    return require_roles([Role.RESEARCHER, Role.ADMINISTRATOR])(current_user)
