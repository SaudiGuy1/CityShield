"""Main FastAPI application."""
import json
import logging
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

from .core.config import settings
from .core.security import get_password_hash
from .core.rbac import Role
from .db.opensearch_client import opensearch_client
from .utils.logging import setup_logging
from .api import (
    routes_auth,
    routes_health,
    routes_users,
    routes_rules,
    routes_scenarios,
    routes_alerts,
    routes_actions,
    routes_metrics,
    routes_logs,
    routes_overview,
    routes_websocket,
    routes_devices,
    routes_lab,
    routes_proposals,
    routes_mitre,
    routes_awareness,
)
from .api.routes_overview import init_opensearch_dashboards

# Setup logging
setup_logging()
logger = logging.getLogger(__name__)


def create_default_admin():
    """Create default admin user if it doesn't exist."""
    try:
        # Check if admin user exists
        query = {
            "query": {"term": {"username": settings.default_admin_user}},
            "size": 1
        }
        existing = opensearch_client.search("users", query)

        if not existing:
            logger.info("Creating default admin user...")
            admin_doc = {
                "username": settings.default_admin_user,
                "email": settings.default_admin_email,
                "role": Role.ADMINISTRATOR,
                "hashed_password": get_password_hash(settings.default_admin_pass),
                "created_at": datetime.utcnow().isoformat(),
                "is_active": True
            }
            opensearch_client.index_document("users", admin_doc, doc_id=settings.default_admin_user)
            logger.info(f"Default admin user created: {settings.default_admin_user}")
            logger.warning("IMPORTANT: Change the default admin password after first login!")
        else:
            logger.info("Default admin user already exists")

    except Exception as e:
        logger.error(f"Error creating default admin user: {e}")


def create_default_researcher():
    """Create default researcher user if it doesn't exist."""
    try:
        query = {
            "query": {"term": {"username": settings.default_researcher_user}},
            "size": 1
        }
        existing = opensearch_client.search("users", query)

        if not existing:
            logger.info("Creating default researcher user...")
            researcher_doc = {
                "username": settings.default_researcher_user,
                "email": settings.default_researcher_email,
                "role": Role.RESEARCHER,
                "hashed_password": get_password_hash(settings.default_researcher_pass),
                "created_at": datetime.utcnow().isoformat(),
                "is_active": True
            }
            opensearch_client.index_document("users", researcher_doc, doc_id=settings.default_researcher_user)
            logger.info(f"Default researcher user created: {settings.default_researcher_user}")
        else:
            logger.info("Default researcher user already exists")

    except Exception as e:
        logger.error(f"Error creating default researcher user: {e}")


def _seed_cyber_range_asset(retries: int = 5, delay: float = 3.0):
    """Ensure the Metasploitable training asset exists in city-assets.

    Retries on connection failure so a slow OpenSearch start doesn't silently skip seeding.
    """
    import time

    doc_id = "cyber-range-metasploitable"
    asset = {
        "asset_id": doc_id,
        "name": "Metasploitable (Training Target)",
        "asset_type": "training_target",
        "asset_class": "network_service",
        "criticality": "low",
        "status": "active",
        "device_type": "virtual",
        "lifecycle_state": "operational",
        "location": {
            "zone": "cyber-range",
            "subnet": "172.20.0.0/16",
            "building": "Cyber Range Lab",
        },
        "network": {
            "ip_address": "172.20.0.2",
            "mac_address": "02:42:ac:14:00:02",
        },
        "tags": ["training", "vulnerable-by-design", "cyber-range"],
        "@timestamp": datetime.utcnow().isoformat() + "Z",
    }

    for attempt in range(1, retries + 1):
        try:
            existing = opensearch_client.get_document("city-assets", doc_id)
            if existing:
                logger.info("Cyber range asset already exists")
                return
            opensearch_client.index_document("city-assets", asset, doc_id=doc_id)
            logger.info(f"Seeded cyber range asset: {doc_id}")
            return
        except Exception as e:
            logger.warning(f"Cyber range seed attempt {attempt}/{retries} failed: {e}")
            if attempt < retries:
                time.sleep(delay)

    logger.error("Failed to seed cyber range asset after all retries")


