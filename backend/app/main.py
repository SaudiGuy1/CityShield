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

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify allowed origins
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
