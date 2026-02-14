"""Scenario management service."""
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid
import asyncio
import logging
from ..db.opensearch_client import opensearch_client
from ..models.scenario import Scenario, ScenarioCreate, ScenarioUpdate, ScenarioRun, ScenarioRunCreate

logger = logging.getLogger(__name__)

# Stage templates per attack pattern
ATTACK_STAGE_TEMPLATES: Dict[str, List[Dict[str, str]]] = {
    "DDoS": [
        {"name": "Botnet Activation", "description": "Coordinating distributed attack nodes"},
        {"name": "Traffic Flood", "description": "Overwhelming target with SYN/UDP flood packets"},
        {"name": "Service Degradation", "description": "Target services becoming unresponsive"},
        {"name": "Full Denial", "description": "Complete service disruption achieved"},
    ],
    "Brute Force": [
        {"name": "Target Enumeration", "description": "Identifying active login endpoints"},
        {"name": "Credential Spray", "description": "Testing common password combinations"},
        {"name": "Intensive Attack", "description": "Focused high-rate attempts on viable accounts"},
        {"name": "Access Breach", "description": "Valid credentials discovered"},
    ],
    "Port Scan": [
        {"name": "Host Discovery", "description": "Sending ICMP and ARP probes"},
        {"name": "Port Enumeration", "description": "Scanning TCP/UDP ports on hosts"},
        {"name": "Service Detection", "description": "Fingerprinting detected services"},
        {"name": "Vulnerability Mapping", "description": "Mapping services against known CVEs"},
    ],
    "Malware": [
        {"name": "Initial Delivery", "description": "Malicious payload delivered via compromised channel"},
        {"name": "Execution", "description": "Payload executing on target device"},
        {"name": "Lateral Movement", "description": "Spreading to adjacent devices"},
        {"name": "Data Exfiltration", "description": "Transmitting data to external C2 server"},
    ],
    "Data Exfiltration": [
        {"name": "Access Established", "description": "Attacker gains access to data stores"},
        {"name": "Data Collection", "description": "Aggregating sensitive data"},
        {"name": "Staging", "description": "Compressing and encrypting data"},
        {"name": "Exfiltration", "description": "Transmitting data via encrypted channel"},
    ],
    "Ransomware": [
        {"name": "Initial Compromise", "description": "Gaining foothold in target system"},
        {"name": "Privilege Escalation", "description": "Escalating to admin-level access"},
        {"name": "Encryption", "description": "Encrypting critical system data"},
        {"name": "Ransom Demand", "description": "Deploying ransom note and disabling recovery"},
    ],
}

DEFAULT_STAGES = [
    {"name": "Reconnaissance", "description": "Scanning target systems"},
    {"name": "Initial Access", "description": "Attempting entry into systems"},
    {"name": "Execution", "description": "Running attack payload"},
    {"name": "Impact", "description": "Affecting target systems"},
]

# Map target_component values to possible device IDs
COMPONENT_DEVICE_MAP: Dict[str, List[str]] = {
    "traffic_management": ["traffic-ctrl-01", "traffic-cam-02", "traffic-sig-03", "traffic-sig-04", "traffic-park-05"],
    "iot_sensors": ["iot-hub-01", "iot-env-02", "iot-water-03", "iot-air-04", "iot-waste-05", "iot-energy-06"],
    "network_infrastructure": ["net-fw-01", "net-switch-02", "net-ids-03", "net-vpn-04", "net-dns-05"],
    "security": ["sec-siem-01", "sec-edr-02", "sec-scan-03", "sec-auth-04"],
    "industrial_systems": ["ind-power-01", "ind-scada-02", "ind-plc-03", "ind-wind-04", "ind-grid-05", "ind-rail-06"],
}