def _seed_iot_range_asset(retries: int = 5, delay: float = 3.0):
    """Ensure the IoT training target asset exists in city-assets."""
    import time

    doc_id = "iot-range-target"
    asset = {
        "asset_id": doc_id,
        "name": "IoT Sensor Hub (Training Target)",
        "asset_type": "training_target",
        "asset_class": "iot_device",
        "criticality": "low",
        "status": "active",
        "device_type": "virtual",
        "lifecycle_state": "operational",
        "location": {
            "zone": "iot-range",
            "subnet": "172.21.0.0/16",
            "building": "IoT Research Lab",
        },
        "network": {
            "ip_address": "172.21.0.2",
            "mac_address": "02:42:ac:15:00:02",
        },
        "tags": ["training", "iot", "vulnerable-by-design", "iot-range"],
        "@timestamp": datetime.utcnow().isoformat() + "Z",
    }

    for attempt in range(1, retries + 1):
        try:
            existing = opensearch_client.get_document("city-assets", doc_id)
            if existing:
                logger.info("IoT range asset already exists")
                return
            opensearch_client.index_document("city-assets", asset, doc_id=doc_id)
            logger.info(f"Seeded IoT range asset: {doc_id}")
            return
        except Exception as e:
            logger.warning(
                f"IoT range seed attempt {attempt}/{retries} failed: {e}"
            )
            if attempt < retries:
                time.sleep(delay)

    logger.error("Failed to seed IoT range asset after all retries")


def _seed_owasp_scenarios():
    """Seed OWASP Top 10 scenarios if they don't exist."""
    owasp_scenarios = [
        {
            "scenario_id": "owasp-a01-broken-access",
            "name": "OWASP A01: Broken Access Control",
            "description": "Simulates broken access control attacks including unauthorized function access, IDOR, and privilege escalation against smart city management APIs.",
            "components": ["network_infrastructure"],
            "duration_seconds": 120,
            "attack_pattern": "Brute Force",
            "parameters": {"owasp_id": "A01:2021", "mitre_technique": "T1078"},
            "category": "owasp",
        },
        {
            "scenario_id": "owasp-a02-crypto-failures",
            "name": "OWASP A02: Cryptographic Failures",
            "description": "Simulates attacks exploiting weak or missing encryption on IoT sensor data transmissions and management interfaces.",
            "components": ["iot_sensors"],
            "duration_seconds": 120,
            "attack_pattern": "Data Exfiltration",
            "parameters": {"owasp_id": "A02:2021", "mitre_technique": "T1040"},
            "category": "owasp",
        },
        {
            "scenario_id": "owasp-a03-injection",
            "name": "OWASP A03: Injection",
            "description": "Simulates SQL injection, command injection, and LDAP injection against smart city web applications and APIs.",
            "components": ["network_infrastructure"],
            "duration_seconds": 180,
            "attack_pattern": "Port Scan",
            "parameters": {"owasp_id": "A03:2021", "mitre_technique": "T1190"},
            "category": "owasp",
        },
        {
            "scenario_id": "owasp-a04-insecure-design",
            "name": "OWASP A04: Insecure Design",
            "description": "Simulates exploitation of design flaws in traffic management system allowing unauthorized traffic signal manipulation.",
            "components": ["traffic_management"],
            "duration_seconds": 150,
            "attack_pattern": "Port Scan",
            "parameters": {"owasp_id": "A04:2021", "mitre_technique": "T1565"},
            "category": "owasp",
        },
        {
            "scenario_id": "owasp-a05-security-misconfig",
            "name": "OWASP A05: Security Misconfiguration",
            "description": "Simulates discovery and exploitation of misconfigured IoT devices, default credentials, and unnecessary services.",
            "components": ["iot_sensors"],
            "duration_seconds": 180,
            "attack_pattern": "Port Scan",
            "parameters": {"owasp_id": "A05:2021", "mitre_technique": "T1046"},
            "category": "owasp",
        },
        {
            "scenario_id": "owasp-a06-vulnerable-components",
            "name": "OWASP A06: Vulnerable and Outdated Components",
            "description": "Simulates attacks targeting known vulnerabilities in outdated firmware and software on city infrastructure devices.",
            "components": ["network_infrastructure"],
            "duration_seconds": 120,
            "attack_pattern": "Port Scan",
            "parameters": {"owasp_id": "A06:2021", "mitre_technique": "T1190"},
            "category": "owasp",
        },
        {
            "scenario_id": "owasp-a07-auth-failures",
            "name": "OWASP A07: Identification and Authentication Failures",
            "description": "Simulates credential stuffing, brute force, and session hijacking attacks against city infrastructure authentication systems.",
            "components": ["network_infrastructure"],
            "duration_seconds": 180,
            "attack_pattern": "Brute Force",
            "parameters": {"owasp_id": "A07:2021", "mitre_technique": "T1110"},
            "category": "owasp",
        },
        {
            "scenario_id": "owasp-a08-integrity-failures",
            "name": "OWASP A08: Software and Data Integrity Failures",
            "description": "Simulates supply chain attacks and integrity violations through tampered IoT firmware updates and sensor data manipulation.",
            "components": ["iot_sensors"],
            "duration_seconds": 120,
            "attack_pattern": "Malware",
            "parameters": {"owasp_id": "A08:2021", "mitre_technique": "T1565"},
            "category": "owasp",
        },
        {
            "scenario_id": "owasp-a09-logging-failures",
            "name": "OWASP A09: Security Logging and Monitoring Failures",
            "description": "Simulates attacks that exploit insufficient logging, including log tampering and detection evasion techniques.",
            "components": ["security"],
            "duration_seconds": 120,
            "attack_pattern": "Data Exfiltration",
            "parameters": {"owasp_id": "A09:2021", "mitre_technique": "T1562"},
            "category": "owasp",
        },
        {
            "scenario_id": "owasp-a10-ssrf",
            "name": "OWASP A10: Server-Side Request Forgery (SSRF)",
            "description": "Simulates SSRF attacks against city backend services, attempting to reach internal infrastructure through web application proxies.",
            "components": ["network_infrastructure"],
            "duration_seconds": 120,
            "attack_pattern": "Port Scan",
            "parameters": {"owasp_id": "A10:2021", "mitre_technique": "T1190"},
            "category": "owasp",
        },
    ]

    seeded = 0
    for scenario_def in owasp_scenarios:
        try:
            existing = opensearch_client.get_document(
                "scenarios", scenario_def["scenario_id"]
            )
            if existing:
                continue
            doc = {
                **scenario_def,
                "created_at": datetime.utcnow().isoformat(),
                "created_by": "system",
            }
            opensearch_client.index_document(
                "scenarios", doc, doc_id=scenario_def["scenario_id"]
            )
            seeded += 1
        except Exception as e:
            logger.warning(
                f"Failed to seed OWASP scenario {scenario_def['scenario_id']}: {e}"
            )

    if seeded:
        logger.info(f"Seeded {seeded} OWASP Top 10 scenarios")


