"""Rule management routes."""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from ..models.rule import Rule, RuleCreate, RuleUpdate
from ..core.rbac import require_researcher_or_admin
from ..core.security import get_current_user
from ..services.rule_service import RuleService

router = APIRouter(prefix="/api/rules", tags=["rules"])


@router.post("", response_model=Rule)
async def create_rule(
    rule: RuleCreate,
    current_user: dict = Depends(require_researcher_or_admin)
):
    """Create a new detection rule (Researcher or Admin)."""
    # Check if rule_id already exists
    existing = RuleService.get_rule(rule.rule_id)
    if existing:
        raise HTTPException(status_code=400, detail="Rule ID already exists")

    return RuleService.create_rule(rule)


@router.get("", response_model=List[Rule])
async def list_rules(
    enabled_only: bool = False,
    current_user: dict = Depends(get_current_user)
):
    """List all detection rules."""
    return RuleService.list_rules(enabled_only=enabled_only)


@router.get("/{rule_id}", response_model=Rule)
async def get_rule(
    rule_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a detection rule by ID."""
    rule = RuleService.get_rule(rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    return rule


@router.put("/{rule_id}", response_model=Rule)
async def update_rule(
    rule_id: str,
    updates: RuleUpdate,
    current_user: dict = Depends(require_researcher_or_admin)
):
    """Update a detection rule (Researcher or Admin)."""
    rule = RuleService.update_rule(rule_id, updates)
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    return rule


@router.delete("/{rule_id}")
async def delete_rule(
    rule_id: str,
    current_user: dict = Depends(require_researcher_or_admin)
):
    """Delete a detection rule (Researcher or Admin)."""
    success = RuleService.delete_rule(rule_id)
    if not success:
        raise HTTPException(status_code=404, detail="Rule not found")
    return {"message": "Rule deleted successfully"}
