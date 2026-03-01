"""Attack proposal data models."""
from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel


class ProposalBase(BaseModel):
    """Base proposal model."""
    title: str
    description: str
    technique_ids: List[str] = []
    target_component: str
    attack_pattern: str
    duration_seconds: int = 300
    parameters: Dict[str, Any] = {}


class ProposalCreate(ProposalBase):
    """Proposal creation model (submitted by Researcher)."""
    pass


class ProposalReview(BaseModel):
    """Admin review model."""
    status: str  # approved, rejected
    review_comment: Optional[str] = None


class Proposal(ProposalBase):
    """Full proposal model."""
    proposal_id: str
    submitted_by: str
    submitted_at: datetime
    status: str = "pending"
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    review_comment: Optional[str] = None
    scenario_id: Optional[str] = None

    class Config:
        from_attributes = True
