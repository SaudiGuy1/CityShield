"""Overview routes - Production version with real asset queries."""
import logging
import requests as http_requests
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from ..core.security import get_current_user
from ..db.opensearch_client import opensearch_client

router = APIRouter(prefix="/api/overview", tags=["overview"])
logger = logging.getLogger(__name__)

# Map asset types to categories for frontend
ASSET_TYPE_CATEGORY_MAP = {
    "traffic_controller": "traffic",
    "traffic_camera": "traffic",
    "traffic_signal": "traffic",
    "parking_sensor": "traffic",
    "iot_gateway": "iot",
    "environmental_sensor": "iot",
    "water_sensor": "iot",
    "air_quality_sensor": "iot",
    "energy_monitor": "iot",
    "firewall": "network",
    "network_switch": "network",
    "ids_ips": "security",
    "vpn_gateway": "network",
    "dns_server": "network",
    "siem": "security",
    "edr": "security",
    "vulnerability_scanner": "security",
    "authentication_server": "security",
    "training_server": "training",
    "training_target": "training",
    "scada_master": "industrial",
    "scada_hmi": "industrial",
    "plc": "industrial",
    "turbine_controller": "industrial",
    "grid_controller": "industrial",
    "rail_controller": "industrial",
}

# Map criticality to status for visual encoding
CRITICALITY_STATUS_MAP = {
    "low": "ok",
    "medium": "ok",
    "high": "warning",
    "critical": "warning",
}


async def build_live_components() -> List[Dict[str, Any]]:
    """Build city components from real city-assets index."""
    client = opensearch_client.client
    now = datetime.utcnow()
    one_hour_ago = (now - timedelta(hours=1)).isoformat() + "Z"

    try:
        # Step 1: Get all assets from city-assets index
        assets_query = {
            "query": {"match_all": {}},
            "size": 1000,
            "sort": [{"asset_id": "asc"}]  # Use asset_id directly (it's already keyword type)
        }

        assets_result = client.search(index="city-assets", body=assets_query)

        if not assets_result.get("hits", {}).get("hits"):
            logger.warning("No assets found in city-assets index")
            return []

        # Step 2: Get event counts per asset in last hour
        events_agg_query = {
            "query": {
                "bool": {
                    "must": [
                        {"range": {"@timestamp": {"gte": one_hour_ago}}},
                        {"exists": {"field": "asset_id"}}
                    ]
                }
            },
            "size": 0,
            "aggs": {
                "assets": {
                    "terms": {"field": "asset_id.keyword", "size": 1000}
                }
            }
        }

        try:
            events_result = client.search(index="logs-*", body=events_agg_query)
            event_counts = {}
            for bucket in events_result.get("aggregations", {}).get("assets", {}).get("buckets", []):
                event_counts[bucket["key"]] = bucket["doc_count"]
        except Exception as e:
            logger.warning(f"Could not fetch event counts: {e}")
            event_counts = {}

        # Step 3: Get alert counts per asset
        alerts_agg_query = {
            "query": {
                "bool": {
                    "must": [
                        {"term": {"status": "open"}},
                        {"exists": {"field": "asset_id"}}
                    ]
                }
            },
            "size": 0,
            "aggs": {
                "assets": {
                    "terms": {"field": "asset_id.keyword", "size": 1000}
                }
            }
        }

        try:
            alerts_result = client.search(index="alerts", body=alerts_agg_query)
            alert_counts = {}
            for bucket in alerts_result.get("aggregations", {}).get("assets", {}).get("buckets", []):
                alert_counts[bucket["key"]] = bucket["doc_count"]
        except Exception as e:
            logger.warning(f"Could not fetch alert counts: {e}")
            alert_counts = {}

        # Step 4: Build enriched component list
        components = []
        for hit in assets_result["hits"]["hits"]:
            asset = hit["_source"]
            asset_id = asset.get("asset_id")

            # Determine visual status: asset-level status takes priority,
            # then alert count, then criticality fallback.
            alerts_count = alert_counts.get(asset_id, 0)
            asset_status = asset.get("status", "active")
            if asset_status in ("inactive", "decommissioned"):
                status = "offline"
            elif asset_status == "maintenance":
                status = "warning"
            elif alerts_count > 5:
                status = "critical"
            elif alerts_count > 0:
                status = "warning"
            else:
                status = CRITICALITY_STATUS_MAP.get(asset.get("criticality", "medium"), "ok")

            component = {
                "id": asset_id,
                "name": asset.get("name", asset_id),
                "category": ASSET_TYPE_CATEGORY_MAP.get(asset.get("asset_type", ""), "other"),
                "status": status,
                "zone": asset.get("location", {}).get("zone", "unknown"),
                "eventsCount": event_counts.get(asset_id, 0),
                "alertsCount": alerts_count,
                "lastUpdated": asset.get("@timestamp", ""),
                "criticality": asset.get("criticality", "medium"),
                "asset_type": asset.get("asset_type", ""),
                "ip_address": asset.get("network", {}).get("ip_address"),
                "subnet": asset.get("location", {}).get("subnet"),
            }

            components.append(component)

        logger.info(f"Built {len(components)} live components from city-assets index")
        return components

    except Exception as e:
        logger.error(f"Error building live components: {e}", exc_info=True)
        return []


@router.get("/city-components")
async def get_city_components(current_user: dict = Depends(get_current_user)):
    """
    Get city components for 3D visualization.

    PRODUCTION VERSION: Queries real city-assets index.
    Fails fast if no assets found (no mock data fallback).
    """
    components = await build_live_components()

    if not components:
        raise HTTPException(
            status_code=503,
            detail="No assets found in city-assets index. Run: ./scripts/create_assets_simple.sh"
        )

    return components


