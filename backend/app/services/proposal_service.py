"""Attack proposal management service."""
from typing import List, Optional
from datetime import datetime
import uuid
import logging
from ..db.opensearch_client import opensearch_client
from ..models.proposal import Proposal, ProposalCreate, ProposalReview
from ..services.scenario_service import ScenarioService
from ..models.scenario import ScenarioCreate

logger = logging.getLogger(__name__)


class ProposalService:
    """Service for managing attack proposals."""

    INDEX = "attack-proposals"

    @staticmethod
    def create_proposal(proposal: ProposalCreate, username: str) -> Proposal:
        """Create a new proposal (Researcher submits)."""
        proposal_id = str(uuid.uuid4())
        now = datetime.utcnow()
        doc = {
            **proposal.dict(),
            "proposal_id": proposal_id,
            "submitted_by": username,
            "submitted_at": now.isoformat(),
            "status": "pending",
        }
        opensearch_client.index_document(
            ProposalService.INDEX, doc, doc_id=proposal_id
        )
        return Proposal(**doc)

    @staticmethod
    def list_proposals(status: Optional[str] = None) -> List[Proposal]:
        """List proposals, optionally filtered by status."""
        if status:
            query = {
                "query": {"term": {"status": status}},
                "size": 1000,
                "sort": [{"submitted_at": {"order": "desc"}}],
            }
        else:
            query = {
                "query": {"match_all": {}},
                "size": 1000,
                "sort": [{"submitted_at": {"order": "desc"}}],
            }
        docs = opensearch_client.search(ProposalService.INDEX, query)
        return [Proposal(**doc) for doc in docs]

    @staticmethod
    def get_proposal(proposal_id: str) -> Optional[Proposal]:
        """Get a proposal by ID."""
        doc = opensearch_client.get_document(ProposalService.INDEX, proposal_id)
        if doc:
            return Proposal(**doc)
        return None

    @staticmethod
    def review_proposal(
        proposal_id: str, review: ProposalReview, reviewer: str
    ) -> Optional[Proposal]:
        """Admin reviews (approves/rejects) a proposal."""
        proposal = ProposalService.get_proposal(proposal_id)
        if not proposal:
            return None
        if proposal.status != "pending":
            raise ValueError("Proposal has already been reviewed")

        now = datetime.utcnow()
        updates = {
            "status": review.status,
            "reviewed_by": reviewer,
            "reviewed_at": now.isoformat(),
            "review_comment": review.review_comment or "",
        }

        # If approved, create a scenario record
        if review.status == "approved":
            scenario_id = f"proposal-{proposal_id[:8]}"
            scenario = ScenarioCreate(
                scenario_id=scenario_id,
                name=proposal.title,
                description=proposal.description,
                components=[proposal.target_component],
                duration_seconds=proposal.duration_seconds,
                attack_pattern=proposal.attack_pattern,
                parameters=proposal.parameters,
            )
            ScenarioService.create_scenario(scenario, reviewer)
            updates["scenario_id"] = scenario_id

        opensearch_client.update_document(
            ProposalService.INDEX, proposal_id, updates
        )
        return ProposalService.get_proposal(proposal_id)
