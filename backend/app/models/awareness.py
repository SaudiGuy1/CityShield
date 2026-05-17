"""Awareness training progress models."""
from typing import Optional, Dict, Any, List, Literal
from datetime import datetime
from pydantic import BaseModel, Field


AwarenessEventType = Literal[
    "module_view",
    "concept_view",
    "scenario_view",
    "video_open",
    "quiz_submit",
    "pre_assessment_submit",
]


class AwarenessProgressEvent(BaseModel):
    """A single progress event posted by the frontend."""
    event_type: AwarenessEventType
    category_id: str
    module_id: Optional[str] = None
    concept_id: Optional[str] = None
    scenario_id: Optional[str] = None
    video_key: Optional[str] = None
    quiz_score: Optional[int] = Field(default=None, ge=0)
    quiz_total: Optional[int] = Field(default=None, ge=0)
    passed: Optional[bool] = None
    pre_assessment_weak_categories: Optional[List[str]] = None
    lang: Optional[Literal["en", "ar"]] = None
    metadata: Optional[Dict[str, Any]] = None


class AwarenessProgressRecord(AwarenessProgressEvent):
    """Stored progress record with server-side fields."""
    event_id: str
    username: str
    created_at: datetime


class AwarenessCategorySummary(BaseModel):
    """Per-category summary for a user."""
    category_id: str
    modules_viewed: List[str] = []
    concepts_viewed: List[str] = []
    scenarios_viewed: List[str] = []
    videos_opened: List[str] = []
    best_quiz_score: Optional[int] = None
    best_quiz_total: Optional[int] = None
    passed: bool = False
    last_activity: Optional[datetime] = None


class AwarenessSummary(BaseModel):
    """Full per-user awareness summary."""
    username: str
    categories: List[AwarenessCategorySummary] = []
    last_pre_assessment_weak_categories: List[str] = []
    last_pre_assessment_at: Optional[datetime] = None
    total_events: int = 0