@router.get("/stats")
async def get_overview_stats(current_user: dict = Depends(get_current_user)):
    """Get overview statistics."""
    client = opensearch_client.client
    now = datetime.utcnow()
    one_hour_ago = (now - timedelta(hours=1)).isoformat() + "Z"

    try:
        # Total assets
        asset_count_result = client.count(index="city-assets")
        total_assets = asset_count_result.get("count", 0)

        # Events in last hour
        events_query = {
            "query": {
                "range": {"@timestamp": {"gte": one_hour_ago}}
            }
        }
        events_result = client.count(index="logs-*", body=events_query)
        events_1h = events_result.get("count", 0)

        # Open alerts
        alerts_query = {
            "query": {
                "term": {"status": "open"}
            }
        }
        try:
            alerts_result = client.count(index="alerts", body=alerts_query)
            open_alerts = alerts_result.get("count", 0)
        except Exception:
            open_alerts = 0

        # Critical alerts
        critical_alerts_query = {
            "query": {
                "bool": {
                    "must": [
                        {"term": {"status": "open"}},
                        {"term": {"severity": "critical"}}
                    ]
                }
            }
        }
        try:
            critical_alerts_result = client.count(index="alerts", body=critical_alerts_query)
            critical_alerts = critical_alerts_result.get("count", 0)
        except Exception:
            critical_alerts = 0

        return {
            "total_assets": total_assets,
            "events_last_hour": events_1h,
            "open_alerts": open_alerts,
            "critical_alerts": critical_alerts,
            "timestamp": now.isoformat() + "Z"
        }

    except Exception as e:
        logger.error(f"Error fetching overview stats: {e}")
        return {
            "total_assets": 0,
            "events_last_hour": 0,
            "open_alerts": 0,
            "critical_alerts": 0,
            "timestamp": now.isoformat() + "Z"
        }


DASHBOARDS_URL = "http://dashboards:5601"

INDEX_PATTERNS = [
    ("logs-*", "logs-*", "@timestamp"),
    ("logs-network", "logs-network", "@timestamp"),
    ("logs-traffic", "logs-traffic", "@timestamp"),
    ("logs-iot", "logs-iot", "@timestamp"),
    ("alerts", "alerts", "triggered_at"),
    ("city-assets", "city-assets", None),
    ("scenario_runs", "scenario_runs", "started_at"),
]


def _create_index_pattern(pattern_id: str, title: str, time_field: Optional[str] = None) -> bool:
    """Create a single index pattern in OpenSearch Dashboards."""
    url = f"{DASHBOARDS_URL}/api/saved_objects/index-pattern/{pattern_id}"
    headers = {"osd-xsrf": "true", "Content-Type": "application/json"}
    attributes = {"title": title}
    if time_field:
        attributes["timeFieldName"] = time_field

    try:
        response = http_requests.post(url, json={"attributes": attributes}, headers=headers, timeout=10)
        if response.status_code in [200, 409]:
            return True
        logger.warning(f"Index pattern {title}: HTTP {response.status_code}")
        return False
    except Exception as e:
        logger.warning(f"Index pattern {title}: {e}")
        return False


def init_opensearch_dashboards() -> Optional[List[str]]:
    """
    Initialize OpenSearch Dashboards index patterns.
    Called during application startup. Returns list of created patterns or None.
    """
    # Check if Dashboards is reachable
    try:
        health = http_requests.get(f"{DASHBOARDS_URL}/api/status", timeout=5)
        if health.status_code != 200:
            logger.debug("OpenSearch Dashboards not ready yet, skipping init")
            return None
    except Exception:
        logger.debug("OpenSearch Dashboards not reachable, skipping init")
        return None

    created = []
    for pattern_id, title, time_field in INDEX_PATTERNS:
        if _create_index_pattern(pattern_id, title, time_field):
            created.append(title)

    # Set default index pattern
    try:
        http_requests.post(
            f"{DASHBOARDS_URL}/api/opensearch-dashboards/settings/defaultIndex",
            json={"value": "logs-*"},
            headers={"osd-xsrf": "true", "Content-Type": "application/json"},
            timeout=10,
        )
    except Exception:
        pass

    logger.info(f"Dashboards init: {len(created)}/{len(INDEX_PATTERNS)} index patterns")
    return created


@router.post("/init-dashboards")
async def init_dashboards_endpoint(current_user: dict = Depends(get_current_user)):
    """Initialize OpenSearch Dashboards index patterns on demand."""
    # Check if Dashboards is reachable
    try:
        health = http_requests.get(f"{DASHBOARDS_URL}/api/status", timeout=5)
        if health.status_code != 200:
            raise HTTPException(status_code=503, detail="OpenSearch Dashboards is not ready")
    except http_requests.exceptions.ConnectionError:
        raise HTTPException(status_code=503, detail="Cannot connect to OpenSearch Dashboards. Ensure the dashboards service is running.")
    except http_requests.exceptions.Timeout:
        raise HTTPException(status_code=503, detail="OpenSearch Dashboards connection timed out")

    created = []
    failed = []
    for pattern_id, title, time_field in INDEX_PATTERNS:
        if _create_index_pattern(pattern_id, title, time_field):
            created.append(title)
        else:
            failed.append(title)

    # Set default index
    try:
        http_requests.post(
            f"{DASHBOARDS_URL}/api/opensearch-dashboards/settings/defaultIndex",
            json={"value": "logs-*"},
            headers={"osd-xsrf": "true", "Content-Type": "application/json"},
            timeout=10,
        )
    except Exception:
        pass

    return {
        "status": "ok",
        "created": created,
        "failed": failed,
        "message": f"Initialized {len(created)}/{len(INDEX_PATTERNS)} index patterns"
    }