class ScenarioService:
    """Service for managing scenarios and scenario runs."""

    SCENARIO_INDEX = "scenarios"
    RUN_INDEX = "scenario_runs"

    @staticmethod
    def create_scenario(scenario: ScenarioCreate, username: str) -> Scenario:
        """Create a new scenario."""
        now = datetime.utcnow()
        scenario_doc = {
            **scenario.dict(),
            "created_at": now.isoformat(),
            "created_by": username
        }
        opensearch_client.index_document(
            ScenarioService.SCENARIO_INDEX,
            scenario_doc,
            doc_id=scenario.scenario_id
        )
        return Scenario(**scenario_doc)

    @staticmethod
    def get_scenario(scenario_id: str) -> Optional[Scenario]:
        """Get a scenario by ID."""
        doc = opensearch_client.get_document(ScenarioService.SCENARIO_INDEX, scenario_id)
        if doc:
            return Scenario(**doc)
        return None

    @staticmethod
    def list_scenarios() -> List[Scenario]:
        """List all scenarios."""
        query = {
            "query": {"match_all": {}},
            "size": 1000,
            "sort": [{"created_at": {"order": "desc"}}]
        }
        docs = opensearch_client.search(ScenarioService.SCENARIO_INDEX, query)
        return [Scenario(**doc) for doc in docs]

    @staticmethod
    def update_scenario(scenario_id: str, updates: ScenarioUpdate) -> Optional[Scenario]:
        """Update a scenario."""
        update_data = {k: v for k, v in updates.dict().items() if v is not None}
        if update_data:
            opensearch_client.update_document(ScenarioService.SCENARIO_INDEX, scenario_id, update_data)
        return ScenarioService.get_scenario(scenario_id)

    @staticmethod
    def delete_scenario(scenario_id: str) -> bool:
        """Delete a scenario."""
        try:
            opensearch_client.delete_document(ScenarioService.SCENARIO_INDEX, scenario_id)
            return True
        except Exception:
            return False

    @staticmethod
    def create_run(run: ScenarioRunCreate, username: str, scenario: Scenario) -> ScenarioRun:
        """Create a new scenario run with stage initialization."""
        import random
        run_id = str(uuid.uuid4())
        now = datetime.utcnow()

        # Determine target device
        target_device_id = run.target_device_id
        target_component = scenario.components[0] if scenario.components else "unknown"
        if not target_device_id:
            devices = COMPONENT_DEVICE_MAP.get(target_component, [])
            target_device_id = random.choice(devices) if devices else None

        # Build initial stages
        stage_templates = ATTACK_STAGE_TEMPLATES.get(scenario.attack_pattern, DEFAULT_STAGES)
        stages = []
        for tmpl in stage_templates:
            stages.append({
                "name": tmpl["name"],
                "description": tmpl["description"],
                "status": "pending",
                "started_at": None,
                "completed_at": None,
                "error": None,
            })

        run_doc = {
            "run_id": run_id,
            "scenario_id": run.scenario_id,
            "status": "pending",
            "started_at": now.isoformat(),
            "started_by": username,
            "completed_at": None,
            "results": None,
            "target_device_id": target_device_id,
            "target_component_id": target_device_id,
            "stages": stages,
        }
        opensearch_client.index_document(ScenarioService.RUN_INDEX, run_doc, doc_id=run_id)
        return ScenarioRun(**run_doc)

    @staticmethod
    def get_run(run_id: str) -> Optional[ScenarioRun]:
        """Get a scenario run by ID."""
        doc = opensearch_client.get_document(ScenarioService.RUN_INDEX, run_id)
        if doc:
            return ScenarioRun(**doc)
        return None

    @staticmethod
    def get_run_raw(run_id: str) -> Optional[Dict[str, Any]]:
        """Get raw run document."""
        return opensearch_client.get_document(ScenarioService.RUN_INDEX, run_id)

    @staticmethod
    def list_runs(scenario_id: Optional[str] = None) -> List[ScenarioRun]:
        """List scenario runs, optionally filtered by scenario_id."""
        query = {
            "query": {"match_all": {}},
            "size": 1000,
            "sort": [{"started_at": {"order": "desc"}}]
        }
        if scenario_id:
            query["query"] = {"term": {"scenario_id": scenario_id}}
        docs = opensearch_client.search(ScenarioService.RUN_INDEX, query)
        return [ScenarioRun(**doc) for doc in docs]

    @staticmethod
    def update_run_status(run_id: str, status: str, results: Optional[dict] = None):
        """Update a scenario run status."""
        updates: Dict[str, Any] = {"status": status}
        if status in ["completed", "failed"]:
            updates["completed_at"] = datetime.utcnow().isoformat()
        if results:
            updates["results"] = results
        opensearch_client.update_document(ScenarioService.RUN_INDEX, run_id, updates)
        return ScenarioService.get_run(run_id)

    @staticmethod
    def update_run_stages(run_id: str, stages: List[Dict[str, Any]]):
        """Write stage status updates to OpenSearch."""
        opensearch_client.update_document(ScenarioService.RUN_INDEX, run_id, {"stages": stages})


