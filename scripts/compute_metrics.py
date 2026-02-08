#!/usr/bin/env python3
"""Compute evaluation metrics for CityShield."""
import os
import sys
import requests
import json
from datetime import datetime

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


def get_metrics(token):
    """Get all evaluation metrics."""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BACKEND_URL}/api/metrics", headers=headers)
    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(f"Failed to get metrics: {response.text}")


def format_time(seconds):
    """Format seconds into human-readable time."""
    if seconds < 60:
        return f"{seconds:.2f} seconds"
    elif seconds < 3600:
        minutes = seconds / 60
        return f"{minutes:.2f} minutes"
    else:
        hours = seconds / 3600
        return f"{hours:.2f} hours"


def print_metrics(metrics):
    """Print metrics in a formatted way."""
    print("=" * 70)
    print("CITYSHIELD EVALUATION METRICS")
    print("=" * 70)
    print()

    # MTTD
    mttd = metrics.get("mttd_seconds", 0)
    print("Mean Time To Detect (MTTD)")
    print(f"  {format_time(mttd)}")
    print()

    # MTTR
    mttr = metrics.get("mttr_seconds", 0)
    print("Mean Time To Respond (MTTR)")
    print(f"  {format_time(mttr)}")
    print()

    # Detection Accuracy
    accuracy = metrics.get("detection_accuracy", {})
    print("Detection Accuracy")
    print(f"  Detection Rate:       {accuracy.get('detection_rate', 0) * 100:.2f}%")
    print(f"  False Positive Rate:  {accuracy.get('false_positive_rate', 0) * 100:.2f}%")
    print(f"  Overall Accuracy:     {accuracy.get('accuracy', 0) * 100:.2f}%")
    print()
    print(f"  Total Attacks:        {accuracy.get('total_attacks', 0)}")
    print(f"  Total Normal Events:  {accuracy.get('total_normal', 0)}")
    print(f"  Total Alerts:         {accuracy.get('total_alerts', 0)}")
    print(f"  True Positives:       {accuracy.get('true_positives', 0)}")
    print(f"  False Positives:      {accuracy.get('false_positives', 0)}")
    print(f"  False Negatives:      {accuracy.get('false_negatives', 0)}")
    print()

    # Resource Utilization
    resources = metrics.get("resource_utilization", {})
    print("Resource Utilization")
    print(f"  Cluster Status:       {resources.get('status', 'unknown')}")
    print(f"  Indices Count:        {resources.get('indices_count', 0)}")
    print(f"  Documents Count:      {resources.get('docs_count', 0)}")
    store_mb = resources.get('store_size_bytes', 0) / (1024 * 1024)
    print(f"  Storage Size:         {store_mb:.2f} MB")
    memory_mb = resources.get('memory_used_bytes', 0) / (1024 * 1024)
    print(f"  Memory Used:          {memory_mb:.2f} MB")
    print()

    # Ingestion Rate
    ingestion = metrics.get("ingestion_rate", {})
    print("Log Ingestion Rate")
    print(f"  Time Window:          {ingestion.get('time_window_minutes', 0)} minutes")
    print(f"  Total Events:         {ingestion.get('total_events', 0)}")
    print(f"  Events/Minute:        {ingestion.get('events_per_minute', 0):.2f}")
    print()
    print("  By Component:")
    by_component = ingestion.get('by_component', {})
    for component, count in sorted(by_component.items(), key=lambda x: x[1], reverse=True):
        print(f"    {component:20s}  {count}")
    print()

    print("=" * 70)
    print(f"Computed at: {metrics.get('computed_at', 'unknown')}")
    print("=" * 70)
    print()


def main():
    """Main function."""
    print("CityShield - Compute Metrics")
    print()

    # Login
    print(f"Connecting to {BACKEND_URL}...")
    try:
        token = login(DEFAULT_USERNAME, DEFAULT_PASSWORD)
        print("✓ Authenticated")
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

    print()

    # Get metrics
    print("Computing metrics...")
    try:
        metrics = get_metrics(token)
        print("✓ Metrics retrieved")
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

    print()

    # Print metrics
    print_metrics(metrics)

    # Save to file
    output_file = "metrics_report.json"
    with open(output_file, "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"✓ Metrics also saved to {output_file}")
    print()


if __name__ == "__main__":
    main()
