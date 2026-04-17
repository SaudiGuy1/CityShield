#!/usr/bin/env python3
"""
Supplementary injection for rules that weren't triggered by the first injection.
Targets specific event_types and group_by fields for each untriggered rule.
"""

import json
import random
import uuid
import requests
from datetime import datetime, timezone, timedelta

OPENSEARCH_URL = "http://localhost:9200"

def os_request(method, path, data=None):
    url = f"{OPENSEARCH_URL}{path}"
    headers = {"Content-Type": "application/json"}
    kwargs = {"headers": headers, "timeout": 10}
    if data:
        kwargs["json"] = data
    try:
        resp = getattr(requests, method)(url, **kwargs)
        if resp.status_code in (200, 201):
            return resp.json()
    except:
        pass
    return None

def bulk_index(index, events):
    if not events:
        return 0
    lines = []
    for e in events:
        lines.append(json.dumps({"index": {"_index": index}}))
        lines.append(json.dumps(e))
    body = "\n".join(lines) + "\n"
    url = f"{OPENSEARCH_URL}/_bulk"
    try:
        resp = requests.post(url, data=body, headers={"Content-Type": "application/x-ndjson"}, timeout=30)
        if resp.status_code == 200:
            return len(events)
    except:
        pass
    return 0

def ts(offset_seconds=0):
    return (datetime.now(timezone.utc) - timedelta(seconds=offset_seconds)).isoformat()

def base_event(event_type, component="network", **kwargs):
    e = {
        "@timestamp": ts(random.randint(5, 120)),
        "event_type": event_type,
        "component": component,
        "city_zone": random.choice(["zone-A", "zone-B", "zone-C", "zone-D"]),
        "correlation_id": f"eval-supp-{uuid.uuid4().hex[:8]}",
    }
    e.update(kwargs)
    return e

# ========== RULES THAT NEED EVENTS ==========

events_network = []
events_iot = []
events_traffic = []

# 1. account_manipulation_001: event_threshold, ['account_modify', 'permission_change'], group_by: user_id, threshold: 3
for i in range(5):
    for et in ["account_modify", "permission_change"]:
        events_network.append(base_event(et, src_ip=f"10.0.7.{10+i}", user_id="compromised_admin_01"))
    events_network.append(base_event("account_modify", src_ip=f"10.0.7.{10+i}", user_id="compromised_admin_02"))

# 2. automated_collection_001: ['automated_scraping', 'bulk_data_access'], group_by: src_ip, threshold: 10
for _ in range(12):
    events_network.append(base_event(random.choice(["automated_scraping", "bulk_data_access"]),
                                     src_ip="10.0.8.50", dst_ip="10.0.1.5"))

# 3. clipboard_data_001: ['clipboard_access', 'clipboard_monitor'], group_by: host_id, threshold: 5
for _ in range(6):
    events_network.append(base_event(random.choice(["clipboard_access", "clipboard_monitor"]),
                                     host_id="HOST-WS-042", src_ip="10.0.3.42"))

# 4. cloud_api_abuse_001: ['cloud_api_abuse', 'api_key_misuse'], group_by: src_ip, threshold: 10
for _ in range(12):
    events_network.append(base_event(random.choice(["cloud_api_abuse", "api_key_misuse"]),
                                     src_ip="10.0.9.88", dst_ip="172.16.0.10"))

# 5. data_destruction_001: ['data_wipe', 'mass_deletion'], group_by: host_id, threshold: 2
for _ in range(4):
    events_network.append(base_event(random.choice(["data_wipe", "mass_deletion"]),
                                     host_id="HOST-DB-001", src_ip="10.0.4.20"))

# 6. defense_evasion_001 (defense_evasion type): ['service_stop', 'service_disabled', ...], group_by: asset_id, threshold: 2
for et in ["service_stop", "service_disabled", "registry_modification", "firewall_modification"]:
    events_network.append(base_event(et, asset_id="ASSET-WS-015", src_ip="10.0.2.15"))

# 7. dll_side_loading_001: ['dll_side_load', 'suspicious_dll'], group_by: host_id, threshold: 2
for _ in range(3):
    events_network.append(base_event(random.choice(["dll_side_load", "suspicious_dll"]),
                                     host_id="HOST-WS-019", src_ip="10.0.3.19"))

