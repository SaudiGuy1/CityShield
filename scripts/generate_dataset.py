#!/usr/bin/env python3
"""Generate labeled dataset for evaluation."""
import os
import sys
import json
import time
import requests
from datetime import datetime
from opensearchpy import OpenSearch, RequestsHttpConnection

# Configuration
OPENSEARCH_URL = os.getenv("OPENSEARCH_URL", "http://localhost:9200")
OPENSEARCH_USER = os.getenv("OPENSEARCH_USER", "admin")
OPENSEARCH_PASS = os.getenv("OPENSEARCH_PASS", "Admin@123!Change")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
OUTPUT_FILE = "data/datasets/labeled_events.jsonl"


def login():
    """Login to backend and get token."""
    response = requests.post(
        f"{BACKEND_URL}/api/auth/login",
        json={
            "username": os.getenv("DEFAULT_ADMIN_USER", "admin"),
            "password": os.getenv("DEFAULT_ADMIN_PASS", "CityShield@Admin2026")
        }
    )
    if response.status_code == 200:
        return response.json()["access_token"]
    else:
        raise Exception(f"Login failed: {response.text}")


def run_scenario(token, scenario_id):
    """Run a scenario and return run_id."""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(
        f"{BACKEND_URL}/api/scenarios/runs",
        headers=headers,
        json={"scenario_id": scenario_id}
    )
    if response.status_code == 200:
        return response.json()["run_id"]
    else:
        raise Exception(f"Failed to start scenario: {response.text}")


def wait_for_scenario(token, run_id, timeout=300):
    """Wait for scenario to complete."""
    headers = {"Authorization": f"Bearer {token}"}
    start_time = time.time()

    while time.time() - start_time < timeout:
        response = requests.get(
            f"{BACKEND_URL}/api/scenarios/runs/{run_id}",
            headers=headers
        )
        if response.status_code == 200:
            run = response.json()
            status = run["status"]
            if status in ["completed", "failed"]:
                return status
        time.sleep(5)

    raise Exception(f"Scenario run {run_id} timed out")


def export_logs(client, output_file):
    """Export all logs with is_attack label to file."""
    query = {
        "query": {"match_all": {}},
        "size": 10000,
        "sort": [{"@timestamp": {"order": "asc"}}]
    }

    result = client.search(index="logs-*", body=query)
    hits = result["hits"]["hits"]

    print(f"Exporting {len(hits)} events to {output_file}...")

    with open(output_file, "w") as f:
        for hit in hits:
            source = hit["_source"]
            # Ensure is_attack label exists
            if "metadata" not in source:
                source["metadata"] = {}
            if "is_attack" not in source["metadata"]:
                source["metadata"]["is_attack"] = False

            f.write(json.dumps(source) + "\n")

    print(f"✓ Exported {len(hits)} events")


def main():
    """Generate labeled dataset."""
    print("CityShield - Generate Labeled Dataset")
    print("=" * 50)
    print()

    # Connect to OpenSearch
    print(f"Connecting to OpenSearch at {OPENSEARCH_URL}")
    client = OpenSearch(
        hosts=[OPENSEARCH_URL],
        http_auth=(OPENSEARCH_USER, OPENSEARCH_PASS),
        use_ssl=False,
        verify_certs=False,
        connection_class=RequestsHttpConnection
    )

    health = client.cluster.health()
    print(f"✓ Connected (status: {health['status']})")
    print()

    # Login to backend
    print(f"Logging in to backend at {BACKEND_URL}")
    try:
        token = login()
        print("✓ Authenticated")
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

    print()

    # Run scenarios to generate labeled data
    scenarios = [
        "traffic_scan_001",
        "iot_burst_001"
    ]

    print("Running scenarios to generate labeled data...")
    print("This will take several minutes...")
    print()

    for scenario_id in scenarios:
        print(f"Running scenario: {scenario_id}")
        try:
            run_id = run_scenario(token, scenario_id)
            print(f"  Run ID: {run_id}")
            print(f"  Waiting for completion...")

            status = wait_for_scenario(token, run_id)
            print(f"  Status: {status}")

        except Exception as e:
            print(f"  Error: {e}")

        print()

    # Wait a bit for logs to be ingested
    print("Waiting for logs to be fully ingested...")
    time.sleep(30)

    # Export logs
    print()
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    export_logs(client, OUTPUT_FILE)

    print()
    print("=" * 50)
    print("✓ Dataset generation complete!")
    print(f"Labeled events saved to: {OUTPUT_FILE}")
    print()
    print("You can now use this dataset to compute evaluation metrics.")
    print()


if __name__ == "__main__":
    main()