def _seed_detection_rules(retries: int = 3, delay: float = 2.0):
    """Seed detection rules from bundled JSON into OpenSearch rules index.

    Reads services/detection_engine/rules data that was exported to
    backend/app/data/detection_rules.json and creates documents in the
    'rules' index.  Existing rules (matched by rule_id) are skipped so
    manual edits made through the UI are preserved.
    """
    import time

    data_path = Path(__file__).parent / "data" / "detection_rules.json"
    if not data_path.exists():
        logger.warning("detection_rules.json not found – skipping rule seeding")
        return

    try:
        with open(data_path) as f:
            rules_data = json.load(f)
    except Exception as e:
        logger.error(f"Failed to read detection_rules.json: {e}")
        return

    now = datetime.utcnow().isoformat()
    seeded = 0
    skipped = 0

    for rule in rules_data:
        rule_id = rule.get("rule_id")
        if not rule_id:
            continue

        for attempt in range(1, retries + 1):
            try:
                existing = opensearch_client.get_document("rules", rule_id)
                if existing:
                    skipped += 1
                    break

                # Map YAML fields to Rule model expected by frontend
                doc = {
                    "rule_id": rule_id,
                    "name": rule.get("name", ""),
                    "description": rule.get("description", ""),
                    "enabled": rule.get("enabled", True),
                    "severity": rule.get("severity", "medium"),
                    "match_logic": rule.get("match_logic", {"type": "event_threshold", "parameters": {}}),
                    "technique_id": rule.get("technique_id", ""),
                    "technique_name": rule.get("technique_name", ""),
                    "response_actions": rule.get("response_actions", []),
                    "log_sources": rule.get("log_sources"),
                    "false_positive_notes": rule.get("false_positive_notes"),
                    "auto_response_config": rule.get("auto_response_config"),
                    "created_at": now,
                    "updated_at": now,
                }
                opensearch_client.index_document("rules", doc, doc_id=rule_id)
                seeded += 1
                break
            except Exception as e:
                if attempt < retries:
                    logger.warning(f"Rule seed attempt {attempt}/{retries} for {rule_id} failed: {e}")
                    time.sleep(delay)
                else:
                    logger.error(f"Failed to seed rule {rule_id} after {retries} attempts: {e}")

    logger.info(f"Detection rules seeding complete: {seeded} new, {skipped} existing (total in file: {len(rules_data)})")


