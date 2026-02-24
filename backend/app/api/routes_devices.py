"""Device management routes."""
import logging
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import datetime, timedelta
from ..models.device import (
    Device, DeviceDetail, DeviceUpdate, DeviceAction,
    DeviceMetrics, RecentEvent, RecentAlert,
    DeviceLocation, DeviceNetwork
)
from ..core.rbac import require_admin
from ..core.security import get_current_user
from ..db.opensearch_client import opensearch_client

router = APIRouter(prefix="/api/devices", tags=["devices"])
logger = logging.getLogger(__name__)


def _build_device_from_doc(doc: dict) -> Device:
    """Build Device model from OpenSearch document."""
    # Extract location
    location_data = doc.get("location", {})
    location = DeviceLocation(
        zone=location_data.get("zone"),
        subnet=location_data.get("subnet"),
        building=location_data.get("building"),
        floor=location_data.get("floor"),
        coordinates=location_data.get("coordinates")
    )

    # Extract network
    network_data = doc.get("network", {})
    network = DeviceNetwork(
        ip_address=network_data.get("ip_address"),
        mac_address=network_data.get("mac_address"),
        vlan=network_data.get("vlan"),
        gateway=network_data.get("gateway")
    )

    return Device(
        asset_id=doc.get("asset_id", ""),
        name=doc.get("name", doc.get("asset_id", "")),
        asset_type=doc.get("asset_type", "unknown"),
        asset_class=doc.get("asset_class"),
        criticality=doc.get("criticality", "medium"),
        location=location,
        network=network,
        status=doc.get("status", "active"),
        last_seen=doc.get("last_seen"),
        events_1h=doc.get("events_1h", 0),
        alerts_open=doc.get("alerts_open", 0),
        risk_score=doc.get("risk_score", 0),
        tags=doc.get("tags", []),
        device_type=doc.get("device_type", "simulated"),
        last_heartbeat=doc.get("last_heartbeat"),
        lifecycle_state=doc.get("lifecycle_state", "operational")
    )


async def _get_device_metrics(asset_id: str) -> DeviceMetrics:
    """Calculate device metrics from events and alerts."""
    now = datetime.utcnow()

    # Count events in last 24 hours (check both actor_id and asset_id fields)
    events_24h_query = {
        "bool": {
            "must": [
                {
                    "bool": {
                        "should": [
                            {"term": {"actor_id.keyword": asset_id}},
                            {"term": {"asset_id.keyword": asset_id}}
                        ],
                        "minimum_should_match": 1
                    }
                },
                {"range": {"@timestamp": {"gte": (now - timedelta(hours=24)).isoformat() + "Z"}}}
            ]
        }
    }
    try:
        events_24h = opensearch_client.count("logs-*", events_24h_query)
    except Exception:
        events_24h = 0

    # Count events in last 7 days
    events_7d_query = {
        "bool": {
            "must": [
                {
                    "bool": {
                        "should": [
                            {"term": {"actor_id.keyword": asset_id}},
                            {"term": {"asset_id.keyword": asset_id}}
                        ],
                        "minimum_should_match": 1
                    }
                },
                {"range": {"@timestamp": {"gte": (now - timedelta(days=7)).isoformat() + "Z"}}}
            ]
        }
    }
    try:
        events_7d = opensearch_client.count("logs-*", events_7d_query)
    except Exception:
        events_7d = 0

    # Count alerts in last 24 hours (check both actor_id and asset_id)
    alerts_24h_query = {
        "bool": {
            "must": [
                {
                    "bool": {
                        "should": [
                            {"term": {"actor_id.keyword": asset_id}},
                            {"term": {"asset_id.keyword": asset_id}}
                        ],
                        "minimum_should_match": 1
                    }
                },
                {"range": {"triggered_at": {"gte": (now - timedelta(hours=24)).isoformat() + "Z"}}}
            ]
        }
    }
    try:
        alerts_24h = opensearch_client.count("alerts", alerts_24h_query)
    except Exception:
        alerts_24h = 0

    # Count alerts in last 7 days
    alerts_7d_query = {
        "bool": {
            "must": [
                {
                    "bool": {
                        "should": [
                            {"term": {"actor_id.keyword": asset_id}},
                            {"term": {"asset_id.keyword": asset_id}}
                        ],
                        "minimum_should_match": 1
                    }
                },
                {"range": {"triggered_at": {"gte": (now - timedelta(days=7)).isoformat() + "Z"}}}
            ]
        }
    }
    try:
        alerts_7d = opensearch_client.count("alerts", alerts_7d_query)
    except Exception:
        alerts_7d = 0

    return DeviceMetrics(
        events_24h=events_24h,
        events_7d=events_7d,
        alerts_24h=alerts_24h,
        alerts_7d=alerts_7d,
        uptime_percentage=100.0  # TODO: Calculate from actual uptime data
    )


