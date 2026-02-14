"""Scenario management routes."""
import asyncio
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import List, Optional, Dict, Any
from ..models.scenario import Scenario, ScenarioCreate, ScenarioUpdate, ScenarioRun, ScenarioRunCreate, CustomScenarioCreate, AttackConfiguration
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
    """Get list of available attack techniques with their configurable parameters."""
    return [
        {
            "technique": "brute_force",
            "name": "Brute Force Authentication",
            "description": "Attempt to gain access through credential guessing",
            "mitre_technique": "T1110",
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
            "name": "Network Port Scanning",
            "description": "Scan network to discover open ports and services",
            "mitre_technique": "T1046",
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
            "name": "Command & Control Beaconing",
            "description": "Establish persistent communication with C2 server",
            "mitre_technique": "T1071",
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
            "name": "Data Exfiltration",
            "description": "Transfer sensitive data to external server",
            "mitre_technique": "T1041",
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
        }
    ]


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

    run_id = f"custom-{uuid.uuid4().hex[:12]}"

    # Create a scenario run document
    run_doc = {
        "run_id": run_id,
        "scenario_id": "custom",
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
    from ..db.opensearch_client import opensearch_client
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

            # Build attack chain from configurations
            attack_techniques = []
            for config in custom_scenario.attack_chain:
                tech_config = {
                    'technique': config.technique,
                    **config.parameters,
                    'target_device': custom_scenario.target_device_id,
                    'component': custom_scenario.target_component
                }
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
