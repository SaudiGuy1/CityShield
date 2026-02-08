#!/usr/bin/env python3
"""Run a scenario via the CityShield API."""
import os
import sys
import time
import requests
import argparse

# Configuration
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
DEFAULT_USERNAME = os.getenv("DEFAULT_ADMIN_USER", "admin")
DEFAULT_PASSWORD = os.getenv("DEFAULT_ADMIN_PASS", "CityShield@Admin2026")


def login(username, password):
    """Login and get authentication token."""
    response = requests.post(
        f"{BACKEND_URL}/api/auth/login",
        json={"username": username, "password": password}
    )
    if response.status_code == 200:
        return response.json()["access_token"]
    else:
        raise Exception(f"Login failed: {response.text}")


def list_scenarios(token):
    """List available scenarios."""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BACKEND_URL}/api/scenarios", headers=headers)
    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(f"Failed to list scenarios: {response.text}")


def run_scenario(token, scenario_id):
    """Run a scenario."""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(
        f"{BACKEND_URL}/api/scenarios/runs",
        headers=headers,
        json={"scenario_id": scenario_id}
    )
    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(f"Failed to start scenario: {response.text}")


def get_run_status(token, run_id):
    """Get scenario run status."""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(
        f"{BACKEND_URL}/api/scenarios/runs/{run_id}",
        headers=headers
    )
    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(f"Failed to get run status: {response.text}")


def wait_for_completion(token, run_id, poll_interval=5, timeout=600):
    """Wait for scenario run to complete."""
    start_time = time.time()
    while time.time() - start_time < timeout:
        run = get_run_status(token, run_id)
        status = run["status"]

        if status in ["completed", "failed"]:
            return run

        print(f"  Status: {status} (waiting...)")
        time.sleep(poll_interval)

    raise Exception(f"Scenario run timed out after {timeout} seconds")


def main():
    """Main function."""
    parser = argparse.ArgumentParser(description="Run a CityShield scenario")
    parser.add_argument("scenario_id", nargs="?", help="Scenario ID to run")
    parser.add_argument("--list", action="store_true", help="List available scenarios")
    parser.add_argument("--username", default=DEFAULT_USERNAME, help="Username")
    parser.add_argument("--password", default=DEFAULT_PASSWORD, help="Password")
    parser.add_argument("--wait", action="store_true", help="Wait for scenario to complete")

    args = parser.parse_args()

    print("CityShield - Run Scenario")
    print("=" * 50)
    print()

    # Login
    print(f"Logging in to {BACKEND_URL}...")
    try:
        token = login(args.username, args.password)
        print("✓ Authenticated")
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

    print()

    # List scenarios
    if args.list:
        print("Available scenarios:")
        try:
            scenarios = list_scenarios(token)
            for scenario in scenarios:
                print(f"  - {scenario['scenario_id']}: {scenario['name']}")
                print(f"    {scenario['description']}")
                print()
        except Exception as e:
            print(f"❌ Error: {e}")
            sys.exit(1)
        return

    # Run scenario
    if not args.scenario_id:
        print("❌ Error: Please provide a scenario_id or use --list")
        sys.exit(1)

    print(f"Starting scenario: {args.scenario_id}")
    try:
        run = run_scenario(token, args.scenario_id)
        run_id = run["run_id"]
        print(f"✓ Scenario run started")
        print(f"  Run ID: {run_id}")
        print(f"  Status: {run['status']}")
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

    if args.wait:
        print()
        print("Waiting for scenario to complete...")
        try:
            final_run = wait_for_completion(token, run_id)
            print()
            print(f"✓ Scenario completed")
            print(f"  Status: {final_run['status']}")
            if final_run.get("results"):
                print(f"  Duration: {final_run['results'].get('duration_seconds', 0):.2f} seconds")
        except Exception as e:
            print(f"❌ Error: {e}")
            sys.exit(1)

    print()


if __name__ == "__main__":
    main()
