"""Rule data models."""
from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel
from app.models.action import AutoResponseConfig


class RuleMatchLogic(BaseModel):
    """Rule match logic model."""
    type: str  # net_scan, iot_anomaly, etc.
    parameters: Dict[str, Any]


class RuleBase(BaseModel):
    """Base rule model."""
    rule_id: str
    name: str
    description: str
    enabled: bool = True
    severity: str  # low, medium, high, critical
    match_logic: RuleMatchLogic
    technique_id: str  # MITRE ATT&CK technique ID
    technique_name: str
    response_actions: List[str] = []
    auto_response_config: Optional[AutoResponseConfig] = None
    log_sources: Optional[List[str]] = None
    false_positive_notes: Optional[str] = None


class RuleCreate(RuleBase):
    """Rule creation model."""
    pass


class RuleUpdate(BaseModel):
    """Rule update model."""
    name: Optional[str] = None
    description: Optional[str] = None
    enabled: Optional[bool] = None
    severity: Optional[str] = None
    match_logic: Optional[RuleMatchLogic] = None
    technique_id: Optional[str] = None
    technique_name: Optional[str] = None
    response_actions: Optional[List[str]] = None
    auto_response_config: Optional[AutoResponseConfig] = None
    log_sources: Optional[List[str]] = None
    false_positive_notes: Optional[str] = None


class Rule(RuleBase):
    """Rule model."""
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
