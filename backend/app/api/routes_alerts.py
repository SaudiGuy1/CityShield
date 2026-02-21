"""Alert management routes."""
import os
import uuid
import logging
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import datetime, timedelta
from ..models.alert import Alert, AlertUpdate
from ..core.rbac import require_analyst_or_admin
from ..core.security import get_current_user
from ..db.opensearch_client import opensearch_client
from .threat_knowledge import get_threat_analysis

router = APIRouter(prefix="/api/alerts", tags=["alerts"])
logger = logging.getLogger(__name__)

USE_MOCK = os.getenv("USE_MOCK_CITY_COMPONENTS", "false").lower() == "true"

# Mock alerts matching the mock city components in routes_overview.py
MOCK_ALERTS = [
    {
        "alert_id": "mock-alert-001",
        "triggered_at": "",
        "rule_id": "CS-T1110",
        "rule_name": "Brute Force Authentication",
        "severity": "high",
        "component": "traffic_management",
        "city_zone": "zone-a",
        "technique_id": "T1110",
        "technique_name": "Brute Force",
        "evidence": {"src_ip": "10.0.5.23", "failed_attempts": 47, "target_accounts": ["admin", "operator", "traffic_ctrl"]},
        "related_query": "component:traffic_management AND event_type:auth_failure",
        "status": "open",
        "enrichment": {"reputation": "suspicious", "geo": "Internal Network"},
        "response": None,
        "asset_id": None,
        "correlation_id": None,
        "related_events_count": 0
    },
    {
        "alert_id": "mock-alert-002",
        "triggered_at": "",
        "rule_id": "CS-T1110",
        "rule_name": "Brute Force Authentication",
        "severity": "medium",
        "component": "traffic_management",
        "city_zone": "zone-a",
        "technique_id": "T1110",
        "technique_name": "Brute Force",
        "evidence": {"src_ip": "10.0.5.44", "failed_attempts": 23, "target_accounts": ["signal_admin"]},
        "related_query": "component:traffic_management AND event_type:auth_failure",
        "status": "open",
        "enrichment": {"reputation": "unknown", "geo": "Internal Network"},
        "response": None,
        "asset_id": None,
        "correlation_id": None,
        "related_events_count": 0
    },
    {
        "alert_id": "mock-alert-003",
        "triggered_at": "",
        "rule_id": "CS-T1565",
        "rule_name": "IoT Sensor Data Manipulation",
        "severity": "critical",
        "component": "iot_sensors",
        "city_zone": "zone-b",
        "technique_id": "T1565",
        "technique_name": "Data Manipulation",
        "evidence": {"actor_id": "sensor-env-07", "event_count": 89, "anomaly_type": "value_injection", "affected_readings": ["temperature", "humidity", "air_quality"]},
        "related_query": "component:iot_sensors AND event_type:sensor_anomaly",
        "status": "open",
        "enrichment": {"reputation": "compromised_device", "details": "Sensor firmware may be tampered"},
        "response": None,
        "asset_id": None,
        "correlation_id": None,
        "related_events_count": 0
    },
    {
        "alert_id": "mock-alert-004",
        "triggered_at": "",
        "rule_id": "CS-T1565",
        "rule_name": "IoT Sensor Data Manipulation",
        "severity": "critical",
        "component": "iot_sensors",
        "city_zone": "zone-b",
        "technique_id": "T1565",
        "technique_name": "Data Manipulation",
        "evidence": {"actor_id": "sensor-env-12", "event_count": 156, "anomaly_type": "reading_spike", "affected_readings": ["pm25", "co2"]},
        "related_query": "component:iot_sensors AND event_type:sensor_anomaly",
        "status": "open",
        "enrichment": {"reputation": "compromised_device"},
        "response": None,
        "asset_id": None,
        "correlation_id": None,
        "related_events_count": 0
    },
    {
        "alert_id": "mock-alert-005",
        "triggered_at": "",
        "rule_id": "CS-T1071",
        "rule_name": "Application Layer Protocol Abuse",
        "severity": "high",
        "component": "iot_sensors",
        "city_zone": "zone-b",
        "technique_id": "T1071",
        "technique_name": "Application Layer Protocol Abuse",
        "evidence": {"src_ip": "10.0.8.15", "dst_ip": "185.234.72.11", "protocol": "MQTT", "unusual_topic": "/cmd/exec", "bytes_out": 45200},
        "related_query": "component:iot_sensors AND event_type:protocol_anomaly",
        "status": "open",
        "enrichment": {"reputation": "malicious", "geo": "External - Eastern Europe"},
        "response": None,
        "asset_id": None,
        "correlation_id": None,
        "related_events_count": 0
    },
    {
        "alert_id": "mock-alert-006",
        "triggered_at": "",
        "rule_id": "CS-T1071",
        "rule_name": "IoT C2 Communication Detected",
        "severity": "high",
        "component": "iot_sensors",
        "city_zone": "zone-b",
        "technique_id": "T1071",
        "technique_name": "Application Layer Protocol Abuse",
        "evidence": {"src_ip": "10.0.8.22", "dst_ip": "185.234.72.11", "protocol": "HTTP", "beacon_interval_seconds": 60},
        "related_query": "component:iot_sensors AND dst_ip:185.234.72.11",
        "status": "open",
        "enrichment": {"reputation": "malicious", "geo": "External - C2 Server"},
        "response": None,
        "asset_id": None,
        "correlation_id": None,
        "related_events_count": 0
    },
    {
        "alert_id": "mock-alert-007",
        "triggered_at": "",
        "rule_id": "CS-T1595",
        "rule_name": "Active Scanning - Port Scan",
        "severity": "high",
        "component": "network_infrastructure",
        "city_zone": "zone-c",
        "technique_id": "T1595",
        "technique_name": "Active Scanning",
        "evidence": {"src_ip": "10.0.3.99", "distinct_port_count": 1024, "scan_duration_seconds": 45, "target_hosts": ["10.0.1.1", "10.0.1.2", "10.0.1.3"]},
        "related_query": "component:network_infrastructure AND event_type:port_scan",
        "status": "open",
        "enrichment": {"reputation": "suspicious", "geo": "Internal Network"},
        "response": None,
        "asset_id": None,
        "correlation_id": None,
        "related_events_count": 0
    },
    {
        "alert_id": "mock-alert-008",
        "triggered_at": "",
        "rule_id": "CS-T1498",
        "rule_name": "Network Denial of Service",
        "severity": "critical",
        "component": "network_infrastructure",
        "city_zone": "zone-c",
        "technique_id": "T1498",
        "technique_name": "Network Denial of Service",
        "evidence": {"src_ips": ["203.0.113.5", "203.0.113.12", "198.51.100.7"], "target_ip": "10.0.1.1", "peak_pps": 850000, "attack_type": "SYN_flood"},
        "related_query": "component:network_infrastructure AND event_type:ddos",
        "status": "open",
        "enrichment": {"reputation": "malicious", "geo": "Multiple External Sources"},
        "response": None,
        "asset_id": None,
        "correlation_id": None,
        "related_events_count": 0
    },
    {
        "alert_id": "mock-alert-009",
        "triggered_at": "",
        "rule_id": "CS-T1046",
        "rule_name": "Network Service Scanning - IDS Alert",
        "severity": "medium",
        "component": "network_infrastructure",
        "city_zone": "zone-c",
        "technique_id": "T1046",
        "technique_name": "Network Service Scanning",
        "evidence": {"src_ip": "10.0.3.99", "services_found": ["SSH:22", "HTTP:80", "HTTPS:443", "MQTT:1883", "Modbus:502"], "scan_tool_signature": "nmap"},
        "related_query": "component:network_infrastructure AND event_type:service_scan",
        "status": "open",
        "enrichment": {"reputation": "suspicious"},
        "response": None,
        "asset_id": None,
        "correlation_id": None,
        "related_events_count": 0
    },
    {
        "alert_id": "mock-alert-010",
        "triggered_at": "",
        "rule_id": "CS-T1046",
        "rule_name": "Vulnerability Scanner Detected",
        "severity": "critical",
        "component": "security",
        "city_zone": "zone-d",
        "technique_id": "T1046",
        "technique_name": "Network Service Scanning",
        "evidence": {"src_ip": "10.0.9.15", "vulnerabilities_probed": 234, "cve_attempts": ["CVE-2023-44487", "CVE-2024-3094", "CVE-2023-38408"]},
        "related_query": "component:security AND event_type:vuln_scan",
        "status": "open",
        "enrichment": {"reputation": "malicious", "details": "Automated vulnerability scanner targeting known CVEs"},
        "response": None,
        "asset_id": None,
        "correlation_id": None,
        "related_events_count": 0
    },
    {
        "alert_id": "mock-alert-011",
        "triggered_at": "",
        "rule_id": "CS-T1046",
        "rule_name": "Vulnerability Scanner Detected",
        "severity": "high",
        "component": "security",
        "city_zone": "zone-d",
        "technique_id": "T1046",
        "technique_name": "Network Service Scanning",
        "evidence": {"src_ip": "10.0.9.15", "vulnerabilities_probed": 89, "target_services": ["SIEM API", "EDR Console", "Auth Gateway"]},
        "related_query": "component:security AND event_type:vuln_scan",
        "status": "open",
        "enrichment": {"reputation": "malicious"},
        "response": None,
        "asset_id": None,
        "correlation_id": None,
        "related_events_count": 0
    },
    {
        "alert_id": "mock-alert-012",
        "triggered_at": "",
        "rule_id": "CS-T1040",
        "rule_name": "Network Sniffing Detected",
        "severity": "high",
        "component": "security",
        "city_zone": "zone-d",
        "technique_id": "T1040",
        "technique_name": "Network Sniffing",
        "evidence": {"src_ip": "10.0.9.30", "interface": "eth0", "promiscuous_mode": True, "captured_protocols": ["HTTP", "MQTT", "Modbus"]},
        "related_query": "component:security AND event_type:sniffing",
        "status": "open",
        "enrichment": {"reputation": "suspicious", "details": "Unauthorized promiscuous mode detected"},
        "response": None,
        "asset_id": None,
        "correlation_id": None,
        "related_events_count": 0
    },
    # Industrial zone alerts
    {
        "alert_id": "mock-alert-013",
        "triggered_at": "",
        "rule_id": "CS-T1565",
        "rule_name": "SCADA Data Manipulation",
        "severity": "critical",
        "component": "industrial_systems",
        "city_zone": "zone-e",
        "technique_id": "T1565",
        "technique_name": "Data Manipulation",
        "evidence": {"actor_id": "scada-ctrl-01", "event_count": 67, "anomaly_type": "setpoint_change", "affected_systems": ["water_treatment", "pressure_valves"]},
        "related_query": "component:industrial_systems AND event_type:scada_manipulation",
        "status": "open",
        "enrichment": {"reputation": "compromised_device", "details": "Unauthorized SCADA setpoint modifications detected"},
        "response": None,
        "asset_id": None,
        "correlation_id": None,
        "related_events_count": 0
    },
    {
        "alert_id": "mock-alert-014",
        "triggered_at": "",
        "rule_id": "CS-T1499",
        "rule_name": "Industrial Control System DoS",
        "severity": "high",
        "component": "industrial_systems",
        "city_zone": "zone-e",
        "technique_id": "T1499",
        "technique_name": "Endpoint Denial of Service",
        "evidence": {"src_ip": "10.0.12.50", "target_ip": "10.0.12.1", "peak_pps": 320000, "attack_type": "modbus_flood", "affected_plcs": ["plc-mfg-01", "plc-mfg-02"]},
        "related_query": "component:industrial_systems AND event_type:ics_dos",
        "status": "open",
        "enrichment": {"reputation": "malicious", "geo": "Internal Network"},
        "response": None,
        "asset_id": None,
        "correlation_id": None,
        "related_events_count": 0
    },
    {
        "alert_id": "mock-alert-015",
        "triggered_at": "",
        "rule_id": "CS-T1071",
        "rule_name": "Suspicious Modbus Command Injection",
        "severity": "critical",
        "component": "industrial_systems",
        "city_zone": "zone-e",
        "technique_id": "T1071",
        "technique_name": "Application Layer Protocol Abuse",
        "evidence": {"src_ip": "10.0.12.99", "protocol": "Modbus/TCP", "function_code": 16, "register_writes": 48, "target_device": "grid-substation-01"},
        "related_query": "component:industrial_systems AND event_type:modbus_injection",
        "status": "open",
        "enrichment": {"reputation": "malicious", "details": "Unauthorized Modbus write commands to grid substation"},
        "response": None,
        "asset_id": None,
        "correlation_id": None,
        "related_events_count": 0
    },
]