# 8. dos_endpoint_001: ['resource_exhaustion', 'service_overload', ...], group_by: asset_id, threshold: 50
for _ in range(55):
    events_network.append(base_event(
        random.choice(["resource_exhaustion", "service_overload", "endpoint_dos", "cpu_spike", "memory_exhaustion"]),
        asset_id="ASSET-SRV-002", src_ip=f"10.0.{random.randint(1,10)}.{random.randint(10,200)}"))

# 9. firmware_corruption_001: ['firmware_tamper', 'firmware_corruption'], group_by: device_id, threshold: 2
for _ in range(3):
    events_iot.append(base_event(random.choice(["firmware_tamper", "firmware_corruption"]),
                                 component="iot", device_id="IOT-PLC-007", sensor_id="sensor-plc-007"))

# 10. input_capture_001: ['keylogger', 'input_capture'], group_by: host_id, threshold: 2
for _ in range(3):
    events_network.append(base_event(random.choice(["keylogger", "input_capture"]),
                                     host_id="HOST-WS-033", src_ip="10.0.3.33"))

# 11. log_clear_001 (log_clearing type): ['log_clearing', 'event_log_cleared', 'process_creation'], group_by: asset_id, threshold: 1
for et in ["log_clearing", "event_log_cleared"]:
    events_network.append(base_event(et, asset_id="ASSET-DC-001", src_ip="10.0.1.10"))

# 12. multi_factor_auth_bypass_001: ['mfa_bypass', 'mfa_fatigue'], group_by: user_id, threshold: 5
for _ in range(7):
    events_network.append(base_event(random.choice(["mfa_bypass", "mfa_fatigue"]),
                                     user_id="user_jane_doe", src_ip="10.0.5.100"))

# 13. network_sniffing_001: ['packet_capture', 'promiscuous_mode'], group_by: host_id, threshold: 3
for _ in range(5):
    events_network.append(base_event(random.choice(["packet_capture", "promiscuous_mode"]),
                                     host_id="HOST-NET-005", src_ip="10.0.2.5"))

# 14. privilege_escalation_exploit_001: ['priv_escalation', 'exploit_attempt'], group_by: host_id, threshold: 2
for _ in range(4):
    events_network.append(base_event(random.choice(["priv_escalation", "exploit_attempt"]),
                                     host_id="HOST-WS-011", src_ip="10.0.3.11"))

# 15. resource_hijacking_001: ['crypto_mining', 'resource_hijack'], group_by: host_id, threshold: 3
for _ in range(5):
    events_network.append(base_event(random.choice(["crypto_mining", "resource_hijack"]),
                                     host_id="HOST-SRV-009", src_ip="10.0.6.9"))

# 16. rootkit_001: ['rootkit_detected', 'kernel_module_load'], group_by: host_id, threshold: 2
for _ in range(3):
    events_network.append(base_event(random.choice(["rootkit_detected", "kernel_module_load"]),
                                     host_id="HOST-SRV-003", src_ip="10.0.1.3"))

# 17. screen_capture_001 (screen_capture type): ['process_creation', 'assembly_load', ...], group_by: asset_id, threshold: 3
for et in ["process_creation", "assembly_load", "file_creation", "network_connection"]:
    events_network.append(base_event(et, asset_id="ASSET-WS-027", src_ip="10.0.3.27"))

# 18. service_persist_001 (service_persistence type): ['service_creation', 'service_modification', 'service_start'], group_by: asset_id, threshold: 1
for et in ["service_creation", "service_modification", "service_start"]:
    events_network.append(base_event(et, asset_id="ASSET-WS-044", src_ip="10.0.3.44"))

# 19. supply_chain_001: ['supply_chain_compromise', 'unauthorized_package'], group_by: asset_id, threshold: 2
for _ in range(3):
    events_network.append(base_event(random.choice(["supply_chain_compromise", "unauthorized_package"]),
                                     asset_id="ASSET-CI-001", src_ip="10.0.10.50"))

# 20. system_shutdown_001: ['forced_shutdown', 'forced_reboot'], group_by: host_id, threshold: 2
for _ in range(3):
    events_network.append(base_event(random.choice(["forced_shutdown", "forced_reboot"]),
                                     host_id="HOST-SRV-001", src_ip="10.0.1.1"))

