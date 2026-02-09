"""Overview routes including city components endpoint."""
import os
import logging
import requests as http_requests
from fastapi import APIRouter, Depends
from typing import List, Dict, Any
from datetime import datetime, timedelta
from ..core.security import get_current_user
from ..core.config import settings
from ..db.opensearch_client import opensearch_client

router = APIRouter(prefix="/api/overview", tags=["overview"])
logger = logging.getLogger(__name__)

USE_MOCK = os.getenv("USE_MOCK_CITY_COMPONENTS", "false").lower() == "true"

# Deterministic mock data for development / demo
MOCK_CITY_COMPONENTS: List[Dict[str, Any]] = [
    # Traffic zone
    {"id": "traffic-ctrl-01", "name": "Traffic Control Hub", "category": "traffic", "status": "ok", "zone": "zone-a", "eventsCount": 142, "alertsCount": 0, "lastUpdated": ""},
    {"id": "traffic-cam-02", "name": "Camera Network East", "category": "traffic", "status": "ok", "zone": "zone-a", "eventsCount": 87, "alertsCount": 0, "lastUpdated": ""},
    {"id": "traffic-sig-03", "name": "Signal Controller A", "category": "traffic", "status": "warning", "zone": "zone-a", "eventsCount": 215, "alertsCount": 2, "lastUpdated": ""},
    {"id": "traffic-sig-04", "name": "Signal Controller B", "category": "traffic", "status": "ok", "zone": "zone-a", "eventsCount": 64, "alertsCount": 0, "lastUpdated": ""},
    {"id": "traffic-park-05", "name": "Parking Sensor Array", "category": "traffic", "status": "ok", "zone": "zone-a", "eventsCount": 33, "alertsCount": 0, "lastUpdated": ""},
    # IoT zone
    {"id": "iot-hub-01", "name": "IoT Gateway Alpha", "category": "iot", "status": "ok", "zone": "zone-b", "eventsCount": 310, "alertsCount": 0, "lastUpdated": ""},
    {"id": "iot-env-02", "name": "Environmental Sensors", "category": "iot", "status": "critical", "zone": "zone-b", "eventsCount": 456, "alertsCount": 5, "lastUpdated": ""},
    {"id": "iot-water-03", "name": "Water Quality Monitor", "category": "iot", "status": "ok", "zone": "zone-b", "eventsCount": 89, "alertsCount": 0, "lastUpdated": ""},
    {"id": "iot-air-04", "name": "Air Quality Station", "category": "iot", "status": "warning", "zone": "zone-b", "eventsCount": 178, "alertsCount": 1, "lastUpdated": ""},
    {"id": "iot-waste-05", "name": "Waste Management Sensor", "category": "iot", "status": "ok", "zone": "zone-b", "eventsCount": 42, "alertsCount": 0, "lastUpdated": ""},
    {"id": "iot-energy-06", "name": "Smart Grid Monitor", "category": "iot", "status": "ok", "zone": "zone-b", "eventsCount": 201, "alertsCount": 0, "lastUpdated": ""},
    # Network zone
    {"id": "net-fw-01", "name": "Core Firewall", "category": "network", "status": "ok", "zone": "zone-c", "eventsCount": 520, "alertsCount": 0, "lastUpdated": ""},
    {"id": "net-switch-02", "name": "Distribution Switch", "category": "network", "status": "ok", "zone": "zone-c", "eventsCount": 180, "alertsCount": 0, "lastUpdated": ""},
    {"id": "net-ids-03", "name": "IDS/IPS Cluster", "category": "network", "status": "warning", "zone": "zone-c", "eventsCount": 345, "alertsCount": 3, "lastUpdated": ""},
    {"id": "net-vpn-04", "name": "VPN Concentrator", "category": "network", "status": "ok", "zone": "zone-c", "eventsCount": 92, "alertsCount": 0, "lastUpdated": ""},
    {"id": "net-dns-05", "name": "DNS Resolver", "category": "network", "status": "ok", "zone": "zone-c", "eventsCount": 410, "alertsCount": 0, "lastUpdated": ""},
    # Security zone
    {"id": "sec-siem-01", "name": "SIEM Collector", "category": "security", "status": "ok", "zone": "zone-d", "eventsCount": 780, "alertsCount": 0, "lastUpdated": ""},
    {"id": "sec-edr-02", "name": "EDR Platform", "category": "security", "status": "ok", "zone": "zone-d", "eventsCount": 234, "alertsCount": 0, "lastUpdated": ""},
    {"id": "sec-scan-03", "name": "Vulnerability Scanner", "category": "security", "status": "critical", "zone": "zone-d", "eventsCount": 567, "alertsCount": 7, "lastUpdated": ""},
    {"id": "sec-auth-04", "name": "Auth Gateway", "category": "security", "status": "ok", "zone": "zone-d", "eventsCount": 128, "alertsCount": 0, "lastUpdated": ""},
    # Industrial zone (center)
    {"id": "ind-power-01", "name": "Power Plant", "category": "industrial", "status": "ok", "zone": "zone-e", "eventsCount": 620, "alertsCount": 0, "lastUpdated": ""},
    {"id": "ind-scada-02", "name": "Water Treatment SCADA", "category": "industrial", "status": "warning", "zone": "zone-e", "eventsCount": 340, "alertsCount": 2, "lastUpdated": ""},
    {"id": "ind-plc-03", "name": "Manufacturing PLC", "category": "industrial", "status": "ok", "zone": "zone-e", "eventsCount": 185, "alertsCount": 0, "lastUpdated": ""},
    {"id": "ind-wind-04", "name": "Wind Farm Controller", "category": "industrial", "status": "ok", "zone": "zone-e", "eventsCount": 290, "alertsCount": 0, "lastUpdated": ""},
    {"id": "ind-grid-05", "name": "Grid Substation", "category": "industrial", "status": "critical", "zone": "zone-e", "eventsCount": 410, "alertsCount": 4, "lastUpdated": ""},
    {"id": "ind-rail-06", "name": "City Rail System", "category": "industrial", "status": "ok", "zone": "zone-e", "eventsCount": 530, "alertsCount": 0, "lastUpdated": ""},
]

