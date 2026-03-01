"""Scenario management service."""
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid
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
    "traffic_sim": ["traffic-ctrl-01", "traffic-cam-02", "traffic-sig-03", "traffic-sig-04", "traffic-park-05"],
    "iot_sensors": ["iot-hub-01", "iot-env-02", "iot-water-03", "iot-air-04", "iot-waste-05", "iot-energy-06"],
    "iot_sim": ["iot-hub-01", "iot-env-02", "iot-water-03", "iot-air-04", "iot-waste-05", "iot-energy-06"],
    "network_infrastructure": ["net-fw-01", "net-switch-02", "net-ids-03", "net-vpn-04", "net-dns-05"],
    "network_emulator": ["net-fw-01", "net-switch-02", "net-ids-03", "net-vpn-04", "net-dns-05"],
    "security": ["sec-siem-01", "sec-edr-02", "sec-scan-03", "sec-auth-04"],
    "industrial_systems": ["ind-power-01", "ind-scada-02", "ind-plc-03", "ind-wind-04", "ind-grid-05", "ind-rail-06"],
    "cyber_range": ["cyber-range-metasploitable"],
    "iot_range": ["iot-range-target"],
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


def _exec_cyber_range_commands(target_host: str = "metasploitable") -> dict:
    """Execute real commands on the attacker container via Docker API.

    Returns a summary dict with stdout/stderr from each command.
    The range_logger captures the resulting network traffic.
    """
    results = {"commands": [], "success": False}
    try:
        import docker as docker_sdk
        client = docker_sdk.from_env()
        container = client.containers.get("attacker")

        commands = [
            ["ping", "-c", "4", "-W", "2", target_host],
            ["nmap", "-sT", "-T4", "--top-ports", "20", "-Pn", target_host],
        ]

        for cmd in commands:
            cmd_str = " ".join(cmd)
            try:
                exit_code, output = container.exec_run(cmd, demux=False, timeout=30)
                results["commands"].append({
                    "cmd": cmd_str,
                    "exit_code": exit_code,
                    "output": output.decode("utf-8", errors="replace")[:2000] if output else "",
                })
            except Exception as cmd_err:
                results["commands"].append({
                    "cmd": cmd_str,
                    "exit_code": -1,
                    "output": str(cmd_err)[:500],
                })

        results["success"] = True
    except Exception as e:
        logger.warning(f"Cyber range Docker exec failed (non-fatal): {e}")
        results["error"] = str(e)[:500]

    return results


async def simulate_scenario_execution(run_id: str, scenario: Scenario):
    """Execute real attack scenario with actual traffic generation."""
    from .attack_engine import AttackExecutionEngine

    try:
        # Mark run as running
        ScenarioService.update_run_status(run_id, "running")

        # Get current run doc to retrieve stages and config
        doc = ScenarioService.get_run_raw(run_id)
        if not doc:
            return

        stages = doc.get("stages", [])
        target_device = doc.get("target_device_id")

        # For cyber_range scenarios, also exec real commands on the attacker container
        component = scenario.components[0] if scenario.components else ""
        if component == "cyber_range":
            import asyncio
            loop = asyncio.get_event_loop()
            docker_results = await loop.run_in_executor(
                None, _exec_cyber_range_commands, "metasploitable"
            )
            logger.info(f"Cyber range Docker exec results: {len(docker_results.get('commands', []))} commands")

        # Map scenario attack pattern to real attack techniques
        attack_techniques = _map_scenario_to_techniques(scenario, target_device)

        # Create attack engine
        engine = AttackExecutionEngine(run_id, {
            'scenario_id': scenario.scenario_id,
            'target_device': target_device,
            'component': scenario.components[0] if scenario.components else 'network_infrastructure'
        })

        # Update stages as we execute
        for i, (stage, tech_config) in enumerate(zip(stages, attack_techniques)):
            # Mark stage as running
            stages[i]["status"] = "running"
            stages[i]["started_at"] = datetime.utcnow().isoformat()
            ScenarioService.update_run_stages(run_id, stages)

            # Execute real attack for this stage
            logger.info(f"Executing stage {i+1}/{len(stages)}: {stage['name']}")

            # Execute the attack technique
            await engine.execute_attack_chain([tech_config])

            # Mark stage as success
            stages[i]["status"] = "success"
            stages[i]["completed_at"] = datetime.utcnow().isoformat()
            stages[i]["events_generated"] = tech_config.get('events_generated', 0)
            ScenarioService.update_run_stages(run_id, stages)

        # Get final results from attack engine
        results = engine.results

        # Mark run as completed with detailed results
        ScenarioService.update_run_status(run_id, "completed", {
            "stages_completed": len(stages),
            "total_events_generated": results['total_events_generated'],
            "alerts_triggered": results['alerts_triggered'],
            "detection_rate": results['alerts_triggered'] / max(len(attack_techniques), 1) * 100,
            "detection_gaps": results['detection_gaps'],
            "techniques_executed": [t['technique'] for t in results['techniques_executed']]
        })

        logger.info(f"Scenario {run_id} completed: {results['total_events_generated']} events, {results['alerts_triggered']} alerts")

    except Exception as e:
        logger.error(f"Scenario execution error for run {run_id}: {e}")
        try:
            ScenarioService.update_run_status(run_id, "failed", {"error": str(e)})
        except Exception:
            pass


