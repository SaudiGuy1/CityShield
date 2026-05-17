"""Security awareness training progress routes."""
import logging
from typing import List
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from ..models.awareness import (
    AwarenessProgressEvent,
    AwarenessProgressRecord,
    AwarenessSummary,
)
from ..models.user import User
from ..services.awareness_service import AwarenessService
from ..core.security import get_current_user
from ..core.rbac import Role, require_manager_or_admin

router = APIRouter(prefix="/api/awareness", tags=["awareness"])
logger = logging.getLogger(__name__)


class TeamMemberProgress(BaseModel):
    user: User
    summary: AwarenessSummary


@router.post("/progress", response_model=AwarenessProgressRecord)
async def record_progress(
    event: AwarenessProgressEvent,
    current_user: dict = Depends(get_current_user),
):
    """Record a progress event for the current authenticated user."""
    username = current_user.get("username")
    if not username:
        raise HTTPException(status_code=401, detail="Authenticated user has no username")
    try:
        return AwarenessService.record_event(username=username, event=event)
    except Exception as e:
        logger.error(f"Error recording awareness event for {username}: {e}")
        raise HTTPException(status_code=500, detail="Failed to record progress event")


@router.get("/progress/me", response_model=AwarenessSummary)
async def my_progress(current_user: dict = Depends(get_current_user)):
    """Return the current user's awareness training summary."""
    username = current_user.get("username")
    if not username:
        raise HTTPException(status_code=401, detail="Authenticated user has no username")
    try:
        return AwarenessService.get_user_summary(username)
    except Exception as e:
        logger.error(f"Error building awareness summary for {username}: {e}")
        raise HTTPException(status_code=500, detail="Failed to build progress summary")


@router.get("/progress/team", response_model=List[TeamMemberProgress])
async def team_progress(current_user: dict = Depends(require_manager_or_admin)):
    """Return every direct report's awareness summary.

    Admins see no users via this endpoint (use /progress/user/{username} for
    arbitrary lookups); Managers see only users whose `manager_username` equals
    the manager's username.
    """
    manager_username = current_user.get("username")
    if not manager_username:
        raise HTTPException(status_code=401, detail="Authenticated user has no username")
    try:
        return AwarenessService.get_team_summaries(manager_username)
    except Exception as e:
        logger.error(f"Error building team summary for {manager_username}: {e}")
        raise HTTPException(status_code=500, detail="Failed to build team summary")


@router.get("/progress/user/{username}", response_model=AwarenessSummary)
async def user_progress(
    username: str,
    current_user: dict = Depends(get_current_user),
):
    """Return another user's awareness training summary.

    Allowed for:
      - the user themselves
      - administrators
      - the user's direct manager (target.manager_username == requester.username
        AND requester.role == Manager)
    All other requests return 403.
    """
    requester = current_user.get("username")
    role = current_user.get("role")
    if not requester:
        raise HTTPException(status_code=401, detail="Authenticated user has no username")

    if requester == username or role == Role.ADMINISTRATOR:
        allowed = True
    elif role == Role.MANAGER and AwarenessService.is_manager_of(requester, username):
        allowed = True
    else:
        allowed = False

    if not allowed:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to view this user's awareness progress",
        )

    try:
        return AwarenessService.get_user_summary(username)
    except Exception as e:
        logger.error(f"Error building awareness summary for {username}: {e}")
        raise HTTPException(status_code=500, detail="Failed to build progress summary")
