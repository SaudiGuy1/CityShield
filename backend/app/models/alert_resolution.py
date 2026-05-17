"""Alert resolution workflow models."""
from typing import Optional, Literal
from datetime import datetime
from pydantic import BaseModel, Field


AlertClassification = Literal[
    "true_positive",
    "false_positive",
    "benign",
    "informational",
]

ResolutionAction = Literal["resolve", "amend", "reopen"]

ALL_CLASSIFICATIONS = (
    "true_positive",
    "false_positive",
    "benign",
    "informational",
)


class AlertResolutionRequest(BaseModel):
    """Body of POST /api/alerts/{alert_id}/resolve.

    `resolution_notes` is mandatory — analysts must always justify the
    decision in writing.
    """
    classification: AlertClassification
    resolution_notes: str = Field(..., min_length=1, max_length=8000)
    investigation_notes: Optional[str] = Field(default=None, max_length=8000)
    remediation_notes: Optional[str] = Field(default=None, max_length=8000)


class AlertResolutionAmendment(BaseModel):
    """Body of PUT /api/alerts/{alert_id}/resolution.

    Every amendment requires an explicit `reason` so the audit trail records
    why the analyst changed their mind. Any other field is optional, but at
    least one substantive field must be supplied.
    """
    classification: Optional[AlertClassification] = None
    resolution_notes: Optional[str] = Field(default=None, min_length=1, max_length=8000)
    investigation_notes: Optional[str] = Field(default=None, max_length=8000)
    remediation_notes: Optional[str] = Field(default=None, max_length=8000)
    reason: str = Field(..., min_length=1, max_length=2000)


class AlertReopenRequest(BaseModel):
    """Body of POST /api/alerts/{alert_id}/reopen."""
    reason: str = Field(..., min_length=1, max_length=2000)


class AlertResolution(BaseModel):
    """Embedded resolution document stored on the alert."""
    classification: AlertClassification
    resolution_notes: str
    investigation_notes: Optional[str] = None
    remediation_notes: Optional[str] = None
    resolved_by: str
    resolved_at: datetime
    last_amended_by: Optional[str] = None
    last_amended_at: Optional[datetime] = None


class AlertResolutionHistoryEntry(BaseModel):
    """One row of `alert-resolution-history`."""
    history_id: str
    alert_id: str
    action: ResolutionAction
    classification: Optional[AlertClassification] = None
    resolution_notes: Optional[str] = None
    investigation_notes: Optional[str] = None
    remediation_notes: Optional[str] = None
    reason: Optional[str] = None
    previous_classification: Optional[AlertClassification] = None
    performed_by: str
    performed_at: datetime


class TpFpTrendBucket(BaseModel):
    bucket_start: datetime
    true_positive: int = 0
    false_positive: int = 0
    benign: int = 0
    informational: int = 0


class TpFpTrendResponse(BaseModel):
    interval: str
    buckets: list[TpFpTrendBucket] = []
    totals: dict[str, int] = {}


class AnalystActivityRow(BaseModel):
    analyst: str
    total_actions: int = 0
    resolves: int = 0
    amendments: int = 0
    reopens: int = 0
    classifications: dict[str, int] = {}


class ResolutionTimelineSample(BaseModel):
    alert_id: str
    triggered_at: datetime
    resolved_at: datetime
    classification: AlertClassification
    resolution_seconds: int


class ResolutionTimelineResponse(BaseModel):
    samples: list[ResolutionTimelineSample] = []
    average_seconds: Optional[float] = None
    median_seconds: Optional[float] = None
    p95_seconds: Optional[float] = None
