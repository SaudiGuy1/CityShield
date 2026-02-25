"""Action execution and audit routes."""
import logging
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import datetime

from ..models.action import (
    ActionExecutionRequest,
    ActionMetadata,
    ActionAuditEntry,
    ActionAuditFilters
)
from ..services.action_service import ActionService
from ..core.rbac import require_analyst_or_admin
from ..core.security import get_current_user

router = APIRouter(prefix="/api/actions", tags=["actions"])
logger = logging.getLogger(__name__)


@router.post("/execute/{alert_id}")
async def execute_action(
    alert_id: str,
    request: ActionExecutionRequest,
    current_user: dict = Depends(require_analyst_or_admin)
):
    """
    Execute a manual response action for an alert.

    Requires Analyst or Admin role.

    Args:
        alert_id: Alert ID to respond to
        request: Action execution request with action_name and parameters
        current_user: Current authenticated user

    Returns:
        Audit entry ID for tracking execution
    """
    username = current_user.get("username", "unknown")

    try:
        audit_id = ActionService.execute_manual_action(
            alert_id=alert_id,
            action_name=request.action_name,
            parameters=request.parameters,
            triggered_by=username
        )

        logger.info(
            f"Manual action '{request.action_name}' triggered by {username} "
            f"for alert {alert_id}, audit_id: {audit_id}"
        )

        return {
            "status": "queued",
            "audit_id": audit_id,
            "alert_id": alert_id,
            "action_name": request.action_name,
            "triggered_by": username,
            "message": "Action execution queued successfully"
        }

    except ValueError as e:
        logger.error(f"Invalid action request: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error executing action: {e}")
        raise HTTPException(status_code=500, detail="Failed to execute action")


@router.get("", response_model=List[ActionMetadata])
async def list_available_actions(
    current_user: dict = Depends(get_current_user)
):
    """
    List all available response actions with metadata.

    Returns:
        List of available actions with descriptions and parameters
    """
    try:
        actions = ActionService.get_available_actions()
        return actions
    except Exception as e:
        logger.error(f"Error listing available actions: {e}")
        raise HTTPException(status_code=500, detail="Failed to list actions")


@router.get("/audit", response_model=List[ActionAuditEntry])
async def query_audit_log(
    alert_id: Optional[str] = Query(None),
    rule_id: Optional[str] = Query(None),
    action_name: Optional[str] = Query(None),
    execution_type: Optional[str] = Query(None),
    triggered_by: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    start_time: Optional[datetime] = Query(None),
    end_time: Optional[datetime] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    current_user: dict = Depends(get_current_user)
):
    """
    Query action audit log with optional filters.

    Args:
        alert_id: Filter by alert ID
        rule_id: Filter by rule ID
        action_name: Filter by action name (e.g., 'block_ip')
        execution_type: Filter by execution type ('manual' or 'automated')
        triggered_by: Filter by username
        status: Filter by status ('pending', 'success', 'failed')
        start_time: Filter by start time (ISO 8601 format)
        end_time: Filter by end time (ISO 8601 format)
        limit: Maximum number of results (default 100, max 1000)

    Returns:
        List of audit entries matching filters
    """
    filters = ActionAuditFilters(
        alert_id=alert_id,
        rule_id=rule_id,
        action_name=action_name,
        execution_type=execution_type,
        triggered_by=triggered_by,
        status=status,
        start_time=start_time,
        end_time=end_time,
        limit=limit
    )

    try:
        entries = ActionService.query_audit_log(filters)
        return entries
    except Exception as e:
        logger.error(f"Error querying audit log: {e}")
        raise HTTPException(status_code=500, detail="Failed to query audit log")


@router.get("/audit/{audit_id}", response_model=ActionAuditEntry)
async def get_audit_entry(
    audit_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get a specific action audit entry by ID.

    Args:
        audit_id: Audit entry ID

    Returns:
        Complete audit entry with execution details
    """
    try:
        entry = ActionService.get_audit_entry(audit_id)

        if not entry:
            raise HTTPException(status_code=404, detail="Audit entry not found")

        return entry
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting audit entry {audit_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get audit entry")


@router.get("/alert/{alert_id}/history", response_model=List[ActionAuditEntry])
async def get_alert_action_history(
    alert_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get all action execution history for a specific alert.

    Args:
        alert_id: Alert ID

    Returns:
        List of all actions executed for this alert, sorted by most recent first
    """
    filters = ActionAuditFilters(
        alert_id=alert_id,
        limit=100
    )

    try:
        entries = ActionService.query_audit_log(filters)
        return entries
    except Exception as e:
        logger.error(f"Error getting action history for alert {alert_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get action history")


@router.get("/rule/{rule_id}/history", response_model=List[ActionAuditEntry])
async def get_rule_execution_history(
    rule_id: str,
    execution_type: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    current_user: dict = Depends(get_current_user)
):
    """
    Get action execution history for a specific rule.

    Useful for viewing auto-response execution patterns.

    Args:
        rule_id: Rule ID
        execution_type: Optional filter for 'manual' or 'automated' executions
        limit: Maximum number of results

    Returns:
        List of actions executed for alerts from this rule
    """
    filters = ActionAuditFilters(
        rule_id=rule_id,
        execution_type=execution_type,
        limit=limit
    )

    try:
        entries = ActionService.query_audit_log(filters)
        return entries
    except Exception as e:
        logger.error(f"Error getting execution history for rule {rule_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get execution history")
