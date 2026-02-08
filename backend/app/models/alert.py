"""Alert data models."""
from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel


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


class Alert(AlertBase):
    """Alert model."""
    enrichment: Optional[Dict[str, Any]] = None
    response: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class AlertUpdate(BaseModel):
    """Alert update model."""
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