_mock_seeded = False


def _ensure_mock_alerts():
    """Seed mock alerts into OpenSearch only if no real alerts exist."""
    global _mock_seeded
    if _mock_seeded:
        return
    _mock_seeded = True

    # Skip seeding if real alerts already exist
    try:
        real_alerts = opensearch_client.search("alerts", {
            "query": {"bool": {"must_not": {"prefix": {"alert_id": "mock-"}}}},
            "size": 1
        })
        if len(real_alerts) > 0:
            logger.debug("Skipping mock alert seeding: real alerts exist")
            return
    except Exception:
        pass  # Index may not exist yet, proceed with seeding

    now = datetime.utcnow()
    for i, alert in enumerate(MOCK_ALERTS):
        # Spread alerts over the last 15 minutes so timestamps appear recent
        alert_time = now - timedelta(seconds=len(MOCK_ALERTS) * 60 - i * 60)
        doc = dict(alert)
        doc["triggered_at"] = alert_time.isoformat() + "Z"
        try:
            opensearch_client.index_document("alerts", doc, doc_id=doc["alert_id"])
        except Exception as e:
            logger.debug(f"Mock alert seed (may already exist): {e}")


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
    if USE_MOCK:
        _ensure_mock_alerts()

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


@router.get("/stats/summary")
async def get_alert_summary(current_user: dict = Depends(get_current_user)):
    """Get alert summary statistics."""
    if USE_MOCK:
        _ensure_mock_alerts()

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


