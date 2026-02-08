"""Scenario management routes."""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from ..models.scenario import Scenario, ScenarioCreate, ScenarioUpdate, ScenarioRun, ScenarioRunCreate
from ..core.rbac import require_researcher_or_admin
from ..core.security import get_current_user
from ..services.scenario_service import ScenarioService

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


# Scenario Runs
@router.post("/runs", response_model=ScenarioRun)
async def create_scenario_run(
    run: ScenarioRunCreate,
    current_user: dict = Depends(require_researcher_or_admin)
):
    """Create a new scenario run (Researcher or Admin)."""
    # Check if scenario exists
    scenario = ScenarioService.get_scenario(run.scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")

    return ScenarioService.create_run(run, current_user["username"])


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
