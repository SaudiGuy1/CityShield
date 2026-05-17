"""Alert data models."""
from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel

from .alert_resolution import AlertResolution


# Canonical alert status values. "resolved" is reserved for alerts that have
# gone through the resolution workflow (a `resolution` object is attached).
ALERT_STATUSES = ("open", "triaged", "resolved")


class AlertBase(BaseModel):
    """Base alert model."""
    alert_id: str
    triggered_at: datetime
    rule_id: str
    rule_name: str
    severity: str  # low, medium, high, critical
    component: str
    city_zone: Optional[str] = None
    technique_id: str
    technique_name: str
    evidence: Dict[str, Any]
    related_query: str
    status: str = "open"  # open, triaged, resolved
    asset_id: Optional[str] = None
    correlation_id: Optional[str] = None
    related_events_count: Optional[int] = 0


class Alert(AlertBase):
    """Alert model."""
    enrichment: Optional[Dict[str, Any]] = None
    response: Optional[Dict[str, Any]] = None
    resolution: Optional[AlertResolution] = None

    class Config:
        from_attributes = True


class AlertUpdate(BaseModel):
    """Alert update model (legacy lightweight update)."""
    status: Optional[str] = None
    enrichment: Optional[Dict[str, Any]] = None
    response: Optional[Dict[str, Any]] = None


class AlertFilters(BaseModel):
    """Alert filters for querying."""
    severity: Optional[str] = None
    status: Optional[str] = None
    rule_id: Optional[str] = None
    component: Optional[str] = None
    city_zone: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
