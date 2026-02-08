"""Alert management routes."""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import datetime
from ..models.alert import Alert, AlertUpdate
from ..core.rbac import require_analyst_or_admin
from ..core.security import get_current_user
from ..db.opensearch_client import opensearch_client

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("", response_model=List[Alert])
async def list_alerts(
    severity: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    rule_id: Optional[str] = Query(None),
    component: Optional[str] = Query(None),
    city_zone: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    current_user: dict = Depends(get_current_user)
):
    """List alerts with optional filters."""
    # Build query
    must_clauses = []

    if severity:
        must_clauses.append({"term": {"severity": severity}})
    if status:
        must_clauses.append({"term": {"status": status}})
    if rule_id:
        must_clauses.append({"term": {"rule_id": rule_id}})
    if component:
        must_clauses.append({"term": {"component": component}})
    if city_zone:
        must_clauses.append({"term": {"city_zone": city_zone}})

    query = {
        "query": {
            "bool": {
                "must": must_clauses if must_clauses else [{"match_all": {}}]
            }
        },
        "size": limit,
        "sort": [{"triggered_at": {"order": "desc"}}]
    }

    docs = opensearch_client.search("alerts", query)
    return [Alert(**doc) for doc in docs]


@router.get("/{alert_id}", response_model=Alert)
async def get_alert(
    alert_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get an alert by ID."""
    doc = opensearch_client.get_document("alerts", alert_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Alert not found")
    return Alert(**doc)


@router.put("/{alert_id}", response_model=Alert)
async def update_alert(
    alert_id: str,
    updates: AlertUpdate,
    current_user: dict = Depends(require_analyst_or_admin)
):
    """Update an alert (Analyst or Admin)."""
    # Check if alert exists
    existing = opensearch_client.get_document("alerts", alert_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Alert not found")

    # Prepare updates
    update_data = {}
    if updates.status is not None:
        if updates.status not in ["open", "triaged", "resolved"]:
            raise HTTPException(status_code=400, detail="Invalid status")
        update_data["status"] = updates.status
    if updates.enrichment is not None:
        update_data["enrichment"] = updates.enrichment
    if updates.response is not None:
        update_data["response"] = updates.response

    if update_data:
        opensearch_client.update_document("alerts", alert_id, update_data)

    # Get updated alert
    doc = opensearch_client.get_document("alerts", alert_id)
    return Alert(**doc)


@router.get("/stats/summary")
async def get_alert_summary(current_user: dict = Depends(get_current_user)):
    """Get alert summary statistics."""
    # Count by severity
    severity_query = {
        "size": 0,
        "aggs": {
            "by_severity": {
                "terms": {"field": "severity"}
            }
        }
    }
    severity_result = opensearch_client.client.search(index="alerts", body=severity_query)
    by_severity = {
        bucket["key"]: bucket["doc_count"]
        for bucket in severity_result["aggregations"]["by_severity"]["buckets"]
    }

    # Count by status
    status_query = {
        "size": 0,
        "aggs": {
            "by_status": {
                "terms": {"field": "status"}
            }
        }
    }
    status_result = opensearch_client.client.search(index="alerts", body=status_query)
    by_status = {
        bucket["key"]: bucket["doc_count"]
        for bucket in status_result["aggregations"]["by_status"]["buckets"]
    }

    # Total count
    total = opensearch_client.count("alerts")

    return {
        "total_alerts": total,
        "by_severity": by_severity,
        "by_status": by_status,
        "timestamp": datetime.utcnow().isoformat()
    }
