"""Alert resolution workflow + analytics service."""
import logging
import statistics
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from fastapi import HTTPException

from ..db.opensearch_client import opensearch_client
from ..models.alert_resolution import (
    AlertResolutionAmendment,
    AlertResolutionHistoryEntry,
    AlertResolutionRequest,
    AlertReopenRequest,
    AnalystActivityRow,
    ResolutionTimelineResponse,
    ResolutionTimelineSample,
    TpFpTrendBucket,
    TpFpTrendResponse,
    ALL_CLASSIFICATIONS,
)

logger = logging.getLogger(__name__)


ALERTS_INDEX = "alerts"
HISTORY_INDEX = "alert-resolution-history"

# Aggregation interval shortcuts: keyword -> OpenSearch calendar_interval
INTERVAL_MAP = {
    "hour": "1h",
    "day": "1d",
    "week": "1w",
}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _parse_dt(value: Any) -> Optional[datetime]:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None


class AlertResolutionService:
    """Resolution workflow + analytics over the alerts + history indices."""

    # ─────────────────────── core workflow ───────────────────────

    @staticmethod
    def _get_alert(alert_id: str) -> dict:
        doc = opensearch_client.get_document(ALERTS_INDEX, alert_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Alert not found")
        return doc

    @staticmethod
    def _write_history(entry: AlertResolutionHistoryEntry) -> None:
        opensearch_client.index_document(
            HISTORY_INDEX,
            entry.model_dump(mode="json"),
            doc_id=entry.history_id,
        )

    @staticmethod
    def resolve_alert(
        alert_id: str,
        request: AlertResolutionRequest,
        username: str,
    ) -> dict:
        """Set alert.status='resolved' and attach the resolution object.

        Raises 409 if the alert is already resolved.
        """
        alert = AlertResolutionService._get_alert(alert_id)
        if alert.get("status") == "resolved" and alert.get("resolution"):
            raise HTTPException(
                status_code=409,
                detail="Alert is already resolved. Use PUT /resolution to amend.",
            )

        now = _now()
        resolution = {
            "classification": request.classification,
            "resolution_notes": request.resolution_notes,
            "investigation_notes": request.investigation_notes,
            "remediation_notes": request.remediation_notes,
            "resolved_by": username,
            "resolved_at": now.isoformat(),
            "last_amended_by": None,
            "last_amended_at": None,
        }
        opensearch_client.update_document(
            ALERTS_INDEX,
            alert_id,
            {"status": "resolved", "resolution": resolution},
        )

        AlertResolutionService._write_history(AlertResolutionHistoryEntry(
            history_id=str(uuid.uuid4()),
            alert_id=alert_id,
            action="resolve",
            classification=request.classification,
            resolution_notes=request.resolution_notes,
            investigation_notes=request.investigation_notes,
            remediation_notes=request.remediation_notes,
            performed_by=username,
            performed_at=now,
        ))

        return AlertResolutionService._get_alert(alert_id)

    @staticmethod
    def amend_resolution(
        alert_id: str,
        amendment: AlertResolutionAmendment,
        username: str,
    ) -> dict:
        """Update fields on an already-resolved alert's resolution and append
        a history entry capturing the previous classification."""
        alert = AlertResolutionService._get_alert(alert_id)
        existing = alert.get("resolution") or {}
        if not existing or alert.get("status") != "resolved":
            raise HTTPException(
                status_code=409,
                detail="Alert has not been resolved yet; call POST /resolve first.",
            )

        substantive = (
            amendment.classification is not None
            or amendment.resolution_notes is not None
            or amendment.investigation_notes is not None
            or amendment.remediation_notes is not None
        )
        if not substantive:
            raise HTTPException(
                status_code=400,
                detail="An amendment must change at least one of classification, "
                       "resolution_notes, investigation_notes, or remediation_notes.",
            )

        now = _now()
        previous_classification = existing.get("classification")
        new_resolution = dict(existing)
        if amendment.classification is not None:
            new_resolution["classification"] = amendment.classification
        if amendment.resolution_notes is not None:
            new_resolution["resolution_notes"] = amendment.resolution_notes
        if amendment.investigation_notes is not None:
            new_resolution["investigation_notes"] = amendment.investigation_notes
        if amendment.remediation_notes is not None:
            new_resolution["remediation_notes"] = amendment.remediation_notes
        new_resolution["last_amended_by"] = username
        new_resolution["last_amended_at"] = now.isoformat()

        opensearch_client.update_document(
            ALERTS_INDEX,
            alert_id,
            {"resolution": new_resolution},
        )

        AlertResolutionService._write_history(AlertResolutionHistoryEntry(
            history_id=str(uuid.uuid4()),
            alert_id=alert_id,
            action="amend",
            classification=new_resolution.get("classification"),
            previous_classification=previous_classification,
            resolution_notes=amendment.resolution_notes,
            investigation_notes=amendment.investigation_notes,
            remediation_notes=amendment.remediation_notes,
            reason=amendment.reason,
            performed_by=username,
            performed_at=now,
        ))

        return AlertResolutionService._get_alert(alert_id)

    @staticmethod
    def reopen_alert(
        alert_id: str,
        request: AlertReopenRequest,
        username: str,
    ) -> dict:
        """Reopen a resolved alert. The resolution object is preserved (the
        history is the audit trail) but status is reset to 'open'."""
        alert = AlertResolutionService._get_alert(alert_id)
        if alert.get("status") != "resolved":
            raise HTTPException(
                status_code=409,
                detail="Only resolved alerts can be reopened.",
            )

        previous_classification = (alert.get("resolution") or {}).get("classification")
        now = _now()
        opensearch_client.update_document(
            ALERTS_INDEX,
            alert_id,
            {"status": "open"},
        )

        AlertResolutionService._write_history(AlertResolutionHistoryEntry(
            history_id=str(uuid.uuid4()),
            alert_id=alert_id,
            action="reopen",
            previous_classification=previous_classification,
            reason=request.reason,
            performed_by=username,
            performed_at=now,
        ))

        return AlertResolutionService._get_alert(alert_id)

    @staticmethod
    def get_history(alert_id: str) -> list[AlertResolutionHistoryEntry]:
        """All history entries for an alert, newest-first."""
        query = {
            "size": 1000,
            "query": {"term": {"alert_id": alert_id}},
            "sort": [{"performed_at": {"order": "desc"}}],
        }
        try:
            docs = opensearch_client.search(HISTORY_INDEX, query)
        except Exception as e:
            logger.warning(f"history query failed for {alert_id}: {e}")
            return []
        return [AlertResolutionHistoryEntry(**d) for d in docs]

    # ─────────────────────── analytics ───────────────────────

    @staticmethod
    def _range_filter(start: Optional[datetime], end: Optional[datetime], field: str) -> Optional[dict]:
        bounds: dict[str, str] = {}
        if start is not None:
            bounds["gte"] = start.isoformat()
        if end is not None:
            bounds["lte"] = end.isoformat()
        if not bounds:
            return None
        return {"range": {field: bounds}}

    @staticmethod
    def tp_fp_trends(
        start: Optional[datetime],
        end: Optional[datetime],
        interval: str = "day",
    ) -> TpFpTrendResponse:
        """Time-bucketed counts of classifications from history `resolve`
        actions (the original decision per alert)."""
        if interval not in INTERVAL_MAP:
            raise HTTPException(status_code=400, detail=f"interval must be one of {list(INTERVAL_MAP)}")

        must: list[dict] = [{"term": {"action": "resolve"}}]
        rng = AlertResolutionService._range_filter(start, end, "performed_at")
        if rng is not None:
            must.append(rng)

        body = {
            "size": 0,
            "query": {"bool": {"must": must}},
            "aggs": {
                "by_time": {
                    "date_histogram": {
                        "field": "performed_at",
                        "calendar_interval": INTERVAL_MAP[interval],
                        "min_doc_count": 0,
                    },
                    "aggs": {
                        "by_classification": {
                            "terms": {"field": "classification", "size": 10},
                        },
                    },
                },
                "totals": {"terms": {"field": "classification", "size": 10}},
            },
        }
        result = opensearch_client.search_with_aggregations(HISTORY_INDEX, body)
        buckets_out: list[TpFpTrendBucket] = []
        for tb in result.get("aggregations", {}).get("by_time", {}).get("buckets", []):
            row = TpFpTrendBucket(bucket_start=_parse_dt(tb.get("key_as_string") or tb.get("key")) or _now())
            counts = {b["key"]: b["doc_count"] for b in tb.get("by_classification", {}).get("buckets", [])}
            row.true_positive = counts.get("true_positive", 0)
            row.false_positive = counts.get("false_positive", 0)
            row.benign = counts.get("benign", 0)
            row.informational = counts.get("informational", 0)
            buckets_out.append(row)

        totals_buckets = result.get("aggregations", {}).get("totals", {}).get("buckets", [])
        totals = {b["key"]: b["doc_count"] for b in totals_buckets}
        # Ensure all four keys are present so the frontend can render zeroes.
        for key in ALL_CLASSIFICATIONS:
            totals.setdefault(key, 0)

        return TpFpTrendResponse(interval=interval, buckets=buckets_out, totals=totals)

    @staticmethod
    def analyst_activity(
        start: Optional[datetime],
        end: Optional[datetime],
    ) -> list[AnalystActivityRow]:
        """Counts of resolution actions per analyst over the time window."""
        must: list[dict] = []
        rng = AlertResolutionService._range_filter(start, end, "performed_at")
        if rng is not None:
            must.append(rng)

        body = {
            "size": 0,
            "query": {"bool": {"must": must}} if must else {"match_all": {}},
            "aggs": {
                "by_analyst": {
                    "terms": {"field": "performed_by", "size": 100},
                    "aggs": {
                        "by_action": {"terms": {"field": "action", "size": 5}},
                        "by_classification": {"terms": {"field": "classification", "size": 10}},
                    },
                },
            },
        }
        result = opensearch_client.search_with_aggregations(HISTORY_INDEX, body)
        rows: list[AnalystActivityRow] = []
        for ab in result.get("aggregations", {}).get("by_analyst", {}).get("buckets", []):
            actions = {b["key"]: b["doc_count"] for b in ab.get("by_action", {}).get("buckets", [])}
            classifications = {b["key"]: b["doc_count"] for b in ab.get("by_classification", {}).get("buckets", [])}
            rows.append(AnalystActivityRow(
                analyst=ab["key"],
                total_actions=ab["doc_count"],
                resolves=actions.get("resolve", 0),
                amendments=actions.get("amend", 0),
                reopens=actions.get("reopen", 0),
                classifications=classifications,
            ))
        return rows

    @staticmethod
    def resolution_timelines(
        start: Optional[datetime],
        end: Optional[datetime],
        sample_limit: int = 1000,
    ) -> ResolutionTimelineResponse:
        """Per-alert time-to-resolve over alerts that have a `resolution`."""
        must: list[dict] = [{"exists": {"field": "resolution.resolved_at"}}]
        rng = AlertResolutionService._range_filter(start, end, "resolution.resolved_at")
        if rng is not None:
            must.append(rng)

        query = {
            "size": min(max(sample_limit, 1), 5000),
            "query": {"bool": {"must": must}},
            "sort": [{"resolution.resolved_at": {"order": "desc"}}],
        }
        try:
            docs = opensearch_client.search(ALERTS_INDEX, query)
        except Exception as e:
            logger.warning(f"timeline query failed: {e}")
            docs = []

        samples: list[ResolutionTimelineSample] = []
        for d in docs:
            triggered_at = _parse_dt(d.get("triggered_at"))
            resolution = d.get("resolution") or {}
            resolved_at = _parse_dt(resolution.get("resolved_at"))
            classification = resolution.get("classification")
            if not triggered_at or not resolved_at or not classification:
                continue
            seconds = max(int((resolved_at - triggered_at).total_seconds()), 0)
            samples.append(ResolutionTimelineSample(
                alert_id=d["alert_id"],
                triggered_at=triggered_at,
                resolved_at=resolved_at,
                classification=classification,
                resolution_seconds=seconds,
            ))

        values = [s.resolution_seconds for s in samples]
        avg = sum(values) / len(values) if values else None
        median = statistics.median(values) if values else None
        p95 = _percentile(values, 95) if values else None
        return ResolutionTimelineResponse(
            samples=samples,
            average_seconds=avg,
            median_seconds=median,
            p95_seconds=p95,
        )


def _percentile(values: list[int], pct: float) -> float:
    """Compute percentile without numpy (linear interpolation)."""
    if not values:
        return 0.0
    s = sorted(values)
    k = (len(s) - 1) * (pct / 100.0)
    f = int(k)
    c = min(f + 1, len(s) - 1)
    if f == c:
        return float(s[f])
    return s[f] + (s[c] - s[f]) * (k - f)


def default_start_end(days: int) -> tuple[datetime, datetime]:
    end = _now()
    start = end - timedelta(days=days)
    return start, end