# Map simulator components to our categories
COMPONENT_CATEGORY_MAP = {
    "traffic_management": "traffic",
    "iot_sensors": "iot",
    "network_infrastructure": "network",
    "industrial_systems": "industrial",
}

CATEGORY_ZONE_MAP = {
    "traffic": "zone-a",
    "iot": "zone-b",
    "network": "zone-c",
    "security": "zone-d",
    "industrial": "zone-e",
}


def _build_live_components() -> List[Dict[str, Any]]:
    """Build city component list from live OpenSearch data."""
    now = datetime.utcnow()
    one_hour_ago = (now - timedelta(hours=1)).isoformat()

    components: List[Dict[str, Any]] = []

    try:
        # Get events per component in last hour
        events_query = {
            "size": 0,
            "query": {"range": {"@timestamp": {"gte": one_hour_ago}}},
            "aggs": {
                "by_component": {
                    "terms": {"field": "component.keyword", "size": 50},
                    "aggs": {
                        "by_event_type": {
                            "terms": {"field": "event_type.keyword", "size": 20}
                        },
                        "latest": {
                            "max": {"field": "@timestamp"}
                        }
                    }
                }
            }
        }

        try:
            events_result = opensearch_client.client.search(index="logs-*", body=events_query)
            component_buckets = events_result.get("aggregations", {}).get("by_component", {}).get("buckets", [])
        except Exception:
            component_buckets = []

        # Get alert counts per component
        alerts_query = {
            "size": 0,
            "query": {"term": {"status": "open"}},
            "aggs": {
                "by_component": {
                    "terms": {"field": "component", "size": 50}
                }
            }
        }

        alert_counts: Dict[str, int] = {}
        try:
            alerts_result = opensearch_client.client.search(index="alerts", body=alerts_query)
            for bucket in alerts_result.get("aggregations", {}).get("by_component", {}).get("buckets", []):
                alert_counts[bucket["key"]] = bucket["doc_count"]
        except Exception:
            pass

        # Build components from log buckets
        for bucket in component_buckets:
            comp_name = bucket["key"]
            category = COMPONENT_CATEGORY_MAP.get(comp_name, "network")
            zone = CATEGORY_ZONE_MAP.get(category, "zone-c")
            event_count = bucket["doc_count"]
            alert_count = alert_counts.get(comp_name, 0)
            latest_ts = bucket.get("latest", {}).get("value_as_string", now.isoformat())

            # Determine status from alerts
            if alert_count >= 5:
                status = "critical"
            elif alert_count >= 1:
                status = "warning"
            elif event_count == 0:
                status = "offline"
            else:
                status = "ok"

            # Create sub-components from event types
            event_types = bucket.get("by_event_type", {}).get("buckets", [])
            if event_types:
                for et_bucket in event_types:
                    et_name = et_bucket["key"]
                    et_count = et_bucket["doc_count"]
                    comp_id = f"{comp_name}-{et_name}".replace("_", "-")
                    display_name = et_name.replace("_", " ").title()

                    et_alert_count = 0
                    if alert_count > 0 and et_count > 0:
                        # Distribute alerts proportionally
                        et_alert_count = max(1, round(alert_count * et_count / event_count))

                    if et_alert_count >= 5:
                        et_status = "critical"
                    elif et_alert_count >= 1:
                        et_status = "warning"
                    else:
                        et_status = "ok"

                    components.append({
                        "id": comp_id,
                        "name": display_name,
                        "category": category,
                        "status": et_status,
                        "zone": zone,
                        "eventsCount": et_count,
                        "alertsCount": et_alert_count,
                        "lastUpdated": latest_ts,
                    })
            else:
                # Single component entry
                comp_id = comp_name.replace("_", "-")
                display_name = comp_name.replace("_", " ").title()
                components.append({
                    "id": comp_id,
                    "name": display_name,
                    "category": category,
                    "status": status,
                    "zone": zone,
                    "eventsCount": event_count,
                    "alertsCount": alert_count,
                    "lastUpdated": latest_ts,
                })

        # If no live data, return a minimal set
        if not components:
            return MOCK_CITY_COMPONENTS

    except Exception as e:
        logger.error(f"Error building live city components: {e}")
        return MOCK_CITY_COMPONENTS

    return components