async def simulate_scenario_execution(run_id: str, scenario: Scenario):
    """Background task that iterates through stages with timed delays."""
    try:
        duration = scenario.duration_seconds
        stage_duration = duration / 4

        # Mark run as running
        ScenarioService.update_run_status(run_id, "running")

        # Get current run doc to retrieve stages
        doc = ScenarioService.get_run_raw(run_id)
        if not doc:
            return
        stages = doc.get("stages", [])
        if not stages:
            return

        for i, stage in enumerate(stages):
            # Mark stage as running
            stages[i]["status"] = "running"
            stages[i]["started_at"] = datetime.utcnow().isoformat()
            ScenarioService.update_run_stages(run_id, stages)

            # Wait for stage duration
            await asyncio.sleep(stage_duration)

            # Mark stage as success
            stages[i]["status"] = "success"
            stages[i]["completed_at"] = datetime.utcnow().isoformat()
            ScenarioService.update_run_stages(run_id, stages)

            # Generate a mock alert for this stage
            _generate_stage_alert(run_id, scenario, i, doc.get("target_device_id"))

        # Mark run as completed
        ScenarioService.update_run_status(run_id, "completed", {"stages_completed": len(stages)})

    except Exception as e:
        logger.error(f"Scenario execution error for run {run_id}: {e}")
        try:
            ScenarioService.update_run_status(run_id, "failed", {"error": str(e)})
        except Exception:
            pass


def _generate_stage_alert(run_id: str, scenario: Scenario, stage_index: int, target_device_id: Optional[str]):
    """Generate a mock alert for a scenario stage."""
    now = datetime.utcnow()
    alert_id = f"scenario-alert-{run_id[:8]}-stage-{stage_index}"
    target_component = scenario.components[0] if scenario.components else "unknown"

    # Determine zone from component
    zone_map = {
        "traffic_management": "zone-a", "traffic_sim": "zone-a",
        "iot_sensors": "zone-b", "iot_sim": "zone-b",
        "network_infrastructure": "zone-c", "network_emulator": "zone-c",
        "security": "zone-d",
        "industrial_systems": "zone-e",
    }
    city_zone = zone_map.get(target_component, "zone-a")

    severities = ["medium", "high", "high", "critical"]
    alert_doc = {
        "alert_id": alert_id,
        "triggered_at": now.isoformat() + "Z",
        "rule_id": f"CS-SIM-{stage_index}",
        "rule_name": f"Scenario Stage {stage_index + 1} - {scenario.attack_pattern}",
        "severity": severities[min(stage_index, 3)],
        "component": target_component,
        "city_zone": city_zone,
        "technique_id": scenario.parameters.get("mitre_technique", "T0000"),
        "technique_name": scenario.attack_pattern,
        "evidence": {
            "scenario_run_id": run_id,
            "stage": stage_index,
            "target_device": target_device_id,
        },
        "related_query": f"component:{target_component}",
        "status": "open",
        "enrichment": {"source": "scenario_simulation", "scenario_id": scenario.scenario_id},
        "response": None,
        "asset_id": target_device_id,
        "correlation_id": run_id,
        "related_events_count": 0,
    }
    try:
        opensearch_client.index_document("alerts", alert_doc, doc_id=alert_id)
    except Exception as e:
        logger.debug(f"Failed to create stage alert: {e}")