def _seed_demo_data():
    """Seed realistic, internally-consistent SOC data so the demo looks live.

    Alerts use REAL detection rules (id/name/MITRE technique/severity); each one
    is backed by a cluster of correlated log events in its drill-down window
    (shared correlation_id, source IP and asset), and a realistic mix of
    open/triaged/resolved statuses with genuine analyst notes + resolution
    history. Baseline benign telemetry fills the streams so the system looks
    busy. Timestamps are spread irregularly over several days.

    Only runs in in-memory demo mode (USE_IN_MEMORY_STORE=true) so it never
    writes into a real OpenSearch cluster. Idempotent; deterministic layout.
    """
    import os
    import random
    import uuid
    from datetime import timedelta

    if os.getenv("USE_IN_MEMORY_STORE", "false").lower() != "true":
        return
    try:
        if opensearch_client.count("alerts") > 0:
            return  # already seeded
    except Exception:
        pass

    try:
        with open(Path(__file__).parent / "data" / "detection_rules.json") as f:
            all_rules = json.load(f)
    except Exception:
        all_rules = []
    if not all_rules:
        return

    rng = random.Random(20260613)  # fixed seed -> stable layout; anchored to now
    now = datetime.utcnow()

    ZONES = ["zone-a", "zone-b", "zone-c", "zone-d", "zone-e"]
    ANALYSTS = ["admin", "researcher"]
    STREAM = {
        "network_infrastructure": "logs-network",
        "iot_sensors": "logs-iot",
        "traffic_management": "logs-traffic",
    }
    ASSETS = {
        "network_infrastructure": [
            ("core-router-01", "10.10.0.1"), ("edge-firewall-02", "10.10.0.2"),
            ("scada-gateway-03", "10.30.0.5"), ("web-portal-prod", "10.10.5.20"),
            ("vpn-concentrator", "10.10.0.9"), ("metasploitable-target", "172.20.0.2"),
        ],
        "iot_sensors": [
            ("air-quality-az-07", "10.40.2.7"), ("water-flow-bz-12", "10.40.3.12"),
            ("smart-meter-cz-44", "10.40.5.44"), ("streetlight-ctrl-19", "10.40.1.19"),
            ("iot-hub-target", "172.21.0.2"),
        ],
        "traffic_management": [
            ("signal-ctrl-12", "10.20.0.12"), ("ramp-meter-03", "10.20.1.3"),
            ("cctv-node-27", "10.20.4.27"), ("vms-board-05", "10.20.6.5"),
        ],
    }
    # Believable external attacker IPs (reused across incidents for campaign feel).
    ATTACKERS = ["45.137.21.8", "185.220.101.34", "91.219.236.17", "193.27.228.140",
                 "194.165.16.77", "23.129.64.210", "146.70.124.5", "5.188.206.18",
                 "212.70.149.71", "103.97.176.4"]
    USERS = ["root", "admin", "operator", "svc_scada", "jdoe", "msmith", "backup"]
    DPORT = {"port_scan": 0, "auth_failure": 22, "c2_beacon": 443, "data_transfer": 443,
             "exploit_attempt": 8080, "anomaly": 1883, "command_override": 502,
             "suspicious_process": 445}

    events_by_comp = {
        "network_infrastructure": ["port_scan", "auth_failure", "c2_beacon", "exploit_attempt", "suspicious_process"],
        "iot_sensors": ["anomaly", "data_transfer", "auth_failure"],
        "traffic_management": ["command_override", "anomaly"],
    }

    def classify(rule):
        """Pick a city subsystem (spread across all three) and a plausible event
        type for the alert. The rule itself (real id/name/technique) is unchanged;
        a generic rule can fire on any asset type, like a real deployment."""
        t = (rule.get("name", "") + " " + (rule.get("technique_name") or "")).lower()
        if any(w in t for w in ["iot", "sensor", "firmware", "telemetry"]):
            comp = "iot_sensors"
        elif any(w in t for w in ["signal", "traffic", "scada", "ics"]):
            comp = "traffic_management"
        else:
            comp = rng.choices(
                ["network_infrastructure", "iot_sensors", "traffic_management"],
                weights=[50, 28, 22])[0]

        if any(w in t for w in ["scan", "recon", "discovery", "enumerat", "sniff"]):
            event = "port_scan"
        elif any(w in t for w in ["brute", "credential", "password", "login", "account", "authentication"]):
            event = "auth_failure"
        elif any(w in t for w in ["beacon", "command and control", "c2", "tunnel", "proxy"]):
            event = "c2_beacon"
        elif any(w in t for w in ["exfil", "archive", "collection", "transfer", "clipboard", "staged"]):
            event = "data_transfer"
        elif any(w in t for w in ["exploit", "injection", "vulnerab", "remote code", "elevation"]):
            event = "exploit_attempt"
        elif any(w in t for w in ["manipulation", "integrity", "tamper", "anomaly"]):
            event = "anomaly"
        elif any(w in t for w in ["signal", "control", "scada", "ics"]):
            event = "command_override"
        else:
            event = rng.choice(events_by_comp[comp])

        if event not in events_by_comp[comp]:
            event = rng.choice(events_by_comp[comp])
        return comp, event

    def msg_for(event, src, asset, asset_ip, n, user, dport):
        return {
            "port_scan": f"TCP SYN scan from {src} — {n * 9} ports probed on {asset} ({asset_ip})",
            "auth_failure": f"{n * 3} failed authentications for user '{user}' from {src} on {asset}",
            "c2_beacon": f"Periodic {rng.choice([30, 45, 60, 90])}s HTTPS beacon from {asset} to {src} (possible C2)",
            "data_transfer": f"Outbound transfer of {rng.randint(40, 900)} MB from {asset} to {src} over port {dport}",
            "exploit_attempt": f"Exploit attempt ({rng.choice(['CVE-2021-44228', 'CVE-2019-0708', 'SQL injection', 'path traversal'])}) from {src} against {asset}:{dport}",
            "anomaly": f"Telemetry anomaly on {asset}: reading {rng.randint(3, 9)}σ above 30-day baseline",
            "command_override": f"Unauthorized control command on {asset} from {src} — signal timing overridden",
            "suspicious_process": f"Suspicious process activity on {asset} correlated with {src}",
        }[event]

    RES_NOTES = {
        "true_positive": [
            "Confirmed malicious activity. Source {src} blocked at the perimeter firewall and added to the threat-intel watchlist; {asset} isolated for review.",
            "Validated true positive correlated with earlier reconnaissance from the same source. Credentials rotated and {asset} reimaged.",
        ],
        "false_positive": [
            "Triggered by the scheduled authenticated vulnerability scan from the internal scanner (10.0.5.12). Rule tuned to exclude the scanner subnet.",
            "Matched a routine backup job to {asset}; verified against the change calendar. Added an allow-list exception.",
        ],
        "benign": [
            "Traced to an authorized maintenance window (CHG-{chg}); behaviour expected. No further action.",
            "Confirmed legitimate operator action on {asset} during shift handover.",
        ],
        "informational": [
            "Low-confidence signal with no follow-on activity. Documented for baseline tuning.",
            "Isolated low-severity event; retained for trend analysis only.",
        ],
    }
    INV_NOTES = [
        "Reviewed {n} correlated events in the drill-down window; {src} -> {asset} in {zone}.",
        "Pivoted on {src} across logs-*; activity scoped to {asset}.",
        "Checked threat intel for {src} and cross-referenced the asset inventory.",
    ]
    REM_NOTES = ["Firewall rule pushed; monitoring for recurrence.", "Host patched and credentials rotated.",
                 "No remediation required.", "Watch-list entry added; 24h heightened monitoring."]

    history: list = []
    chosen = rng.sample(all_rules, min(26, len(all_rules)))
    for rule in chosen:
        comp, event = classify(rule)
        zone = rng.choice(ZONES)
        asset, asset_ip = rng.choice(ASSETS[comp])
        src = rng.choice(ATTACKERS)
        user = rng.choice(USERS)
        dport = DPORT[event] or rng.choice([21, 23, 135, 445, 3389])
        n_events = rng.randint(4, 16)
        triggered = now - timedelta(minutes=rng.randint(8, 4 * 24 * 60), seconds=rng.randint(0, 59))
        corr = uuid.uuid4().hex
        first_seen = triggered - timedelta(seconds=rng.randint(60, 140))
        alert_id = uuid.uuid4().hex
        alert = {
            "alert_id": alert_id,
            "triggered_at": triggered.isoformat(),
            "rule_id": rule.get("rule_id"),
            "rule_name": rule.get("name"),
            "severity": rule.get("severity", "medium"),
            "component": comp,
            "city_zone": zone,
            "technique_id": rule.get("technique_id", ""),
            "technique_name": rule.get("technique_name", ""),
            "evidence": {
                "source_ip": src, "target_ip": asset_ip, "target_asset": asset,
                "destination_port": dport, "event_count": n_events,
                "first_seen": first_seen.isoformat(), "last_seen": triggered.isoformat(),
                "city_zone": zone, "sample": msg_for(event, src, asset, asset_ip, n_events, user, dport),
            },
            "related_query": f"src_ip:{src} AND component:{comp}",
            "status": "open",
            "asset_id": asset,
            "correlation_id": corr,
            "related_events_count": n_events,
        }
        roll = rng.random()
        if roll < 0.45:
            cls = rng.choices(["true_positive", "false_positive", "benign", "informational"],
                              weights=[60, 20, 12, 8])[0]
            resolver = rng.choice(ANALYSTS)
            resolved_at = min(triggered + timedelta(minutes=rng.randint(8, 720)), now - timedelta(minutes=2))
            rnotes = rng.choice(RES_NOTES[cls]).format(src=src, asset=asset, chg=rng.randint(1800, 2400))
            inotes = rng.choice(INV_NOTES).format(n=n_events, src=src, asset=asset, zone=zone)
            rem = rng.choice(REM_NOTES)
            alert["status"] = "resolved"
            alert["resolution"] = {
                "classification": cls, "resolution_notes": rnotes, "investigation_notes": inotes,
                "remediation_notes": rem, "resolved_by": resolver, "resolved_at": resolved_at.isoformat(),
                "last_amended_by": None, "last_amended_at": None,
            }
            history.append({
                "history_id": uuid.uuid4().hex, "alert_id": alert_id, "action": "resolve",
                "classification": cls, "resolution_notes": rnotes, "investigation_notes": inotes,
                "remediation_notes": rem, "performed_by": resolver, "performed_at": resolved_at.isoformat(),
            })
        elif roll < 0.75:
            alert["status"] = "triaged"

        opensearch_client.index_document("alerts", alert, doc_id=alert_id)

        sev_pool = (["medium", "high", "high", "critical"]
                    if alert["severity"] in ("high", "critical")
                    else ["low", "medium", "medium", "high"])
        for _ in range(n_events):
            ts = triggered - timedelta(seconds=rng.randint(0, 140))
            opensearch_client.index_document(STREAM[comp], {
                "@timestamp": ts.isoformat() + "Z", "component": comp, "event_type": event,
                "severity": rng.choice(sev_pool), "city_zone": zone, "src_ip": src,
                "dst_ip": asset_ip, "src_port": rng.randint(1024, 65535), "dst_port": dport,
                "asset_id": asset, "correlation_id": corr,
                "message": msg_for(event, src, asset, asset_ip, n_events, user, dport),
            })

    for h in history:
        opensearch_client.index_document("alert-resolution-history", h, doc_id=h["history_id"])

    # Baseline benign telemetry over the last 24h so the streams look alive.
    baseline_events = {
        "network_infrastructure": ["connection", "auth_success", "dns_query", "heartbeat"],
        "iot_sensors": ["sensor_reading", "telemetry", "heartbeat", "calibration"],
        "traffic_management": ["vehicle_count", "signal_state", "heartbeat", "occupancy"],
    }

    def baseline_msg(ev, asset, zone):
        return {
            "connection": f"Session established to {asset} from internal host",
            "auth_success": f"Successful login on {asset}",
            "dns_query": f"DNS resolution served for {asset}",
            "heartbeat": f"{asset} health check OK",
            "sensor_reading": f"{asset} reading {rng.randint(10, 120)} {rng.choice(['µg/m³', 'L/min', 'dB', 'kWh'])}",
            "telemetry": f"{asset} telemetry batch uploaded",
            "calibration": f"{asset} auto-calibration completed",
            "vehicle_count": f"{zone} throughput {rng.randint(20, 180)} veh/min",
            "signal_state": f"{asset} phase {rng.choice(['green', 'amber', 'red'])}",
            "occupancy": f"{zone} occupancy {rng.randint(5, 95)}%",
        }.get(ev, f"{asset} {ev}")

    n_base = 0
    for comp, events in baseline_events.items():
        for _ in range(110):
            asset, asset_ip = rng.choice(ASSETS[comp])
            ev = rng.choice(events)
            zone = rng.choice(ZONES)
            ts = now - timedelta(minutes=rng.randint(0, 24 * 60), seconds=rng.randint(0, 59))
            opensearch_client.index_document(STREAM[comp], {
                "@timestamp": ts.isoformat() + "Z", "component": comp, "event_type": ev,
                "severity": rng.choices(["info", "low", "medium"], weights=[70, 25, 5])[0],
                "city_zone": zone,
                "src_ip": f"10.{rng.randint(10, 60)}.{rng.randint(0, 9)}.{rng.randint(2, 250)}",
                "dst_ip": asset_ip, "src_port": rng.randint(1024, 65535),
                "dst_port": rng.choice([80, 443, 1883, 502, 123]), "asset_id": asset,
                "message": baseline_msg(ev, asset, zone),
            })
            n_base += 1

    logger.info(
        f"Seeded realistic demo data: {len(chosen)} alerts ({len(history)} resolved), "
        f"{n_base} baseline events + correlated clusters"
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    logger.info("Starting CityShield Backend API...")
    logger.info(f"Connecting to OpenSearch at {settings.opensearch_url}")

    # Create default users
    create_default_admin()
    create_default_researcher()

    # Seed cyber range asset into city-assets (idempotent)
    try:
        _seed_cyber_range_asset()
    except Exception as e:
        logger.debug(f"Cyber range asset seeding skipped: {e}")

    # Seed IoT range asset into city-assets (idempotent)
    try:
        _seed_iot_range_asset()
    except Exception as e:
        logger.debug(f"IoT range asset seeding skipped: {e}")

    # Seed OWASP Top 10 scenarios (idempotent)
    try:
        _seed_owasp_scenarios()
    except Exception as e:
        logger.debug(f"OWASP scenario seeding skipped: {e}")

    # Seed detection rules from YAML export (idempotent)
    try:
        _seed_detection_rules()
    except Exception as e:
        logger.debug(f"Detection rule seeding skipped: {e}")

    # Seed fake alerts/logs in demo (in-memory) mode so dashboards look alive
    try:
        _seed_demo_data()
    except Exception as e:
        logger.debug(f"Demo data seeding skipped: {e}")

    # Initialize OpenSearch Dashboards (non-blocking)
    try:
        created = init_opensearch_dashboards()
        if created:
            logger.info(f"OpenSearch Dashboards initialized: {len(created)} objects")
    except Exception as e:
        logger.debug(f"Dashboard init skipped (dashboards may not be ready): {e}")

    logger.info("Application startup complete")

    yield

    # Shutdown
    logger.info("Shutting down CityShield Backend API...")


# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="CityShield Platform Backend API",
    lifespan=lifespan
)

# Configure CORS — origins are configurable via the CORS_ALLOWED_ORIGINS env var.
# A wildcard ("*") combined with allow_credentials=True is rejected by browsers and
# is insecure, so we use an explicit allow-list (defaults to local dev origins).
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(routes_health.router)
app.include_router(routes_auth.router)
app.include_router(routes_users.router)
app.include_router(routes_rules.router)
app.include_router(routes_scenarios.router)
app.include_router(routes_alerts.router)
app.include_router(routes_actions.router)
app.include_router(routes_devices.router)
app.include_router(routes_metrics.router)
app.include_router(routes_logs.router)
app.include_router(routes_overview.router)
app.include_router(routes_websocket.router)
app.include_router(routes_lab.router)
app.include_router(routes_proposals.router)
app.include_router(routes_mitre.router)
app.include_router(routes_awareness.router)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "app": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs",
        "health": "/api/health"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
