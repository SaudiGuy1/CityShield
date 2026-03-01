"""Attack proposal routes."""
import logging
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional

from ..models.proposal import Proposal, ProposalCreate, ProposalReview
from ..services.proposal_service import ProposalService
from ..core.rbac import require_researcher_or_admin, require_admin
from ..core.security import get_current_user

router = APIRouter(prefix="/api/proposals", tags=["proposals"])
logger = logging.getLogger(__name__)


@router.post("", response_model=Proposal)
async def create_proposal(
    proposal: ProposalCreate,
    current_user: dict = Depends(require_researcher_or_admin),
):
    """Submit a new attack proposal (Researcher or Admin)."""
    return ProposalService.create_proposal(proposal, current_user["username"])


@router.get("", response_model=List[Proposal])
async def list_proposals(
    status: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """List proposals. Researchers see their own; Admins see all."""
    proposals = ProposalService.list_proposals(status=status)
    if current_user.get("role") != "Administrator":
        proposals = [
            p for p in proposals if p.submitted_by == current_user["username"]
        ]
    return proposals


@router.get("/{proposal_id}", response_model=Proposal)
async def get_proposal(
    proposal_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get a proposal by ID."""
    proposal = ProposalService.get_proposal(proposal_id)
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    return proposal


@router.put("/{proposal_id}/review", response_model=Proposal)
async def review_proposal(
    proposal_id: str,
    review: ProposalReview,
    current_user: dict = Depends(require_admin),
):
    """Approve or reject a proposal (Admin only)."""
    if review.status not in ("approved", "rejected"):
        raise HTTPException(
            status_code=400, detail="Status must be 'approved' or 'rejected'"
        )
    try:
        result = ProposalService.review_proposal(
            proposal_id, review, current_user["username"]
        )
        if not result:
            raise HTTPException(status_code=404, detail="Proposal not found")
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
