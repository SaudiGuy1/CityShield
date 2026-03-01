"""Scenario management routes."""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import List, Optional, Dict, Any
from ..models.scenario import Scenario, ScenarioCreate, ScenarioUpdate, ScenarioRun, ScenarioRunCreate, CustomScenarioCreate
from ..core.rbac import require_researcher_or_admin
from ..core.security import get_current_user
from ..services.scenario_service import ScenarioService, simulate_scenario_execution

router = APIRouter(prefix="/api/scenarios", tags=["scenarios"])


@router.post("", response_model=Scenario)
async def create_scenario(
    scenario: ScenarioCreate,
    current_user: dict = Depends(require_researcher_or_admin)
):
    """Create a new scenario (Researcher or Admin)."""
    # Check if scenario_id already exists
    existing = ScenarioService.get_scenario(scenario.scenario_id)
    if existing:
        raise HTTPException(status_code=400, detail="Scenario ID already exists")

    return ScenarioService.create_scenario(scenario, current_user["username"])


@router.get("", response_model=List[Scenario])
async def list_scenarios(current_user: dict = Depends(get_current_user)):
    """List all scenarios."""
    return ScenarioService.list_scenarios()


@router.get("/attack-techniques")
async def get_available_attack_techniques(
    current_user: dict = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """Get list of available attack techniques with their configurable parameters.

    Returns all 31 MITRE ATT&CK techniques. Four have specialized execution engines
    with detailed parameters; the rest use a generic engine with intensity control.
    """
    # Specialized techniques with full parameter sets
    specialized = [
        {
            "technique": "brute_force",
            "name": "Brute Force",
            "description": "Attempt to gain access through systematic credential guessing",
            "mitre_technique": "T1110",
            "tactic": "Credential Access",
            "parameters": {
                "attempts": {
                    "type": "int",
                    "default": 50,
                    "min": 10,
                    "max": 1000,
                    "description": "Number of authentication attempts"
                },
                "delay_ms": {
                    "type": "int",
                    "default": 100,
                    "min": 10,
                    "max": 5000,
                    "description": "Delay between attempts (milliseconds)"
                },
                "target_service": {
                    "type": "select",
                    "default": "ssh",
                    "options": ["ssh", "http", "https", "rdp"],
                    "description": "Target service to attack"
                },
                "allow_success": {
                    "type": "boolean",
                    "default": False,
                    "description": "Allow successful authentication (for testing detection)"
                }
            }
        },
        {
            "technique": "port_scan",
            "name": "Network Service Scanning",
            "description": "Scan network to discover open ports and services",
            "mitre_technique": "T1046",
            "tactic": "Discovery",
            "parameters": {
                "scan_type": {
                    "type": "select",
                    "default": "syn",
                    "options": ["syn", "connect", "udp"],
                    "description": "Type of port scan"
                },
                "target_hosts": {
                    "type": "int",
                    "default": 10,
                    "min": 1,
                    "max": 50,
                    "description": "Number of hosts to scan"
                },
                "ports": {
                    "type": "array",
                    "default": [22, 80, 443, 1883, 502],
                    "description": "Ports to scan"
                }
            }
        },
        {
            "technique": "c2_beacon",
            "name": "Application Layer Protocol",
            "description": "Establish persistent C2 communication using standard protocols",
            "mitre_technique": "T1071",
            "tactic": "Command and Control",
            "parameters": {
                "beacon_interval_seconds": {
                    "type": "int",
                    "default": 60,
                    "min": 10,
                    "max": 600,
                    "description": "Interval between beacons"
                },
                "duration_seconds": {
                    "type": "int",
                    "default": 300,
                    "min": 60,
                    "max": 3600,
                    "description": "Total duration of beaconing"
                },
                "protocol": {
                    "type": "select",
                    "default": "https",
                    "options": ["https", "http", "dns"],
                    "description": "Communication protocol"
                },
                "jitter_percent": {
                    "type": "int",
                    "default": 20,
                    "min": 0,
                    "max": 50,
                    "description": "Random variance in beacon timing (%)"
                }
            }
        },
        {
            "technique": "data_exfiltration",
            "name": "Exfiltration Over C2 Channel",
            "description": "Steal data by sending it over the existing C2 channel",
            "mitre_technique": "T1041",
            "tactic": "Exfiltration",
            "parameters": {
                "data_volume_mb": {
                    "type": "int",
                    "default": 100,
                    "min": 10,
                    "max": 1000,
                    "description": "Amount of data to exfiltrate (MB)"
                },
                "method": {
                    "type": "select",
                    "default": "https",
                    "options": ["https", "dns", "ftp"],
                    "description": "Exfiltration method"
                }
            }
        },
    ]
    specialized_ids = {t["mitre_technique"] for t in specialized}

    # Per-technique parameter definitions keyed by engine technique name
    technique_configs = {
        "active_scanning": {
            "mitre_id": "T1595", "parameters": {
                "target_hosts": {"type": "int", "default": 15, "min": 1, "max": 100, "description": "Number of hosts to probe"},
                "scan_depth": {"type": "select", "default": "standard", "options": ["passive", "standard", "aggressive"], "description": "Scanning aggressiveness level"},
                "delay_ms": {"type": "int", "default": 150, "min": 50, "max": 5000, "description": "Delay between probes (ms)"},
            }},
        "exploit_public_app": {
            "mitre_id": "T1190", "parameters": {
                "exploit_type": {"type": "select", "default": "sqli", "options": ["sqli", "xss", "rce", "lfi", "ssrf"], "description": "Exploit category to attempt"},
                "attempts": {"type": "int", "default": 30, "min": 5, "max": 200, "description": "Number of exploit attempts"},
                "target_port": {"type": "select", "default": "443", "options": ["80", "443", "8080", "8443"], "description": "Target web service port"},
            }},
        "external_remote_services": {
            "mitre_id": "T1133", "parameters": {
                "service": {"type": "select", "default": "vpn", "options": ["vpn", "rdp", "ssh", "citrix"], "description": "Remote service type"},
                "connection_attempts": {"type": "int", "default": 20, "min": 5, "max": 100, "description": "Number of connection attempts"},
                "use_stolen_creds": {"type": "boolean", "default": True, "description": "Simulate use of stolen credentials"},
            }},
        "valid_accounts": {
            "mitre_id": "T1078", "parameters": {
                "account_type": {"type": "select", "default": "domain", "options": ["local", "domain", "cloud", "default"], "description": "Type of account to abuse"},
                "login_events": {"type": "int", "default": 15, "min": 5, "max": 100, "description": "Number of authentication events"},
                "off_hours": {"type": "boolean", "default": True, "description": "Simulate access during off-hours"},
            }},
        "command_scripting": {
            "mitre_id": "T1059", "parameters": {
                "interpreter": {"type": "select", "default": "powershell", "options": ["powershell", "bash", "python", "cmd", "vbscript"], "description": "Scripting interpreter"},
                "commands": {"type": "int", "default": 25, "min": 5, "max": 200, "description": "Number of commands to execute"},
                "obfuscated": {"type": "boolean", "default": False, "description": "Use obfuscated commands"},
            }},
        "scheduled_task": {
            "mitre_id": "T1053", "parameters": {
                "task_type": {"type": "select", "default": "cron", "options": ["cron", "at", "scheduled_task", "systemd_timer"], "description": "Scheduling mechanism"},
                "persistence_events": {"type": "int", "default": 10, "min": 3, "max": 50, "description": "Number of task creation events"},
                "privileged": {"type": "boolean", "default": True, "description": "Tasks require elevated privileges"},
            }},
        "system_services": {
            "mitre_id": "T1569", "parameters": {
                "service_action": {"type": "select", "default": "create", "options": ["create", "modify", "start", "stop"], "description": "Service manipulation type"},
                "events": {"type": "int", "default": 12, "min": 3, "max": 50, "description": "Number of service events"},
                "delay_ms": {"type": "int", "default": 300, "min": 50, "max": 5000, "description": "Delay between events (ms)"},
            }},
        "boot_autostart": {
            "mitre_id": "T1547", "parameters": {
                "persistence_method": {"type": "select", "default": "registry", "options": ["registry", "startup_folder", "init_script", "boot_sector"], "description": "Autostart mechanism"},
                "entries_created": {"type": "int", "default": 8, "min": 1, "max": 30, "description": "Number of persistence entries"},
                "delay_ms": {"type": "int", "default": 500, "min": 100, "max": 5000, "description": "Delay between modifications (ms)"},
            }},
        "create_modify_process": {
            "mitre_id": "T1543", "parameters": {
                "process_type": {"type": "select", "default": "windows_service", "options": ["windows_service", "systemd", "daemon", "launch_agent"], "description": "Process/service type"},
                "events": {"type": "int", "default": 10, "min": 3, "max": 50, "description": "Number of process events"},
                "elevated": {"type": "boolean", "default": True, "description": "Requires elevated privileges"},
            }},
        "abuse_elevation": {
            "mitre_id": "T1548", "parameters": {
                "bypass_method": {"type": "select", "default": "uac_bypass", "options": ["uac_bypass", "sudo_abuse", "setuid", "dll_hijack"], "description": "Elevation bypass method"},
                "escalation_attempts": {"type": "int", "default": 15, "min": 5, "max": 100, "description": "Number of escalation attempts"},
                "delay_ms": {"type": "int", "default": 200, "min": 50, "max": 3000, "description": "Delay between attempts (ms)"},
            }},
        "process_injection": {
            "mitre_id": "T1055", "parameters": {
                "injection_method": {"type": "select", "default": "dll_injection", "options": ["dll_injection", "process_hollowing", "thread_hijacking", "apc_injection"], "description": "Injection technique"},
                "target_processes": {"type": "int", "default": 8, "min": 1, "max": 30, "description": "Number of target processes"},
                "delay_ms": {"type": "int", "default": 300, "min": 50, "max": 5000, "description": "Delay between injections (ms)"},
            }},
        "token_manipulation": {
            "mitre_id": "T1134", "parameters": {
                "token_action": {"type": "select", "default": "impersonation", "options": ["impersonation", "theft", "creation", "duplication"], "description": "Token manipulation method"},
                "events": {"type": "int", "default": 12, "min": 3, "max": 50, "description": "Number of token events"},
                "target_privilege": {"type": "select", "default": "SYSTEM", "options": ["SYSTEM", "Administrator", "Domain Admin"], "description": "Target privilege level"},
            }},
        "impair_defenses": {
            "mitre_id": "T1562", "parameters": {
                "target_defense": {"type": "select", "default": "antivirus", "options": ["antivirus", "firewall", "logging", "siem", "edr"], "description": "Security tool to impair"},
                "disable_events": {"type": "int", "default": 10, "min": 3, "max": 50, "description": "Number of impairment events"},
                "stealth": {"type": "boolean", "default": True, "description": "Attempt stealthy disabling"},
            }},
        "obfuscated_files": {
            "mitre_id": "T1027", "parameters": {
                "obfuscation_method": {"type": "select", "default": "encoding", "options": ["encoding", "encryption", "packing", "steganography"], "description": "Obfuscation method"},
                "file_events": {"type": "int", "default": 15, "min": 5, "max": 100, "description": "Number of obfuscated file events"},
                "delay_ms": {"type": "int", "default": 200, "min": 50, "max": 3000, "description": "Delay between events (ms)"},
            }},
        "indicator_removal": {
            "mitre_id": "T1070", "parameters": {
                "target_artifact": {"type": "select", "default": "event_logs", "options": ["event_logs", "bash_history", "file_timestamps", "registry_keys", "firewall_rules"], "description": "Artifact to remove"},
                "removal_events": {"type": "int", "default": 20, "min": 5, "max": 100, "description": "Number of cleanup events"},
                "delay_ms": {"type": "int", "default": 100, "min": 50, "max": 3000, "description": "Delay between removals (ms)"},
            }},
        "credential_dumping": {
            "mitre_id": "T1003", "parameters": {
                "dump_source": {"type": "select", "default": "lsass", "options": ["lsass", "sam", "ntds", "proc_memory", "shadow_file"], "description": "Credential store to dump"},
                "dump_events": {"type": "int", "default": 12, "min": 3, "max": 50, "description": "Number of dump events"},
                "use_tool": {"type": "select", "default": "mimikatz", "options": ["mimikatz", "procdump", "secretsdump", "custom"], "description": "Dumping tool used"},
            }},
        "network_sniffing": {
            "mitre_id": "T1040", "parameters": {
                "capture_interface": {"type": "select", "default": "eth0", "options": ["eth0", "wlan0", "any", "loopback"], "description": "Network interface to sniff"},
                "capture_events": {"type": "int", "default": 30, "min": 10, "max": 200, "description": "Number of captured packet events"},
                "filter_protocol": {"type": "select", "default": "all", "options": ["all", "http", "ftp", "smtp", "dns"], "description": "Protocol filter for capture"},
            }},
        "remote_services": {
            "mitre_id": "T1021", "parameters": {
                "service_type": {"type": "select", "default": "ssh", "options": ["ssh", "rdp", "smb", "winrm", "vnc"], "description": "Remote service used for lateral movement"},
                "lateral_hops": {"type": "int", "default": 5, "min": 1, "max": 20, "description": "Number of lateral movement hops"},
                "delay_ms": {"type": "int", "default": 500, "min": 100, "max": 5000, "description": "Delay between hops (ms)"},
            }},
        "lateral_tool_transfer": {
            "mitre_id": "T1570", "parameters": {
                "transfer_method": {"type": "select", "default": "smb", "options": ["smb", "scp", "http", "psexec", "wmi"], "description": "Tool transfer method"},
                "tools_transferred": {"type": "int", "default": 8, "min": 1, "max": 30, "description": "Number of tools transferred"},
                "tool_size_mb": {"type": "int", "default": 5, "min": 1, "max": 100, "description": "Average tool size (MB)"},
            }},
        "input_capture": {
            "mitre_id": "T1056", "parameters": {
                "capture_method": {"type": "select", "default": "keylogger", "options": ["keylogger", "credential_api_hook", "web_portal_capture", "gui_input_capture"], "description": "Input capture method"},
                "capture_events": {"type": "int", "default": 25, "min": 5, "max": 200, "description": "Number of captured input events"},
                "delay_ms": {"type": "int", "default": 150, "min": 50, "max": 3000, "description": "Delay between captures (ms)"},
            }},
        "screen_capture": {
            "mitre_id": "T1113", "parameters": {
                "screenshots": {"type": "int", "default": 10, "min": 1, "max": 50, "description": "Number of screenshots taken"},
                "interval_seconds": {"type": "int", "default": 30, "min": 5, "max": 300, "description": "Interval between captures (seconds)"},
                "exfiltrate": {"type": "boolean", "default": True, "description": "Exfiltrate captured screenshots"},
            }},
        "archive_data": {
            "mitre_id": "T1560", "parameters": {
                "archive_format": {"type": "select", "default": "zip", "options": ["zip", "tar", "7z", "rar"], "description": "Archive format"},
                "data_volume_mb": {"type": "int", "default": 50, "min": 5, "max": 500, "description": "Volume of data archived (MB)"},
                "encrypted": {"type": "boolean", "default": True, "description": "Encrypt the archive"},
            }},
        "app_layer_protocol": {
            "mitre_id": "T1071", "parameters": {
                "protocol": {"type": "select", "default": "https", "options": ["https", "dns", "smtp", "websocket"], "description": "Application protocol for C2"},
                "beacon_count": {"type": "int", "default": 20, "min": 5, "max": 100, "description": "Number of C2 communications"},
                "delay_ms": {"type": "int", "default": 500, "min": 100, "max": 10000, "description": "Interval between beacons (ms)"},
            }},
        "ingress_tool_transfer": {
            "mitre_id": "T1105", "parameters": {
                "download_method": {"type": "select", "default": "https", "options": ["https", "ftp", "smb", "dns_tunnel", "certutil"], "description": "Tool download method"},
                "tools_downloaded": {"type": "int", "default": 5, "min": 1, "max": 20, "description": "Number of tools to download"},
                "tool_size_mb": {"type": "int", "default": 10, "min": 1, "max": 100, "description": "Average tool size (MB)"},
            }},
        "network_dos": {
            "mitre_id": "T1498", "parameters": {
                "attack_type": {"type": "select", "default": "syn_flood", "options": ["syn_flood", "udp_flood", "icmp_flood", "amplification"], "description": "DoS attack type"},
                "packets_per_second": {"type": "int", "default": 50, "min": 10, "max": 500, "description": "Simulated packet rate"},
                "duration_events": {"type": "int", "default": 40, "min": 10, "max": 200, "description": "Number of flood events"},
            }},
        "endpoint_dos": {
            "mitre_id": "T1499", "parameters": {
                "exhaustion_type": {"type": "select", "default": "cpu", "options": ["cpu", "memory", "disk", "process_table"], "description": "Resource to exhaust"},
                "intensity_events": {"type": "int", "default": 30, "min": 10, "max": 200, "description": "Number of exhaustion events"},
                "delay_ms": {"type": "int", "default": 100, "min": 50, "max": 3000, "description": "Delay between events (ms)"},
            }},
        "data_encrypted_impact": {
            "mitre_id": "T1486", "parameters": {
                "encryption_algorithm": {"type": "select", "default": "aes256", "options": ["aes256", "rsa2048", "chacha20", "xor"], "description": "Encryption algorithm used"},
                "files_encrypted": {"type": "int", "default": 50, "min": 10, "max": 500, "description": "Number of files encrypted"},
                "ransom_note": {"type": "boolean", "default": True, "description": "Deploy ransom note after encryption"},
            }},
        "data_manipulation": {
            "mitre_id": "T1565", "parameters": {
                "manipulation_type": {"type": "select", "default": "stored_data", "options": ["stored_data", "transmitted_data", "runtime_data"], "description": "Type of data to manipulate"},
                "records_modified": {"type": "int", "default": 25, "min": 5, "max": 200, "description": "Number of records to modify"},
                "delay_ms": {"type": "int", "default": 200, "min": 50, "max": 3000, "description": "Delay between modifications (ms)"},
            }},
    }

    # Load MITRE techniques from JSON
    import json
    from pathlib import Path
    data_file = Path(__file__).parent.parent / "data" / "mitre_techniques.json"
    try:
        mitre_data = json.loads(data_file.read_text())
    except Exception:
        mitre_data = []

    generic = []
    for tech in mitre_data:
        if tech["id"] in specialized_ids:
            continue
        # Find config by mitre_id
        config = None
        for key, cfg in technique_configs.items():
            if cfg["mitre_id"] == tech["id"]:
                config = (key, cfg)
                break
        if not config:
            continue
        key, cfg = config
        generic.append({
            "technique": key,
            "name": tech["name"],
            "description": tech["description"],
            "mitre_technique": tech["id"],
            "tactic": tech.get("tactic", "Execution"),
            "parameters": cfg["parameters"],
        })

    return specialized + generic


# Scenario Runs (must come before /{scenario_id} to avoid route conflicts)
@router.post("/runs", response_model=ScenarioRun)
async def create_scenario_run(
    run: ScenarioRunCreate,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(require_researcher_or_admin)
):
    """Create a new scenario run and launch background execution."""
    scenario = ScenarioService.get_scenario(run.scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")

    scenario_run = ScenarioService.create_run(run, current_user["username"], scenario)

    # Launch background execution
    background_tasks.add_task(_run_simulation, scenario_run.run_id, scenario)

    return scenario_run


async def _run_simulation(run_id: str, scenario: Scenario):
    """Wrapper to run the async simulation in the background."""
    await simulate_scenario_execution(run_id, scenario)


@router.get("/runs", response_model=List[ScenarioRun])
async def list_scenario_runs(
    scenario_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """List scenario runs, optionally filtered by scenario_id."""
    return ScenarioService.list_runs(scenario_id=scenario_id)


@router.get("/runs/{run_id}", response_model=ScenarioRun)
async def get_scenario_run(
    run_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a scenario run by ID."""
    run = ScenarioService.get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Scenario run not found")
    return run


@router.get("/runs/{run_id}/stages")
async def get_scenario_run_stages(
    run_id: str,
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get real-time stage data + target info for a scenario run."""
    doc = ScenarioService.get_run_raw(run_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Scenario run not found")

    return {
        "run_id": doc.get("run_id"),
        "status": doc.get("status"),
        "target_device_id": doc.get("target_device_id"),
        "target_component_id": doc.get("target_component_id"),
        "stages": doc.get("stages", []),
    }


@router.post("/custom", response_model=ScenarioRun)
async def execute_custom_scenario(
    custom_scenario: CustomScenarioCreate,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(require_researcher_or_admin)
):
    """Execute a fully custom attack scenario with researcher-defined parameters."""
    import uuid
    from datetime import datetime
    from ..services.attack_engine import AttackExecutionEngine

    from ..db.opensearch_client import opensearch_client

    run_id = f"custom-{uuid.uuid4().hex[:12]}"
    scenario_id = f"custom-{uuid.uuid4().hex[:8]}"

    # Persist as a reusable scenario so MITRE technique IDs survive reload
    scenario_doc = {
        "scenario_id": scenario_id,
        "name": custom_scenario.name,
        "description": custom_scenario.description,
        "components": [custom_scenario.target_component],
        "duration_seconds": custom_scenario.duration_seconds or len(custom_scenario.attack_chain) * 30,
        "attack_pattern": custom_scenario.attack_chain[0].technique.replace("_", " ").title() if custom_scenario.attack_chain else "Custom",
        "parameters": {},
        "category": "custom",
        "mitre_technique_ids": custom_scenario.mitre_technique_ids,
        "created_at": datetime.utcnow().isoformat(),
        "created_by": current_user["username"],
    }
    opensearch_client.index_document("scenarios", scenario_doc, doc_id=scenario_id)

    # Create a scenario run document
    run_doc = {
        "run_id": run_id,
        "scenario_id": scenario_id,
        "status": "pending",
        "started_at": datetime.utcnow().isoformat(),
        "started_by": current_user["username"],
        "completed_at": None,
        "results": None,
        "target_device_id": custom_scenario.target_device_id,
        "custom_scenario_name": custom_scenario.name,
        "custom_scenario_description": custom_scenario.description,
        "attack_chain": [config.dict() for config in custom_scenario.attack_chain],
        "stages": [
            {
                "name": f"{config.technique.replace('_', ' ').title()}",
                "description": f"Execute {config.technique} attack",
                "status": "pending"
            }
            for config in custom_scenario.attack_chain
        ]
    }

    # Save to OpenSearch
    opensearch_client.index_document("scenario_runs", run_doc, doc_id=run_id)

    # Execute in background
    async def execute_custom_attack():
        try:
            ScenarioService.update_run_status(run_id, "running")

            # Create attack engine
            engine = AttackExecutionEngine(run_id, {
                'target_device': custom_scenario.target_device_id,
                'component': custom_scenario.target_component
            })

            # Build MITRE metadata lookup for generic techniques
            import json
            from pathlib import Path
            mitre_lookup = {}
            key_to_mitre = {
                "active_scanning": "T1595", "exploit_public_app": "T1190",
                "external_remote_services": "T1133", "valid_accounts": "T1078",
                "command_scripting": "T1059", "scheduled_task": "T1053",
                "system_services": "T1569", "boot_autostart": "T1547",
                "create_modify_process": "T1543", "abuse_elevation": "T1548",
                "process_injection": "T1055", "token_manipulation": "T1134",
                "impair_defenses": "T1562", "obfuscated_files": "T1027",
                "indicator_removal": "T1070", "credential_dumping": "T1003",
                "network_sniffing": "T1040", "remote_services": "T1021",
                "lateral_tool_transfer": "T1570", "input_capture": "T1056",
                "screen_capture": "T1113", "archive_data": "T1560",
                "app_layer_protocol": "T1071", "ingress_tool_transfer": "T1105",
                "network_dos": "T1498", "endpoint_dos": "T1499",
                "data_encrypted_impact": "T1486", "data_manipulation": "T1565",
            }
            try:
                data_file = Path(__file__).parent.parent / "data" / "mitre_techniques.json"
                for t in json.loads(data_file.read_text()):
                    mitre_lookup[t["id"]] = t
            except Exception:
                pass

            # Build attack chain from configurations
            attack_techniques = []
            for config in custom_scenario.attack_chain:
                tech_config = {
                    'technique': config.technique,
                    **config.parameters,
                    'target_device': custom_scenario.target_device_id,
                    'component': custom_scenario.target_component
                }
                # Enrich generic techniques with MITRE metadata
                mitre_id = key_to_mitre.get(config.technique)
                if mitre_id and mitre_id in mitre_lookup:
                    tech_config['mitre_id'] = mitre_id
                    tech_config['technique_name'] = mitre_lookup[mitre_id]['name']
                    tech_config['tactic'] = mitre_lookup[mitre_id].get('tactic', 'Execution')
                attack_techniques.append(tech_config)

            # Execute attack chain
            results = await engine.execute_attack_chain(attack_techniques)

            # Update with results
            ScenarioService.update_run_status(run_id, "completed", results)

        except Exception as e:
            import logging
            logging.error(f"Custom scenario execution error for run {run_id}: {e}")
            ScenarioService.update_run_status(run_id, "failed", {"error": str(e)})

    background_tasks.add_task(execute_custom_attack)

    return ScenarioRun(**run_doc)


# Scenario CRUD Operations (must come after specific routes to avoid conflicts)
@router.get("/{scenario_id}", response_model=Scenario)
async def get_scenario(
    scenario_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a scenario by ID."""
    scenario = ScenarioService.get_scenario(scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return scenario


@router.put("/{scenario_id}", response_model=Scenario)
async def update_scenario(
    scenario_id: str,
    updates: ScenarioUpdate,
    current_user: dict = Depends(require_researcher_or_admin)
):
    """Update a scenario (Researcher or Admin)."""
    scenario = ScenarioService.update_scenario(scenario_id, updates)
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return scenario


@router.delete("/{scenario_id}")
async def delete_scenario(
    scenario_id: str,
    current_user: dict = Depends(require_researcher_or_admin)
):
    """Delete a scenario (Researcher or Admin)."""
    success = ScenarioService.delete_scenario(scenario_id)
    if not success:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return {"message": "Scenario deleted successfully"}