# 21. trusted_relationship_001: ['third_party_access', 'vendor_compromise'], group_by: src_ip, threshold: 2
for _ in range(3):
    events_network.append(base_event(random.choice(["third_party_access", "vendor_compromise"]),
                                     src_ip="192.168.50.10", dst_ip="10.0.1.5"))

# 22. valid_accounts_001 (brute_force type): ['suspicious_login', 'impossible_travel'], group_by: user_id, threshold: 3
for _ in range(5):
    events_network.append(base_event(random.choice(["suspicious_login", "impossible_travel"]),
                                     user_id="admin_user_01", src_ip=f"203.0.113.{random.randint(1,50)}"))

# CS-T1056: threshold type, event_type: credential_access, field: event_type, threshold: 1
for _ in range(3):
    events_network.append(base_event("credential_access", src_ip="10.0.4.55", host_id="HOST-WS-055"))

# CS-T1486: threshold type, event_type: mass_encryption, field: actor_id, threshold: 1
for _ in range(3):
    events_network.append(base_event("mass_encryption", actor_id="ransomware-actor-01", src_ip="10.0.3.66"))

# CS-T1496: threshold type, event_type: high_cpu_usage, field: sensor_id, threshold: 1
for _ in range(3):
    events_iot.append(base_event("high_cpu_usage", component="iot", sensor_id="sensor-srv-010"))

# CS-T1562: threshold type, event_type: security_tool_disabled, field: event_type, threshold: 1
for _ in range(3):
    events_network.append(base_event("security_tool_disabled", src_ip="10.0.2.77", asset_id="ASSET-WS-077"))

# ========== ADDITIONAL MEDIUM/LOW EVENTS TO BALANCE SEVERITY ==========
# The rules that are medium severity need more events to balance the distribution
# Medium rules: CS-T1496 (medium), clipboard_data_001 (medium), network_sniffing_001 (medium),
# resource_hijacking_001 (medium), screen_capture_001 (medium)

# Add more events for medium-severity rules to boost their alert count
for _ in range(8):
    host = f"HOST-WS-{random.randint(100,150)}"
    events_network.append(base_event(random.choice(["clipboard_access", "clipboard_monitor"]),
                                     host_id=host, src_ip=f"10.0.7.{random.randint(100,200)}"))

for _ in range(8):
    host = f"HOST-NET-{random.randint(10,30)}"
    events_network.append(base_event(random.choice(["packet_capture", "promiscuous_mode"]),
                                     host_id=host, src_ip=f"10.0.8.{random.randint(10,50)}"))

for _ in range(8):
    host = f"HOST-SRV-{random.randint(20,40)}"
    events_network.append(base_event(random.choice(["crypto_mining", "resource_hijack"]),
                                     host_id=host, src_ip=f"10.0.9.{random.randint(10,50)}"))

for _ in range(8):
    asset = f"ASSET-WS-{random.randint(60,80)}"
    events_network.append(base_event(random.choice(["process_creation", "assembly_load", "file_creation"]),
                                     asset_id=asset, src_ip=f"10.0.5.{random.randint(60,80)}"))

for _ in range(5):
    events_iot.append(base_event("high_cpu_usage", component="iot",
                                 sensor_id=f"sensor-iot-{random.randint(20,40)}"))


# ========== INJECT ==========
print("=" * 60)
print("Supplementary Injection for Untriggered Rules")
print("=" * 60)
print(f"  logs-network: {len(events_network)} events")
print(f"  logs-iot: {len(events_iot)} events")
print(f"  logs-traffic: {len(events_traffic)} events")
print(f"  Total: {len(events_network) + len(events_iot) + len(events_traffic)} events")

# Inject
for idx, evts in [("logs-network", events_network), ("logs-iot", events_iot), ("logs-traffic", events_traffic)]:
    if evts:
        for i in range(0, len(evts), 500):
            batch = evts[i:i+500]
            count = bulk_index(idx, batch)
            print(f"  {idx}: batch indexed ({count} events)")

print("\nSupplementary injection complete.")
print("Wait 35 seconds for detection engine to process.")
