"""Awareness training progress service."""
import logging
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from ..db.opensearch_client import opensearch_client
from ..models.awareness import (
    AwarenessProgressEvent,
    AwarenessProgressRecord,
    AwarenessCategorySummary,
    AwarenessSummary,
)

logger = logging.getLogger(__name__)


class AwarenessService:
    """Service for recording and aggregating awareness training progress."""

    INDEX = "awareness-progress"

    @staticmethod
    def record_event(username: str, event: AwarenessProgressEvent) -> AwarenessProgressRecord:
        """Persist a progress event."""
        record = AwarenessProgressRecord(
            event_id=str(uuid.uuid4()),
            username=username,
            created_at=datetime.now(timezone.utc),
            **event.model_dump(),
        )
        document = record.model_dump(mode="json")
        opensearch_client.index_document(
            index=AwarenessService.INDEX,
            document=document,
            doc_id=record.event_id,
        )
        return record

    @staticmethod
    def _query_user_events(username: str, limit: int = 10000) -> List[dict]:
        """Fetch all events for a user, newest first."""
        query = {
            "size": limit,
            "query": {"term": {"username": username}},
            "sort": [{"created_at": {"order": "desc"}}],
        }
        try:
            return opensearch_client.search(index=AwarenessService.INDEX, query=query)
        except Exception as e:
            logger.warning(f"Could not query awareness events for {username}: {e}")
            return []

    @staticmethod
    def get_user_summary(username: str) -> AwarenessSummary:
        """Aggregate events for a user into a summary."""
        events = AwarenessService._query_user_events(username)
        per_cat: dict[str, AwarenessCategorySummary] = {}
        last_weak: List[str] = []
        last_pre_at: Optional[datetime] = None

        for ev in events:
            cat_id = ev.get("category_id")
            if not cat_id:
                continue
            cat = per_cat.setdefault(cat_id, AwarenessCategorySummary(category_id=cat_id))
            etype = ev.get("event_type")

            if etype == "module_view" and ev.get("module_id"):
                if ev["module_id"] not in cat.modules_viewed:
                    cat.modules_viewed.append(ev["module_id"])
            elif etype == "concept_view" and ev.get("concept_id"):
                if ev["concept_id"] not in cat.concepts_viewed:
                    cat.concepts_viewed.append(ev["concept_id"])
            elif etype == "scenario_view" and ev.get("scenario_id"):
                if ev["scenario_id"] not in cat.scenarios_viewed:
                    cat.scenarios_viewed.append(ev["scenario_id"])
            elif etype == "video_open" and ev.get("video_key"):
                if ev["video_key"] not in cat.videos_opened:
                    cat.videos_opened.append(ev["video_key"])
            elif etype == "quiz_submit":
                score = ev.get("quiz_score")
                total = ev.get("quiz_total")
                if score is not None and total is not None:
                    if cat.best_quiz_score is None or score > cat.best_quiz_score:
                        cat.best_quiz_score = score
                        cat.best_quiz_total = total
                if ev.get("passed"):
                    cat.passed = True
            elif etype == "pre_assessment_submit":
                ts = ev.get("created_at")
                ts_parsed = AwarenessService._parse_ts(ts)
                if last_pre_at is None or (ts_parsed and ts_parsed > last_pre_at):
                    last_pre_at = ts_parsed
                    last_weak = ev.get("pre_assessment_weak_categories") or []

            ts_parsed = AwarenessService._parse_ts(ev.get("created_at"))
            if ts_parsed and (cat.last_activity is None or ts_parsed > cat.last_activity):
                cat.last_activity = ts_parsed

        return AwarenessSummary(
            username=username,
            categories=list(per_cat.values()),
            last_pre_assessment_weak_categories=last_weak,
            last_pre_assessment_at=last_pre_at,
            total_events=len(events),
        )

    @staticmethod
    def _parse_ts(value) -> Optional[datetime]:
        if not value:
            return None
        if isinstance(value, datetime):
            return value
        try:
            return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        except ValueError:
            return None

    @staticmethod
    def list_team_members(manager_username: str) -> List[dict]:
        """Return the user docs (minus hashed_password) of every user whose
        manager_username equals the given manager."""
        query = {
            "query": {"term": {"manager_username": manager_username}},
            "size": 1000,
        }
        try:
            docs = opensearch_client.search(index="users", query=query)
        except Exception as e:
            logger.warning(f"Could not list team for {manager_username}: {e}")
            return []
        return [
            {k: v for k, v in d.items() if k != "hashed_password"}
            for d in docs
        ]

    @staticmethod
    def get_team_summaries(manager_username: str):
        """Return one AwarenessSummary per direct report of `manager_username`."""
        members = AwarenessService.list_team_members(manager_username)
        return [
            {
                "user": m,
                "summary": AwarenessService.get_user_summary(m["username"]).model_dump(mode="json"),
            }
            for m in members
        ]

    @staticmethod
    def is_manager_of(manager_username: str, target_username: str) -> bool:
        """Check whether `target_username`'s manager_username equals `manager_username`."""
        doc = opensearch_client.get_document("users", target_username)
        if not doc:
            return False
        return doc.get("manager_username") == manager_username