@router.get("/city-components")
async def get_city_components(current_user: dict = Depends(get_current_user)):
    """Get smart city component data for 3D visualization.

    Returns a list of city components with their status, event counts,
    and zone assignments. Set USE_MOCK_CITY_COMPONENTS=true for deterministic
    mock data during development.
    """
    if USE_MOCK:
        now = datetime.utcnow().isoformat()
        result = []
        for comp in MOCK_CITY_COMPONENTS:
            entry = dict(comp)
            entry["lastUpdated"] = now
            result.append(entry)
        return result

    return _build_live_components()


def init_opensearch_dashboards():
    """Initialize OpenSearch Dashboards saved objects (index patterns, visualizations, dashboards)."""
    dashboards_url = os.getenv("OPENSEARCH_DASHBOARDS_URL", "http://localhost:5601")
    saved_objects_url = f"{dashboards_url}/api/saved_objects"
    headers = {"osd-xsrf": "true", "Content-Type": "application/json"}
    created = []

    # Index patterns
    index_patterns = [
        {"id": "logs-*", "title": "logs-*", "timeFieldName": "@timestamp"},
        {"id": "alerts", "title": "alerts", "timeFieldName": "triggered_at"},
        {"id": "scenarios", "title": "scenarios", "timeFieldName": "created_at"},
        {"id": "scenario_runs", "title": "scenario_runs", "timeFieldName": "started_at"},
    ]
    for ip in index_patterns:
        try:
            http_requests.post(
                f"{saved_objects_url}/index-pattern/{ip['id']}",
                json={"attributes": {"title": ip["title"], "timeFieldName": ip["timeFieldName"]}},
                headers=headers,
                timeout=5
            )
            created.append(f"index-pattern:{ip['id']}")
        except Exception as e:
            logger.debug(f"Dashboard init index-pattern {ip['id']}: {e}")

    # Visualizations
    visualizations = [
        {
            "id": "events-over-time",
            "title": "Events Over Time",
            "visState": '{"type":"line","title":"Events Over Time","aggs":[{"id":"1","enabled":true,"type":"count","schema":"metric"},{"id":"2","enabled":true,"type":"date_histogram","schema":"segment","params":{"field":"@timestamp","interval":"auto"}}]}',
            "kibanaSavedObjectMeta": {"searchSourceJSON": '{"index":"logs-*","query":{"query":"","language":"kuery"},"filter":[]}'}
        },
        {
            "id": "events-by-component",
            "title": "Events by Component",
            "visState": '{"type":"pie","title":"Events by Component","aggs":[{"id":"1","enabled":true,"type":"count","schema":"metric"},{"id":"2","enabled":true,"type":"terms","schema":"segment","params":{"field":"component","size":10}}]}',
            "kibanaSavedObjectMeta": {"searchSourceJSON": '{"index":"logs-*","query":{"query":"","language":"kuery"},"filter":[]}'}
        },
        {
            "id": "alerts-by-severity",
            "title": "Alerts by Severity",
            "visState": '{"type":"pie","title":"Alerts by Severity","aggs":[{"id":"1","enabled":true,"type":"count","schema":"metric"},{"id":"2","enabled":true,"type":"terms","schema":"segment","params":{"field":"severity","size":5}}]}',
            "kibanaSavedObjectMeta": {"searchSourceJSON": '{"index":"alerts","query":{"query":"","language":"kuery"},"filter":[]}'}
        },
        {
            "id": "alert-timeline",
            "title": "Alert Timeline",
            "visState": '{"type":"line","title":"Alert Timeline","aggs":[{"id":"1","enabled":true,"type":"count","schema":"metric"},{"id":"2","enabled":true,"type":"date_histogram","schema":"segment","params":{"field":"triggered_at","interval":"auto"}}]}',
            "kibanaSavedObjectMeta": {"searchSourceJSON": '{"index":"alerts","query":{"query":"","language":"kuery"},"filter":[]}'}
        },
        {
            "id": "top-rules",
            "title": "Top Detection Rules",
            "visState": '{"type":"horizontal_bar","title":"Top Detection Rules","aggs":[{"id":"1","enabled":true,"type":"count","schema":"metric"},{"id":"2","enabled":true,"type":"terms","schema":"segment","params":{"field":"rule_id","size":10}}]}',
            "kibanaSavedObjectMeta": {"searchSourceJSON": '{"index":"alerts","query":{"query":"","language":"kuery"},"filter":[]}'}
        },
    ]
    for vis in visualizations:
        try:
            http_requests.post(
                f"{saved_objects_url}/visualization/{vis['id']}",
                json={"attributes": {"title": vis["title"], "visState": vis["visState"], "kibanaSavedObjectMeta": vis["kibanaSavedObjectMeta"]}},
                headers=headers,
                timeout=5
            )
            created.append(f"visualization:{vis['id']}")
        except Exception as e:
            logger.debug(f"Dashboard init visualization {vis['id']}: {e}")

    # Dashboards
    dashboards = [
        {
            "id": "siem-overview",
            "title": "CityShield - SIEM Overview",
            "panelsJSON": '[{"panelIndex":"1","panelRefName":"panel_0","embeddableConfig":{},"gridData":{"x":0,"y":0,"w":24,"h":15}},{"panelIndex":"2","panelRefName":"panel_1","embeddableConfig":{},"gridData":{"x":24,"y":0,"w":24,"h":15}}]',
            "references": [
                {"name": "panel_0", "type": "visualization", "id": "events-over-time"},
                {"name": "panel_1", "type": "visualization", "id": "events-by-component"},
            ]
        },
        {
            "id": "alerts-dashboard",
            "title": "CityShield - Alerts",
            "panelsJSON": '[{"panelIndex":"1","panelRefName":"panel_0","embeddableConfig":{},"gridData":{"x":0,"y":0,"w":24,"h":15}},{"panelIndex":"2","panelRefName":"panel_1","embeddableConfig":{},"gridData":{"x":24,"y":0,"w":24,"h":15}},{"panelIndex":"3","panelRefName":"panel_2","embeddableConfig":{},"gridData":{"x":0,"y":15,"w":48,"h":15}}]',
            "references": [
                {"name": "panel_0", "type": "visualization", "id": "alerts-by-severity"},
                {"name": "panel_1", "type": "visualization", "id": "alert-timeline"},
                {"name": "panel_2", "type": "visualization", "id": "top-rules"},
            ]
        },
        {
            "id": "investigation-dashboard",
            "title": "CityShield - Investigation",
            "panelsJSON": '[{"panelIndex":"1","panelRefName":"panel_0","embeddableConfig":{},"gridData":{"x":0,"y":0,"w":48,"h":15}},{"panelIndex":"2","panelRefName":"panel_1","embeddableConfig":{},"gridData":{"x":0,"y":15,"w":24,"h":15}},{"panelIndex":"3","panelRefName":"panel_2","embeddableConfig":{},"gridData":{"x":24,"y":15,"w":24,"h":15}}]',
            "references": [
                {"name": "panel_0", "type": "visualization", "id": "alert-timeline"},
                {"name": "panel_1", "type": "visualization", "id": "events-over-time"},
                {"name": "panel_2", "type": "visualization", "id": "top-rules"},
            ]
        },
    ]
    for dash in dashboards:
        try:
            http_requests.post(
                f"{saved_objects_url}/dashboard/{dash['id']}",
                json={"attributes": {"title": dash["title"], "panelsJSON": dash["panelsJSON"]}, "references": dash["references"]},
                headers=headers,
                timeout=5
            )
            created.append(f"dashboard:{dash['id']}")
        except Exception as e:
            logger.debug(f"Dashboard init dashboard {dash['id']}: {e}")

    return created


@router.post("/init-dashboards")
async def initialize_dashboards(current_user: dict = Depends(get_current_user)):
    """Initialize OpenSearch Dashboards with index patterns, visualizations, and dashboards."""
    created = init_opensearch_dashboards()
    return {"message": "Dashboard initialization complete", "created": created}
