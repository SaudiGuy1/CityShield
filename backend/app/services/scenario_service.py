"""Scenario management service."""
from typing import List, Optional
from datetime import datetime
import uuid
from ..db.opensearch_client import opensearch_client
from ..models.scenario import Scenario, ScenarioCreate, ScenarioUpdate, ScenarioRun, ScenarioRunCreate


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
    def create_run(run: ScenarioRunCreate, username: str) -> ScenarioRun:
        """Create a new scenario run."""
        run_id = str(uuid.uuid4())
        now = datetime.utcnow()
        run_doc = {
            "run_id": run_id,
            "scenario_id": run.scenario_id,
            "status": "pending",
            "started_at": now.isoformat(),
            "started_by": username,
            "completed_at": None,
            "results": None
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
        updates = {"status": status}
        if status in ["completed", "failed"]:
            updates["completed_at"] = datetime.utcnow().isoformat()
        if results:
            updates["results"] = results
        opensearch_client.update_document(ScenarioService.RUN_INDEX, run_id, updates)
        return ScenarioService.get_run(run_id)
