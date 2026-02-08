"""Scenario runner main application."""
import os
import time
import json
import logging
from pathlib import Path
from opensearchpy import OpenSearch, RequestsHttpConnection

from runner import ScenarioRunner

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuration
OPENSEARCH_URL = os.getenv("OPENSEARCH_URL", "http://opensearch:9200")
OPENSEARCH_USER = os.getenv("OPENSEARCH_USER", "admin")
OPENSEARCH_PASS = os.getenv("OPENSEARCH_PASS", "admin")
POLL_INTERVAL = int(os.getenv("SCENARIO_POLL_INTERVAL_SECONDS", "5"))

# Simulator URLs
SIMULATOR_URLS = {
    "traffic_sim": os.getenv("TRAFFIC_SIM_URL", "http://traffic_sim:8001"),
    "iot_sim": os.getenv("IOT_SIM_URL", "http://iot_sim:8002"),
    "network_emulator": os.getenv("NETWORK_EMULATOR_URL", "http://network_emulator:8003")
}


def load_builtin_scenarios() -> list:
    """Load built-in scenario definitions."""
    scenarios = []
    scenarios_dir = Path("scenarios")

    if not scenarios_dir.exists():
        logger.warning("Scenarios directory not found")
        return scenarios

    for scenario_file in scenarios_dir.glob("*.json"):
        try:
            with open(scenario_file, "r") as f:
                scenario = json.load(f)
                scenarios.append(scenario)
                logger.info(f"Loaded scenario: {scenario['scenario_id']} - {scenario['name']}")
        except Exception as e:
            logger.error(f"Error loading scenario {scenario_file}: {e}")

    return scenarios


def get_pending_scenario_runs(client: OpenSearch) -> list:
    """Get scenario runs with status 'pending'."""
    query = {
        "query": {
            "term": {"status": "pending"}
        },
        "size": 10,
        "sort": [{"started_at": {"order": "asc"}}]
    }

    try:
        result = client.search(index="scenario_runs", body=query)
        runs = [hit["_source"] for hit in result["hits"]["hits"]]
        return runs
    except Exception as e:
        logger.error(f"Error querying pending scenario runs: {e}")
        return []


def get_scenario_definition(client: OpenSearch, scenario_id: str, builtin_scenarios: list) -> dict:
    """Get scenario definition from OpenSearch or built-in scenarios."""
    # First try OpenSearch
    try:
        result = client.get(index="scenarios", id=scenario_id)
        return result["_source"]
    except Exception:
        pass

    # Fall back to built-in scenarios
    for scenario in builtin_scenarios:
        if scenario["scenario_id"] == scenario_id:
            return scenario

    return None


def update_scenario_run(client: OpenSearch, run_id: str, updates: dict):
    """Update scenario run status and results."""
    try:
        client.update(
            index="scenario_runs",
            id=run_id,
            body={"doc": updates},
            refresh=True
        )
        logger.info(f"Updated scenario run {run_id}")
    except Exception as e:
        logger.error(f"Error updating scenario run {run_id}: {e}")


def main():
    """Main scenario runner loop."""
    logger.info("Starting CityShield Scenario Runner...")

    # Connect to OpenSearch
    logger.info(f"Connecting to OpenSearch at {OPENSEARCH_URL}")
    client = OpenSearch(
        hosts=[OPENSEARCH_URL],
        http_auth=(OPENSEARCH_USER, OPENSEARCH_PASS),
        use_ssl=False,
        verify_certs=False,
        connection_class=RequestsHttpConnection,
        timeout=30
    )

    # Wait for OpenSearch to be ready
    max_retries = 30
    for i in range(max_retries):
        try:
            health = client.cluster.health()
            logger.info(f"OpenSearch cluster health: {health['status']}")
            break
        except Exception as e:
            if i < max_retries - 1:
                logger.warning(f"Waiting for OpenSearch to be ready... ({i+1}/{max_retries})")
                time.sleep(2)
            else:
                logger.error("Failed to connect to OpenSearch")
                raise

    # Load built-in scenarios
    builtin_scenarios = load_builtin_scenarios()

    # Initialize scenario runner
    runner = ScenarioRunner(SIMULATOR_URLS)

    # Check simulator health
    logger.info("Checking simulator health...")
    health_status = runner.health_check_simulators()
    for service, healthy in health_status.items():
        status_str = "healthy" if healthy else "unhealthy"
        logger.info(f"  {service}: {status_str}")

    logger.info(f"Scenario runner started")
    logger.info(f"Poll interval: {POLL_INTERVAL} seconds")

    # Main execution loop
    while True:
        try:
            logger.debug("Checking for pending scenario runs...")

            pending_runs = get_pending_scenario_runs(client)

            if pending_runs:
                logger.info(f"Found {len(pending_runs)} pending scenario runs")

                for run in pending_runs:
                    run_id = run["run_id"]
                    scenario_id = run["scenario_id"]

                    # Update status to running
                    update_scenario_run(client, run_id, {"status": "running"})

                    # Get scenario definition
                    scenario = get_scenario_definition(client, scenario_id, builtin_scenarios)

                    if not scenario:
                        logger.error(f"Scenario {scenario_id} not found")
                        update_scenario_run(client, run_id, {
                            "status": "failed",
                            "results": {"error": "Scenario definition not found"}
                        })
                        continue

                    # Execute scenario
                    logger.info(f"Executing scenario {scenario['name']} (run {run_id})")
                    results = runner.run_scenario(scenario)

                    # Update run with results
                    update_scenario_run(client, run_id, {
                        "status": results["status"],
                        "results": results,
                        "completed_at": results.get("completed_at")
                    })

            else:
                logger.debug("No pending scenario runs found")

            # Sleep until next poll
            time.sleep(POLL_INTERVAL)

        except KeyboardInterrupt:
            logger.info("Scenario runner shutting down...")
            break
        except Exception as e:
            logger.error(f"Error in scenario runner loop: {e}")
            time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