@router.get("/{alert_id}/analysis")
async def get_alert_analysis(
    alert_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get comprehensive threat analysis for an alert.

    Returns MITRE ATT&CK context, danger assessment, remediation steps,
    and evidence-specific analysis.
    """
    if USE_MOCK:
        _ensure_mock_alerts()

    doc = opensearch_client.get_document("alerts", alert_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Alert not found")

    technique_id = doc.get("technique_id", "")
    technique_name = doc.get("technique_name", "")
    evidence = doc.get("evidence", {})

    analysis = get_threat_analysis(technique_id, technique_name, evidence)
    analysis["alert_id"] = alert_id
    analysis["severity"] = doc.get("severity", "unknown")
    analysis["component"] = doc.get("component", "unknown")
    analysis["city_zone"] = doc.get("city_zone", "unknown")
    analysis["status"] = doc.get("status", "unknown")
    analysis["enrichment"] = doc.get("enrichment", {})

    return analysis


@router.get("/{alert_id}", response_model=Alert)
async def get_alert(
    alert_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get an alert by ID."""
    if USE_MOCK:
        _ensure_mock_alerts()

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


@router.get("/{alert_id}/replay-events")
async def get_alert_replay_events(
    alert_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get events for attack replay timeline.

    Fetches events in a 5-minute window around the alert trigger time
    for temporal attack visualization with structured metadata.
    """
    # Get alert to find trigger time
    alert = opensearch_client.get_document("alerts", alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    triggered_at_str = alert.get("triggered_at")
    if not triggered_at_str:
        return {
            "alert_id": alert_id,
            "events": [],
            "time_window": "unknown",
            "metadata": {}
        }

    # Parse trigger time
    triggered_at = datetime.fromisoformat(triggered_at_str.replace("Z", "+00:00"))

    # Define time window (2.5 minutes before and after alert)
    window_before = triggered_at - timedelta(minutes=2, seconds=30)
    window_after = triggered_at + timedelta(minutes=2, seconds=30)

    # Query events in time window
    query = {
        "query": {
            "bool": {
                "must": [
                    {
                        "range": {
                            "@timestamp": {
                                "gte": window_before.isoformat() + "Z",
                                "lte": window_after.isoformat() + "Z",
                                "time_zone": "UTC"
                            }
                        }
                    }
                ],
                "should": []
            }
        },
        "size": 500,
        "sort": [{"@timestamp": {"order": "asc"}}]
    }

    # Add filters based on alert context (as optional boosting, not required)
    component = alert.get("component")
    if component:
        # Try both exact match and flexible patterns
        query["query"]["bool"]["should"].extend([
            {"term": {"component": component}},
            {"match": {"component": component}}
        ])

    city_zone = alert.get("city_zone")
    if city_zone:
        # Try both exact match and flexible patterns (zone-a vs zone_1)
        query["query"]["bool"]["should"].extend([
            {"term": {"city_zone": city_zone}},
            {"match": {"city_zone": city_zone}}
        ])

    # Don't require should matches - just use them for scoring/relevance
    # This ensures we always get events in the time window even if component/zone don't match

    # Query logs-* indices
    try:
        events = opensearch_client.search("logs-*", query)
    except Exception as e:
        logger.error(f"Failed to fetch replay events: {e}")
        events = []

    # Calculate metadata
    event_types = {}
    severities = {}
    unique_sources = set()
    unique_assets = set()

    for event in events:
        # Event type breakdown
        event_type = event.get("event_type", "unknown")
        event_types[event_type] = event_types.get(event_type, 0) + 1

        # Severity breakdown
        severity = event.get("severity", "info")
        severities[severity] = severities.get(severity, 0) + 1

        # Unique sources
        src_ip = event.get("src_ip")
        if src_ip:
            unique_sources.add(src_ip)

        # Unique assets (check both asset_id and actor_id)
        asset_id = event.get("asset_id") or event.get("actor_id")
        if asset_id:
            unique_assets.add(asset_id)

    metadata = {
        "event_types": event_types,
        "severities": severities,
        "unique_sources": list(unique_sources),
        "unique_assets": list(unique_assets),
        "alert_context": {
            "rule_id": alert.get("rule_id"),
            "rule_name": alert.get("rule_name"),
            "severity": alert.get("severity"),
            "component": component,
            "city_zone": city_zone,
            "technique_id": alert.get("technique_id"),
            "technique_name": alert.get("technique_name")
        }
    }

    return {
        "alert_id": alert_id,
        "events": events,
        "time_window": {
            "start": window_before.isoformat() + "Z",
            "end": window_after.isoformat() + "Z",
            "center": triggered_at_str
        },
        "event_count": len(events),
        "metadata": metadata
    }