async def _get_recent_events(asset_id: str, limit: int = 10) -> List[RecentEvent]:
    """Get recent events for a device."""
    query = {
        "query": {
            "bool": {
                "should": [
                    {"term": {"actor_id.keyword": asset_id}},
                    {"term": {"asset_id.keyword": asset_id}}
                ],
                "minimum_should_match": 1
            }
        },
        "size": limit,
        "sort": [{"@timestamp": {"order": "desc"}}]
    }

    try:
        events = opensearch_client.search("logs-*", query)
        return [
            RecentEvent(
                timestamp=event.get("@timestamp", ""),
                event_type=event.get("event_type", "unknown"),
                severity=event.get("severity"),
                message=event.get("message")
            )
            for event in events
        ]
    except Exception as e:
        logger.error(f"Failed to fetch recent events for {asset_id}: {e}")
        return []


async def _get_recent_alerts(asset_id: str, limit: int = 5) -> List[RecentAlert]:
    """Get recent alerts for a device."""
    query = {
        "query": {
            "bool": {
                "should": [
                    {"term": {"actor_id.keyword": asset_id}},
                    {"term": {"asset_id.keyword": asset_id}}
                ],
                "minimum_should_match": 1
            }
        },
        "size": limit,
        "sort": [{"triggered_at": {"order": "desc"}}]
    }

    try:
        alerts = opensearch_client.search("alerts", query)
        return [
            RecentAlert(
                alert_id=alert.get("alert_id", ""),
                triggered_at=alert.get("triggered_at", ""),
                rule_name=alert.get("rule_name", ""),
                severity=alert.get("severity", ""),
                status=alert.get("status", "")
            )
            for alert in alerts
        ]
    except Exception as e:
        logger.error(f"Failed to fetch recent alerts for {asset_id}: {e}")
        return []


