"""Log query routes."""
from fastapi import APIRouter, Depends, Query
from typing import Optional
from datetime import datetime, timedelta
from ..core.security import get_current_user
from ..db.opensearch_client import opensearch_client

router = APIRouter(prefix="/api/logs", tags=["logs"])


@router.get("/count")
async def get_log_count(
    component: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """Get total count of logs, optionally filtered by component."""
    try:
        if component:
            query = {
                "query": {
                    "term": {"component": component}
                }
            }
            count = opensearch_client.client.count(index="logs-*", body=query)["count"]
        else:
            count = opensearch_client.client.count(index="logs-*")["count"]

        return {"count": count}
    except Exception:
        # If no logs exist yet, return 0
        return {"count": 0}


@router.get("/recent")
async def get_recent_logs(
    limit: int = Query(20, ge=1, le=1000),
    component: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """Get recent logs with optional filters."""
    try:
        must_clauses = []

        if component:
            must_clauses.append({"term": {"component": component}})
        if severity:
            must_clauses.append({"term": {"severity": severity}})

        query = {
            "query": {
                "bool": {
                    "must": must_clauses if must_clauses else [{"match_all": {}}]
                }
            },
            "size": limit,
            "sort": [{"@timestamp": {"order": "desc"}}]
        }

        result = opensearch_client.client.search(index="logs-*", body=query)

        logs = []
        for hit in result["hits"]["hits"]:
            log = hit["_source"]
            log["_id"] = hit["_id"]
            log["_index"] = hit["_index"]
            logs.append(log)

        return logs
    except Exception:
        # If no logs exist yet, return empty array
        return []


@router.get("/search")
async def search_logs(
    query_string: str = Query(..., min_length=1),
    limit: int = Query(100, ge=1, le=1000),
    current_user: dict = Depends(get_current_user)
):
    """Search logs using query string."""
    try:
        query = {
            "query": {
                "query_string": {
                    "query": query_string,
                    "default_field": "message"
                }
            },
            "size": limit,
            "sort": [{"@timestamp": {"order": "desc"}}]
        }

        result = opensearch_client.client.search(index="logs-*", body=query)

        logs = []
        for hit in result["hits"]["hits"]:
            log = hit["_source"]
            log["_id"] = hit["_id"]
            logs.append(log)

        return logs
    except Exception:
        return []


@router.get("/stats")
async def get_log_stats(current_user: dict = Depends(get_current_user)):
    """Get log statistics."""
    try:
        # Component distribution
        comp_query = {
            "size": 0,
            "aggs": {
                "by_component": {
                    "terms": {"field": "component.keyword", "size": 10}
                }
            }
        }
        comp_result = opensearch_client.client.search(index="logs-*", body=comp_query)
        by_component = {
            bucket["key"]: bucket["doc_count"]
            for bucket in comp_result["aggregations"]["by_component"]["buckets"]
        }

        # Severity distribution
        sev_query = {
            "size": 0,
            "aggs": {
                "by_severity": {
                    "terms": {"field": "severity.keyword", "size": 10}
                }
            }
        }
        sev_result = opensearch_client.client.search(index="logs-*", body=sev_query)
        by_severity = {
            bucket["key"]: bucket["doc_count"]
            for bucket in sev_result["aggregations"]["by_severity"]["buckets"]
        }

        # Total count
        total = opensearch_client.client.count(index="logs-*")["count"]

        # Events per minute (last hour)
        one_hour_ago = (datetime.utcnow() - timedelta(hours=1)).isoformat()
        recent_query = {
            "query": {
                "range": {
                    "@timestamp": {
                        "gte": one_hour_ago
                    }
                }
            }
        }
        recent_count = opensearch_client.client.count(index="logs-*", body=recent_query)["count"]
        events_per_minute = round(recent_count / 60, 2)

        return {
            "total_logs": total,
            "by_component": by_component,
            "by_severity": by_severity,
            "events_per_minute": events_per_minute,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception:
        return {
            "total_logs": 0,
            "by_component": {},
            "by_severity": {},
            "events_per_minute": 0,
            "timestamp": datetime.utcnow().isoformat()
        }