def _map_scenario_to_techniques(scenario: Scenario, target_device: Optional[str]) -> List[Dict[str, Any]]:
    """Map a scenario to executable attack techniques."""
    attack_pattern = scenario.attack_pattern.lower()
    component = scenario.components[0] if scenario.components else 'network_infrastructure'

    # Map scenario patterns to real attack techniques
    if 'brute' in attack_pattern or 'password' in attack_pattern:
        zone = _get_zone_for_component(component)
        return [
            {   # Stage 1: Target Enumeration
                'technique': 'port_scan',
                'target_device': target_device,
                'component': component,
                'zone': zone,
                'scan_type': 'syn',
                'ports': [22, 80, 443, 1883, 502, 8080],
                'target_hosts': 5,
                'delay_after': 3
            },
            {   # Stage 2: Credential Spray
                'technique': 'brute_force',
                'target_device': target_device,
                'component': component,
                'zone': zone,
                'attempts': 15,
                'delay_ms': 300,
                'allow_success': False,
                'delay_after': 5
            },
            {   # Stage 3: Intensive Attack
                'technique': 'brute_force',
                'target_device': target_device,
                'component': component,
                'zone': zone,
                'attempts': 50,
                'delay_ms': 100,
                'allow_success': False,
                'delay_after': 5
            },
            {   # Stage 4: Access Breach
                'technique': 'brute_force',
                'target_device': target_device,
                'component': component,
                'zone': zone,
                'attempts': 10,
                'delay_ms': 500,
                'allow_success': True,
                'delay_after': 3
            },
        ]
    elif 'scan' in attack_pattern or 'reconnaissance' in attack_pattern:
        zone = _get_zone_for_component(component)
        return [
            {   # Stage 1: Host Discovery
                'technique': 'port_scan',
                'target_device': target_device,
                'component': component,
                'zone': zone,
                'scan_type': 'syn',
                'ports': [0],
                'target_hosts': 10,
                'delay_after': 3
            },
            {   # Stage 2: Port Enumeration
                'technique': 'port_scan',
                'target_device': target_device,
                'component': component,
                'zone': zone,
                'scan_type': 'syn',
                'ports': [22, 80, 443, 1883, 502, 8080, 8443, 3389],
                'target_hosts': 15,
                'delay_after': 3
            },
            {   # Stage 3: Service Detection
                'technique': 'port_scan',
                'target_device': target_device,
                'component': component,
                'zone': zone,
                'scan_type': 'syn',
                'ports': [21, 22, 23, 25, 80, 110, 139, 443, 445, 3306, 5432, 8080],
                'target_hosts': 5,
                'delay_after': 3
            },
            {   # Stage 4: Vulnerability Mapping
                'technique': 'port_scan',
                'target_device': target_device,
                'component': component,
                'zone': zone,
                'scan_type': 'syn',
                'ports': [22, 80, 443, 502, 8080],
                'target_hosts': 8,
                'delay_after': 2
            },
        ]
    elif 'c2' in attack_pattern or 'command' in attack_pattern or 'botnet' in attack_pattern:
        zone = _get_zone_for_component(component)
        return [
            {   # Stage 1: Initial Delivery
                'technique': 'port_scan',
                'target_device': target_device,
                'component': component,
                'zone': zone,
                'scan_type': 'syn',
                'ports': [80, 443, 8080, 8443],
                'target_hosts': 3,
                'delay_after': 3
            },
            {   # Stage 2: Execution (establish C2)
                'technique': 'c2_beacon',
                'target_device': target_device,
                'component': component,
                'zone': zone,
                'beacon_interval_seconds': 30,
                'duration_seconds': 90,
                'protocol': 'https',
                'jitter_percent': 15,
                'delay_after': 5
            },
            {   # Stage 3: Lateral Movement
                'technique': 'port_scan',
                'target_device': target_device,
                'component': component,
                'zone': zone,
                'scan_type': 'syn',
                'ports': [22, 445, 3389, 5985],
                'target_hosts': 8,
                'delay_after': 5
            },
            {   # Stage 4: Data Exfiltration
                'technique': 'data_exfiltration',
                'target_device': target_device,
                'component': component,
                'zone': zone,
                'data_volume_mb': 30,
                'method': 'https',
                'delay_after': 3
            },
        ]
    elif 'exfil' in attack_pattern or 'data' in attack_pattern:
        zone = _get_zone_for_component(component)
        return [
            {   # Stage 1: Access Established
                'technique': 'port_scan',
                'target_device': target_device,
                'component': component,
                'zone': zone,
                'scan_type': 'syn',
                'ports': [22, 80, 443, 3306, 5432, 1433],
                'target_hosts': 5,
                'delay_after': 3
            },
            {   # Stage 2: Data Collection
                'technique': 'brute_force',
                'target_device': target_device,
                'component': component,
                'zone': zone,
                'attempts': 20,
                'delay_ms': 200,
                'allow_success': True,
                'delay_after': 5
            },
            {   # Stage 3: Staging
                'technique': 'c2_beacon',
                'target_device': target_device,
                'component': component,
                'zone': zone,
                'beacon_interval_seconds': 20,
                'duration_seconds': 60,
                'protocol': 'https',
                'jitter_percent': 10,
                'delay_after': 5
            },
            {   # Stage 4: Exfiltration
                'technique': 'data_exfiltration',
                'target_device': target_device,
                'component': component,
                'zone': zone,
                'data_volume_mb': 50,
                'method': 'https',
                'delay_after': 3
            },
        ]
    else:
        # Default: full 4-stage attack chain (DDoS, Ransomware, etc.)
        zone = _get_zone_for_component(component)
        return [
            {   # Stage 1: Reconnaissance / Botnet Activation / Initial Compromise
                'technique': 'port_scan',
                'target_device': target_device,
                'component': component,
                'zone': zone,
                'scan_type': 'syn',
                'ports': [22, 80, 443, 1883, 502, 8080],
                'target_hosts': 5,
                'delay_after': 3
            },
            {   # Stage 2: Initial Access / Traffic Flood / Privilege Escalation
                'technique': 'brute_force',
                'target_device': target_device,
                'component': component,
                'zone': zone,
                'attempts': 20,
                'delay_ms': 300,
                'delay_after': 5
            },
            {   # Stage 3: Execution / Service Degradation / Encryption
                'technique': 'c2_beacon',
                'target_device': target_device,
                'component': component,
                'zone': zone,
                'beacon_interval_seconds': 60,
                'duration_seconds': 120,
                'protocol': 'https',
                'delay_after': 5
            },
            {   # Stage 4: Impact / Full Denial / Ransom Demand
                'technique': 'data_exfiltration',
                'target_device': target_device,
                'component': component,
                'zone': zone,
                'data_volume_mb': 25,
                'method': 'https',
                'delay_after': 3
            },
        ]


def _get_zone_for_component(component: str) -> str:
    """Get zone for component."""
    zone_map = {
        "traffic_management": "zone-a", "traffic_sim": "zone-a",
        "iot_sensors": "zone-b", "iot_sim": "zone-b",
        "network_infrastructure": "zone-c", "network_emulator": "zone-c",
        "security": "zone-d",
        "industrial_systems": "zone-e",
        "cyber_range": "cyber-range",
    }
    return zone_map.get(component, "zone-a")


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
        "cyber_range": "cyber-range",
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