async def _calculate_realtime_metrics(doc: dict) -> dict:
    """Calculate real-time metrics for a device."""
    asset_id = doc.get("asset_id")
    now = datetime.utcnow()

    # Count events in last hour (check both actor_id and asset_id)
    events_1h_query = {
        "bool": {
            "must": [
                {
                    "bool": {
                        "should": [
                            {"term": {"actor_id.keyword": asset_id}},
                            {"term": {"asset_id.keyword": asset_id}}
                        ],
                        "minimum_should_match": 1
                    }
                },
                {"range": {"@timestamp": {"gte": (now - timedelta(hours=1)).isoformat() + "Z"}}}
            ]
        }
    }
    try:
        events_1h = opensearch_client.count("logs-*", events_1h_query)
    except Exception:
        events_1h = 0

    # Count open alerts (check both actor_id and asset_id)
    alerts_query = {
        "bool": {
            "must": [
                {
                    "bool": {
                        "should": [
                            {"term": {"actor_id.keyword": asset_id}},
                            {"term": {"asset_id.keyword": asset_id}}
                        ],
                        "minimum_should_match": 1
                    }
                },
                {"term": {"status.keyword": "open"}}
            ]
        }
    }
    try:
        alerts_open = opensearch_client.count("alerts", alerts_query)
    except Exception:
        alerts_open = 0

    # Calculate risk score (simple heuristic)
    risk_score = min(100, (alerts_open * 20) + (events_1h // 10))

    return {
        "events_1h": events_1h,
        "alerts_open": alerts_open,
        "risk_score": risk_score,
        "last_seen": now.isoformat() + "Z"
    }


@router.get("", response_model=List[Device])
async def list_devices(
    zone: Optional[str] = Query(None),
    asset_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    criticality: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    has_alerts: Optional[bool] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    current_user: dict = Depends(get_current_user)
):
    """List all devices with optional filters."""
    # Build query
    must_clauses = []

    if zone:
        must_clauses.append({"term": {"location.zone": zone}})
    if asset_type:
        must_clauses.append({"term": {"asset_type": asset_type}})
    if status:
        must_clauses.append({"term": {"status": status}})
    if criticality:
        must_clauses.append({"term": {"criticality": criticality}})
    if search:
        must_clauses.append({
            "multi_match": {
                "query": search,
                "fields": ["asset_id", "name", "asset_type"]
            }
        })

    query = {
        "query": {
            "bool": {
                "must": must_clauses if must_clauses else [{"match_all": {}}]
            }
        },
        "size": limit,
        "sort": [{"asset_id": {"order": "asc"}}]
    }

    try:
        docs = opensearch_client.search("city-assets", query)
    except Exception as e:
        logger.error(f"Failed to fetch devices: {e}")
        docs = []

    devices = []
    for doc in docs:
        device = _build_device_from_doc(doc)
        # Calculate real-time metrics
        metrics = await _calculate_realtime_metrics(doc)
        device.events_1h = metrics["events_1h"]
        device.alerts_open = metrics["alerts_open"]
        device.risk_score = metrics["risk_score"]
        device.last_seen = metrics["last_seen"]

        # Apply has_alerts filter if specified
        if has_alerts is not None:
            if has_alerts and device.alerts_open == 0:
                continue
            if not has_alerts and device.alerts_open > 0:
                continue

        devices.append(device)

    return devices


@router.get("/{asset_id}", response_model=DeviceDetail)
async def get_device(
    asset_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get detailed device information."""
    doc = opensearch_client.get_document("city-assets", asset_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Device not found")

    device = _build_device_from_doc(doc)

    # Calculate real-time metrics
    realtime_metrics = await _calculate_realtime_metrics(doc)
    device.events_1h = realtime_metrics["events_1h"]
    device.alerts_open = realtime_metrics["alerts_open"]
    device.risk_score = realtime_metrics["risk_score"]
    device.last_seen = realtime_metrics["last_seen"]

    # Get detailed metrics
    metrics = await _get_device_metrics(asset_id)

    # Get recent events and alerts
    recent_events = await _get_recent_events(asset_id)
    recent_alerts = await _get_recent_alerts(asset_id)

    return DeviceDetail(
        **device.dict(),
        metrics=metrics,
        recent_events=recent_events,
        recent_alerts=recent_alerts
    )


@router.put("/{asset_id}", response_model=Device)
async def update_device(
    asset_id: str,
    updates: DeviceUpdate,
    current_user: dict = Depends(require_admin)
):
    """Update device properties (admin only)."""
    # Check if device exists
    existing = opensearch_client.get_document("city-assets", asset_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Device not found")

    # Prepare updates
    update_data = {}
    if updates.status is not None:
        if updates.status not in ["active", "inactive", "maintenance", "decommissioned"]:
            raise HTTPException(status_code=400, detail="Invalid status")
        update_data["status"] = updates.status
    if updates.tags is not None:
        update_data["tags"] = updates.tags
    if updates.criticality is not None:
        if updates.criticality not in ["critical", "high", "medium", "low"]:
            raise HTTPException(status_code=400, detail="Invalid criticality")
        update_data["criticality"] = updates.criticality
    if updates.lifecycle_state is not None:
        update_data["lifecycle_state"] = updates.lifecycle_state

    if update_data:
        opensearch_client.update_document("city-assets", asset_id, update_data)

    # Get updated device
    doc = opensearch_client.get_document("city-assets", asset_id)
    device = _build_device_from_doc(doc)

    # Calculate real-time metrics
    metrics = await _calculate_realtime_metrics(doc)
    device.events_1h = metrics["events_1h"]
    device.alerts_open = metrics["alerts_open"]
    device.risk_score = metrics["risk_score"]
    device.last_seen = metrics["last_seen"]

    return device


@router.get("/{asset_id}/events")
async def get_device_events(
    asset_id: str,
    limit: int = Query(50, ge=1, le=500),
    current_user: dict = Depends(get_current_user)
):
    """Get recent events for a device."""
    # Verify device exists
    doc = opensearch_client.get_document("city-assets", asset_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Device not found")

    query = {
        "query": {
            "bool": {
                "should": [
                    {"term": {"actor_id.keyword": asset_id}},
                    {"term": {"asset_id.keyword": asset_id}}
                ],
                "minimum_should_match": 1
            }
        },
        "size": limit,
        "sort": [{"@timestamp": {"order": "desc"}}]
    }

    try:
        events = opensearch_client.search("logs-*", query)
        return {"asset_id": asset_id, "events": events, "count": len(events)}
    except Exception as e:
        logger.error(f"Failed to fetch events: {e}")
        return {"asset_id": asset_id, "events": [], "count": 0}


@router.get("/{asset_id}/alerts")
async def get_device_alerts(
    asset_id: str,
    status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    current_user: dict = Depends(get_current_user)
):
    """Get alerts related to a device."""
    # Verify device exists
    doc = opensearch_client.get_document("city-assets", asset_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Device not found")

    must_clauses = [
        {
            "bool": {
                "should": [
                    {"term": {"actor_id.keyword": asset_id}},
                    {"term": {"asset_id.keyword": asset_id}}
                ],
                "minimum_should_match": 1
            }
        }
    ]
    if status:
        must_clauses.append({"term": {"status.keyword": status}})

    query = {
        "query": {"bool": {"must": must_clauses}},
        "size": limit,
        "sort": [{"triggered_at": {"order": "desc"}}]
    }

    try:
        alerts = opensearch_client.search("alerts", query)
        return {"asset_id": asset_id, "alerts": alerts, "count": len(alerts)}
    except Exception as e:
        logger.error(f"Failed to fetch alerts: {e}")
        return {"asset_id": asset_id, "alerts": [], "count": 0}


@router.post("/{asset_id}/action")
async def perform_device_action(
    asset_id: str,
    action: DeviceAction,
    current_user: dict = Depends(require_admin)
):
    """Perform an action on a device (admin only)."""
    # Verify device exists
    doc = opensearch_client.get_document("city-assets", asset_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Device not found")

    # Handle different actions
    if action.action == "disable":
        opensearch_client.update_document("city-assets", asset_id, {"status": "inactive"})
        return {"success": True, "message": f"Device {asset_id} disabled", "action": action.action}
    elif action.action == "enable":
        opensearch_client.update_document("city-assets", asset_id, {"status": "active"})
        return {"success": True, "message": f"Device {asset_id} enabled", "action": action.action}
    elif action.action == "restart":
        # For simulated devices, this is a no-op but we log it
        logger.info(f"Restart requested for device {asset_id} (simulated)")
        return {"success": True, "message": f"Restart signal sent to {asset_id}", "action": action.action}
    else:
        raise HTTPException(status_code=400, detail=f"Unknown action: {action.action}")
