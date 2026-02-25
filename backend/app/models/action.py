"""Action and audit data models."""
from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel


class ActionExecutionRequest(BaseModel):
    """Request model for executing an action."""
    action_name: str
    parameters: Optional[Dict[str, Any]] = None


class ActionMetadata(BaseModel):
    """Metadata describing an available action."""
    action_name: str
    description: str
    parameters: List[str]
    playbook: str
    requires_target: bool = False


class ActionAuditEntry(BaseModel):
    """Audit log entry for action execution."""
    audit_id: str
    alert_id: str
    rule_id: str
    action_name: str
    execution_type: str  # manual|automated
    triggered_by: str  # username or 'system'
    status: str  # success|failed|pending
    parameters: Dict[str, Any] = {}
    playbook_path: str
    stdout: Optional[str] = None
    stderr: Optional[str] = None
    started_at: datetime
    completed_at: Optional[datetime] = None
    error: Optional[str] = None

    class Config:
        from_attributes = True


class AutoResponseConditions(BaseModel):
    """Conditions that must be met for auto-response to trigger."""
    min_severity: str = "high"  # low|medium|high|critical
    require_enrichment: bool = False
    max_executions_per_hour: int = 10


class AutoResponseConfig(BaseModel):
    """Auto-response configuration for a detection rule."""
    enabled: bool = False
    conditions: AutoResponseConditions = AutoResponseConditions()


class ActionAuditFilters(BaseModel):
    """Filters for querying action audit log."""
    alert_id: Optional[str] = None
    rule_id: Optional[str] = None
    action_name: Optional[str] = None
    execution_type: Optional[str] = None
    triggered_by: Optional[str] = None
    status: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    limit: int = 100
