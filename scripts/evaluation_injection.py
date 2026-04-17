#!/usr/bin/env python3
"""
CityShield Evaluation Event Injection Script

Injects diverse attack events into OpenSearch to properly exercise all detection rules.
This script generates realistic attack patterns that match the event_types expected
by the 75 YAML detection rules, enabling comprehensive evaluation of the detection engine.

Events are injected directly into logs-traffic, logs-iot, and logs-network indices.
"""

import json
import random
import time
import uuid
import requests
from datetime import datetime, timedelta

OPENSEARCH_URL = "http://localhost:9200"
AUTH = ("admin", "admin")  # Will try without auth first

def os_request(method, path, data=None):
    """Make OpenSearch request, trying with and without auth."""
    url = f"{OPENSEARCH_URL}{path}"
    headers = {"Content-Type": "application/json"}
    kwargs = {"headers": headers, "timeout": 10}
    if data:
        kwargs["json"] = data
    # Try without auth first (security plugin disabled)
    try:
        resp = getattr(requests, method)(url, **kwargs)
        if resp.status_code in (200, 201):
            return resp.json()
    except:
        pass
    return None

def index_event(index, event):
    """Index a single event."""
    os_request("post", f"/{index}/_doc", event)

def bulk_index(index, events):
    """Bulk index events for efficiency."""
    if not events:
        return
    lines = []
    for e in events:
        lines.append(json.dumps({"index": {"_index": index}}))
        lines.append(json.dumps(e))
    body = "\n".join(lines) + "\n"
    url = f"{OPENSEARCH_URL}/_bulk"
    headers = {"Content-Type": "application/x-ndjson"}
    try:
        resp = requests.post(url, data=body, headers=headers, timeout=30)
        return resp.json()
    except Exception as e:
        print(f"Bulk index error: {e}")
        return None

def make_event(component, event_type, severity, zone, src_ip, dst_ip,
               dst_port=443, is_attack=True, metadata=None, actor_id=None,
               timestamp=None):
    """Create a standardized event document."""
    if timestamp is None:
        # Spread events over last 5 minutes for detection window
        offset = random.uniform(0, 280)
        timestamp = (datetime.utcnow() - timedelta(seconds=offset)).isoformat() + "Z"

    event = {
        "@timestamp": timestamp,
        "component": component,
        "event_type": event_type,
        "severity": severity,
        "city_zone": zone,
        "src_ip": src_ip,
        "dst_ip": dst_ip,
        "src_port": random.randint(30000, 60000),
        "dst_port": dst_port,
        "actor_id": actor_id or f"attacker_{random.randint(1,20)}",
        "message": f"{event_type} detected from {src_ip} to {dst_ip}",
        "metadata": {
            "is_attack": is_attack,
            **(metadata or {})
        }
    }
    return event

# ============================================================
# ATTACK INJECTION PROFILES - Matched to detection rules
# ============================================================

ATTACKER_IPS = [
    "192.168.100.50", "203.0.113.10", "198.51.100.20",
    "45.129.56.200", "185.220.101.50", "10.0.5.99",
    "172.16.50.10", "10.0.3.99"
]

TARGET_IPS = {
    "traffic": ["10.20.5.10", "10.20.5.11", "10.20.5.12"],
    "iot": ["10.20.8.10", "10.20.8.11", "10.20.8.12", "10.20.8.13"],
    "network": ["10.20.1.10", "10.20.1.11", "10.20.1.12"],
    "security": ["10.20.9.10", "10.20.9.11"],
    "industrial": ["10.20.12.10", "10.20.12.11", "10.20.12.12"],
}

ZONES = ["zone-a", "zone-b", "zone-c", "zone-d", "zone-e"]

def generate_brute_force_campaign():
    """Brute force attacks - triggers brute_force_001, valid_accounts_001, external_remote_services_001"""
    events = []
    src = random.choice(ATTACKER_IPS)
    dst = random.choice(TARGET_IPS["traffic"])

    # Brute force: 25 auth_failure + 1 auth_success
    for i in range(25):
        events.append(make_event("traffic_management", "auth_failure", "warning",
                                 "zone-a", src, dst, 22))
    events.append(make_event("traffic_management", "auth_success", "critical",
                             "zone-a", src, dst, 22,
                             metadata={"suspicious_login": True}))

    # Also on IoT
    src2 = random.choice(ATTACKER_IPS)
    dst2 = random.choice(TARGET_IPS["iot"])
    for i in range(15):
        events.append(make_event("iot_sensors", "auth_failure", "warning",
                                 "zone-b", src2, dst2, 1883))

    # VPN brute force (external_remote_services_001)
    src3 = random.choice(ATTACKER_IPS)
    dst3 = random.choice(TARGET_IPS["network"])
    for i in range(12):
        events.append(make_event("network", "vpn_brute_force", "high",
                                 "zone-c", src3, dst3, 1194))
    for i in range(10):
        events.append(make_event("network", "rdp_attempt", "high",
                                 "zone-c", src3, dst3, 3389))

    # Suspicious logins (valid_accounts_001)
    for i in range(5):
        events.append(make_event("network", "suspicious_login", "high",
                                 "zone-c", random.choice(ATTACKER_IPS),
                                 random.choice(TARGET_IPS["network"]), 22))
    events.append(make_event("network", "impossible_travel", "critical",
                             "zone-c", src, dst3, 443))

    return events

def generate_port_scan_campaign():
    """Port scanning - triggers net_scan_001, active_scan_001, gather_network_001, gather_host_info_001"""
    events = []
    src = random.choice(ATTACKER_IPS)

    # Port scanning across multiple targets
    for target_set in [TARGET_IPS["network"], TARGET_IPS["traffic"]]:
        for dst in target_set:
            for port in random.sample(range(1, 1024), 15):
                events.append(make_event("network", "port_scan", "high",
                                         "zone-c", src, dst, port))

    # Network probes
    for i in range(8):
        events.append(make_event("network", "network_probe", "medium",
                                 "zone-c", src, random.choice(TARGET_IPS["network"]),
                                 random.randint(1, 1024)))

    # Vulnerability scans (active_scan_001)
    for i in range(15):
        events.append(make_event("network", "vulnerability_scan", "medium",
                                 "zone-c", src, random.choice(TARGET_IPS["network"]),
                                 random.choice([80, 443, 8080, 8443])))

    # Service probes
    for i in range(12):
        events.append(make_event("network", "service_probe", "medium",
                                 "zone-c", src, random.choice(TARGET_IPS["network"]),
                                 random.choice([21, 22, 80, 443, 3306, 5432])))

    # ICMP sweep
    for i in range(10):
        events.append(make_event("network", "icmp_sweep", "medium",
                                 "zone-c", src, f"10.20.1.{random.randint(1,254)}", 0))

    # Host info gathering (gather_host_info_001)
    for i in range(10):
        events.append(make_event("network", "os_fingerprint", "medium",
                                 "zone-c", src, random.choice(TARGET_IPS["network"]), 80))
    for i in range(5):
        events.append(make_event("network", "banner_grab", "medium",
                                 "zone-c", src, random.choice(TARGET_IPS["network"]),
                                 random.choice([22, 80, 443])))
    for i in range(10):
        events.append(make_event("network", "dns_query_burst", "medium",
                                 "zone-c", src, random.choice(TARGET_IPS["network"]), 53))

    # Network mapping (gather_network_001)
    for i in range(5):
        events.append(make_event("network", "traceroute", "medium",
                                 "zone-c", src, random.choice(TARGET_IPS["network"]), 0))
    for i in range(5):
        events.append(make_event("network", "network_mapping", "medium",
                                 "zone-c", src, random.choice(TARGET_IPS["network"]),
                                 random.choice([0, 53, 161])))
    for i in range(5):
        events.append(make_event("network", "arp_sweep", "medium",
                                 "zone-c", src, f"10.20.1.{random.randint(1,254)}", 0))

    # Identity gathering (gather_identity_001)
    for i in range(12):
        events.append(make_event("network", "username_enumeration", "medium",
                                 "zone-c", src, random.choice(TARGET_IPS["security"]), 389))
    for i in range(5):
        events.append(make_event("network", "ldap_enumeration", "medium",
                                 "zone-c", src, random.choice(TARGET_IPS["security"]), 389))

    # Network share discovery (net_share_disc_001)
    for i in range(8):
        events.append(make_event("network", "smb_enumeration", "medium",
                                 "zone-c", src, random.choice(TARGET_IPS["network"]), 445))
    for i in range(5):
        events.append(make_event("network", "share_discovery", "medium",
                                 "zone-c", src, random.choice(TARGET_IPS["network"]), 445))

    return events

def generate_c2_campaign():
    """C2 beaconing - triggers c2_beacon_001, dns_tunneling_001, traffic_signaling_001"""
    events = []
    src = random.choice(["10.0.8.15", "10.20.8.11"])
    c2_server = "185.234.72.11"

    # C2 beaconing
    for i in range(8):
        events.append(make_event("iot_sensors", "c2_beacon", "critical",
                                 "zone-b", src, c2_server, 443))

    # DNS tunneling (dns_tunneling_001)
    for i in range(8):
        events.append(make_event("network", "dns_tunnel", "critical",
                                 "zone-c", src, "8.8.8.8", 53,
                                 metadata={"query_length": random.randint(100, 200)}))
    for i in range(5):
        events.append(make_event("network", "dns_anomaly", "high",
                                 "zone-c", src, "8.8.4.4", 53))

    # Traffic signaling / port knocking (traffic_signaling_001)
    for i in range(7):
        events.append(make_event("network", "port_knocking", "high",
                                 "zone-c", src, random.choice(TARGET_IPS["network"]),
                                 random.choice([1337, 31337, 4444])))

    return events

def generate_lateral_movement_campaign():
    """Lateral movement - triggers lateral_movement_001, remote_services_001, ssh_hijacking_001"""
    events = []
    src = "10.20.5.10"  # Compromised host

    # Lateral tool transfer
    for dst in TARGET_IPS["network"] + TARGET_IPS["security"]:
        events.append(make_event("network", "lateral_tool_transfer", "high",
                                 "zone-c", src, dst, 445))
        events.append(make_event("network", "smb_transfer", "high",
                                 "zone-c", src, dst, 445))

    # Remote services (remote_services_001)
    for i in range(5):
        dst = random.choice(TARGET_IPS["network"] + TARGET_IPS["security"])
        events.append(make_event("network", "ssh_session", "high",
                                 "zone-c", src, dst, 22))
    for i in range(4):
        dst = random.choice(TARGET_IPS["network"])
        events.append(make_event("network", "rdp_connection", "high",
                                 "zone-c", src, dst, 3389))
    for i in range(3):
        events.append(make_event("network", "remote_execution", "high",
                                 "zone-c", src, random.choice(TARGET_IPS["security"]),
                                 random.choice([135, 445, 5985])))

    # SSH hijacking (ssh_hijacking_001)
    for i in range(3):
        events.append(make_event("network", "ssh_hijack", "critical",
                                 "zone-c", src, random.choice(TARGET_IPS["network"]), 22))

    # Remote exploit (remote_services_exploit_001)
    for i in range(4):
        events.append(make_event("network", "remote_exploit", "critical",
                                 "zone-c", src, random.choice(TARGET_IPS["network"]),
                                 random.choice([80, 443, 8080])))

    return events

def generate_data_exfiltration_campaign():
    """Data exfiltration - triggers data_exfil_001, archive_data_001, data_archive_001"""
    events = []
    src = "10.20.5.10"
    ext_server = "203.0.113.50"

    # Data staging
    for i in range(5):
        events.append(make_event("security", "data_staging", "high",
                                 "zone-d", src, ext_server, 443,
                                 metadata={"bytes_transferred": random.randint(1000000, 50000000)}))

    # Data exfiltration
    for i in range(8):
        events.append(make_event("security", "data_exfiltration", "critical",
                                 "zone-d", src, ext_server, 443,
                                 metadata={"bytes_transferred": random.randint(5000000, 100000000)}))

    # Archive creation (archive_data_001)
    for i in range(4):
        events.append(make_event("security", "file_creation", "medium",
                                 "zone-d", src, src, 0,
                                 metadata={"file_type": "archive", "size_mb": random.randint(50, 500)}))

    return events

def generate_credential_attacks():
    """Credential attacks - triggers credential_dump_001, kerberoasting_001, pass_the_hash_001"""
    events = []
    src = random.choice(ATTACKER_IPS)

    # Credential dumping
    for i in range(5):
        events.append(make_event("security", "credential_access", "critical",
                                 "zone-d", src, random.choice(TARGET_IPS["security"]),
                                 random.choice([445, 135])))
    for i in range(3):
        events.append(make_event("security", "password_dump", "critical",
                                 "zone-d", src, random.choice(TARGET_IPS["security"]), 445))
    for i in range(3):
        events.append(make_event("security", "hash_extraction", "critical",
                                 "zone-d", src, random.choice(TARGET_IPS["security"]), 445))

    # Kerberoasting (kerberoasting_001)
    for i in range(8):
        events.append(make_event("network", "kerberoast", "high",
                                 "zone-c", src, random.choice(TARGET_IPS["security"]), 88))
    for i in range(6):
        events.append(make_event("network", "spn_request", "high",
                                 "zone-c", src, random.choice(TARGET_IPS["security"]), 88))

    # Pass-the-hash (pass_the_hash_001)
    for i in range(4):
        events.append(make_event("network", "pth_attempt", "critical",
                                 "zone-c", src, random.choice(TARGET_IPS["network"]), 445))
    for i in range(3):
        events.append(make_event("network", "ntlm_relay", "critical",
                                 "zone-c", src, random.choice(TARGET_IPS["network"]), 445))

    return events

def generate_defense_evasion():
    """Defense evasion - triggers defense_evasion_001, impair_defenses_001, log_clear_001,
    indicator_removal_001, obfuscation_001"""
    events = []
    src = "10.20.5.10"  # Compromised host

    # Defense evasion
    for i in range(4):
        events.append(make_event("security", "service_stop", "critical",
                                 "zone-d", src, src, 0))
    for i in range(3):
        events.append(make_event("security", "security_config_change", "critical",
                                 "zone-d", src, src, 0))
    for i in range(3):
        events.append(make_event("security", "firewall_modification", "critical",
                                 "zone-d", src, src, 0))

    # Log clearing
    for i in range(3):
        events.append(make_event("security", "log_clearing", "critical",
                                 "zone-d", src, src, 0))
    for i in range(2):
        events.append(make_event("security", "event_log_cleared", "critical",
                                 "zone-d", src, src, 0))

    # Indicator removal (file deletion, timestamp modification)
    for i in range(3):
        events.append(make_event("security", "file_deletion", "high",
                                 "zone-d", src, src, 0))
    for i in range(2):
        events.append(make_event("security", "timestamp_modification", "high",
                                 "zone-d", src, src, 0))

    # Obfuscation (obfuscation_001)
    for i in range(3):
        events.append(make_event("security", "obfuscated_execution", "high",
                                 "zone-d", src, src, 0))
    for i in range(4):
        events.append(make_event("network", "powershell_execution", "high",
                                 "zone-c", src, src, 0))

    return events

def generate_execution_persistence():
    """Execution & persistence - triggers cmd_exec_001, sched_task_001, service_exec_001,
    boot_autostart_001, mod_sys_proc_001, proc_inject_001, token_manip_001"""
    events = []
    src = "10.20.5.10"

    # Command execution (cmd_exec_001, cmd_script_interp_001)
    for i in range(8):
        events.append(make_event("network", "cmd_execution", "high",
                                 "zone-c", src, src, 0,
                                 metadata={"command": f"cmd_{random.randint(1,100)}"}))
    for i in range(5):
        events.append(make_event("network", "script_execution", "high",
                                 "zone-c", src, src, 0))
    for i in range(10):
        events.append(make_event("network", "process_creation", "medium",
                                 "zone-c", src, src, 0))

    # Scheduled tasks (sched_task_001, sched_task_job_001)
    for i in range(4):
        events.append(make_event("network", "scheduled_task_creation", "critical",
                                 "zone-c", src, src, 0))
    for i in range(3):
        events.append(make_event("network", "cron_job_creation", "high",
                                 "zone-c", src, src, 0))

    # Service manipulation (service_exec_001, sys_services_001)
    for i in range(4):
        events.append(make_event("network", "service_creation", "critical",
                                 "zone-c", src, src, 0))
    for i in range(4):
        events.append(make_event("network", "service_modification", "high",
                                 "zone-c", src, src, 0))

    # Registry / boot persistence (boot_autostart_001, registry_persist_001)
    for i in range(4):
        events.append(make_event("network", "registry_modification", "high",
                                 "zone-c", src, src, 0))
    for i in range(3):
        events.append(make_event("network", "startup_modification", "high",
                                 "zone-c", src, src, 0))

    # Process injection (proc_inject_001)
    for i in range(3):
        events.append(make_event("security", "process_injection", "critical",
                                 "zone-d", src, src, 0))
    for i in range(3):
        events.append(make_event("security", "dll_load", "high",
                                 "zone-d", src, src, 0))

    # Token manipulation (token_manip_001)
    for i in range(3):
        events.append(make_event("security", "token_manipulation", "critical",
                                 "zone-d", src, src, 0))
    for i in range(3):
        events.append(make_event("security", "privilege_escalation", "critical",
                                 "zone-d", src, src, 0))

    # Account creation (create_acct_gen_001, account_create_001)
    for i in range(4):
        events.append(make_event("security", "user_account_creation", "critical",
                                 "zone-d", src, src, 0))
    for i in range(3):
        events.append(make_event("security", "user_group_modification", "high",
                                 "zone-d", src, src, 0))

    return events

def generate_iot_attacks():
    """IoT-specific attacks - triggers iot_anomaly_001 + IoT-relevant rules"""
    events = []

    # IoT anomalies (iot_anomaly_001)
    for sensor_id in [f"sensor_temperature_{i:03d}" for i in range(1, 8)]:
        for j in range(8):
            events.append(make_event("iot_sensors", "sensor_anomaly", "high",
                                     "zone-b", f"10.20.8.{random.randint(10,50)}",
                                     "10.20.8.10", 1883,
                                     actor_id=sensor_id,
                                     metadata={"sensor_value": random.uniform(80, 200)}))

    # Data tampering
    for i in range(10):
        events.append(make_event("iot_sensors", "data_tampering", "critical",
                                 "zone-b", random.choice(ATTACKER_IPS),
                                 random.choice(TARGET_IPS["iot"]), 1883))

    # Firmware corruption (firmware_corruption_001)
    for i in range(4):
        events.append(make_event("iot_sensors", "firmware_tamper", "critical",
                                 "zone-b", random.choice(ATTACKER_IPS),
                                 random.choice(TARGET_IPS["iot"]), 8080))
    for i in range(3):
        events.append(make_event("iot_sensors", "firmware_corruption", "critical",
                                 "zone-b", random.choice(ATTACKER_IPS),
                                 random.choice(TARGET_IPS["iot"]), 8080))

    return events

def generate_impact_attacks():
    """Impact attacks - triggers ransomware_001, data_destruction_001, defacement_001,
    system_shutdown_001, resource_hijacking_001, dos_endpoint_001"""
    events = []
    src = "10.20.5.10"

    # Ransomware (ransomware_001)
    for i in range(5):
        events.append(make_event("network", "file_encryption", "critical",
                                 "zone-c", src, src, 0))
    for i in range(3):
        events.append(make_event("network", "ransomware_indicator", "critical",
                                 "zone-c", src, src, 0))
    events.append(make_event("network", "ransom_note_detected", "critical",
                             "zone-c", src, src, 0))

    # Data destruction (data_destruction_001)
    for i in range(4):
        events.append(make_event("security", "data_wipe", "critical",
                                 "zone-d", src, random.choice(TARGET_IPS["security"]), 0))
    for i in range(3):
        events.append(make_event("security", "mass_deletion", "critical",
                                 "zone-d", src, random.choice(TARGET_IPS["security"]), 0))

    # Defacement (defacement_001)
    for i in range(4):
        events.append(make_event("network", "web_defacement", "high",
                                 "zone-c", src, random.choice(TARGET_IPS["network"]), 80))

    # System shutdown (system_shutdown_001)
    for i in range(3):
        events.append(make_event("industrial_systems", "forced_shutdown", "high",
                                 "zone-e", src, random.choice(TARGET_IPS["industrial"]), 502))

    # Resource hijacking / cryptomining (resource_hijacking_001)
    for i in range(5):
        events.append(make_event("iot_sensors", "crypto_mining", "medium",
                                 "zone-b", random.choice(TARGET_IPS["iot"]),
                                 "pool.mining.example.com", 3333))

    # DoS endpoint (dos_endpoint_001) -- high threshold=50
    for i in range(60):
        events.append(make_event("network", "resource_exhaustion", "high",
                                 "zone-c", random.choice(ATTACKER_IPS),
                                 random.choice(TARGET_IPS["network"]),
                                 random.choice([80, 443, 8080]),
                                 actor_id=random.choice(TARGET_IPS["network"])))

    # DDoS (ddos_attack_001) -- need >100 events + multiple sources
    dst = "10.20.1.10"
    for i in range(120):
        events.append(make_event("network", "network_connection", "critical",
                                 "zone-c",
                                 f"10.{random.randint(1,254)}.{random.randint(1,254)}.{random.randint(1,254)}",
                                 dst, 80))

    return events

def generate_web_attacks():
    """Web exploits - triggers web_exploit_001, drive_by_compromise_001"""
    events = []
    src = random.choice(ATTACKER_IPS)

    # Web exploit (web_exploit_001)
    for i in range(5):
        events.append(make_event("network", "sql_injection", "high",
                                 "zone-c", src, random.choice(TARGET_IPS["network"]), 80))
    for i in range(4):
        events.append(make_event("network", "xss_attempt", "high",
                                 "zone-c", src, random.choice(TARGET_IPS["network"]), 80))
    for i in range(4):
        events.append(make_event("network", "command_injection", "critical",
                                 "zone-c", src, random.choice(TARGET_IPS["network"]), 80))
    for i in range(3):
        events.append(make_event("network", "path_traversal", "high",
                                 "zone-c", src, random.choice(TARGET_IPS["network"]), 80))

    # Drive-by (drive_by_compromise_001)
    for i in range(5):
        events.append(make_event("network", "drive_by", "high",
                                 "zone-c", random.choice(TARGET_IPS["network"]),
                                 random.choice(ATTACKER_IPS), 80))

    return events

def generate_phishing_attacks():
    """Phishing - triggers phishing_gen_001, phishing_link_001, spearphishing_001"""
    events = []

    # Phishing emails (phishing_gen_001)
    for i in range(5):
        events.append(make_event("security", "phishing_email", "high",
                                 "zone-d", random.choice(ATTACKER_IPS),
                                 random.choice(TARGET_IPS["security"]), 25))
    for i in range(4):
        events.append(make_event("security", "suspicious_attachment", "high",
                                 "zone-d", random.choice(ATTACKER_IPS),
                                 random.choice(TARGET_IPS["security"]), 25))
    for i in range(5):
        events.append(make_event("security", "phishing_link_click", "high",
                                 "zone-d", random.choice(TARGET_IPS["security"]),
                                 random.choice(ATTACKER_IPS), 80))
    for i in range(3):
        events.append(make_event("security", "malicious_url_access", "high",
                                 "zone-d", random.choice(TARGET_IPS["security"]),
                                 random.choice(ATTACKER_IPS), 443))

    return events

def generate_privilege_escalation():
    """Privilege escalation - triggers abuse_elevation_001, privilege_escalation_exploit_001"""
    events = []
    src = "10.20.5.10"

    # Abuse elevation (abuse_elevation_001)
    for i in range(4):
        events.append(make_event("security", "uac_bypass", "critical",
                                 "zone-d", src, src, 0))
    for i in range(3):
        events.append(make_event("security", "sudo_abuse", "critical",
                                 "zone-d", src, src, 0))
    for i in range(3):
        events.append(make_event("security", "privilege_escalation", "critical",
                                 "zone-d", src, src, 0))

    # Privilege escalation exploit (privilege_escalation_exploit_001)
    for i in range(4):
        events.append(make_event("security", "exploit_attempt", "critical",
                                 "zone-d", src, random.choice(TARGET_IPS["security"]),
                                 random.choice([80, 443])))

    return events

def generate_misc_attacks():
    """Miscellaneous attacks for remaining rules"""
    events = []
    src = "10.20.5.10"

    # MitM (man_in_the_middle_001)
    for i in range(5):
        events.append(make_event("network", "arp_spoof", "critical",
                                 "zone-c", src, random.choice(TARGET_IPS["network"]), 0))
    for i in range(4):
        events.append(make_event("network", "mitm_attack", "critical",
                                 "zone-c", src, random.choice(TARGET_IPS["network"]), 0))

    # Network sniffing (network_sniffing_001)
    for i in range(5):
        events.append(make_event("network", "packet_capture", "medium",
                                 "zone-c", src, random.choice(TARGET_IPS["network"]), 0))
    for i in range(4):
        events.append(make_event("network", "promiscuous_mode", "medium",
                                 "zone-c", src, random.choice(TARGET_IPS["network"]), 0))

    # Account manipulation (account_manipulation_001)
    for i in range(5):
        events.append(make_event("security", "account_modify", "high",
                                 "zone-d", src, random.choice(TARGET_IPS["security"]), 0))
    for i in range(4):
        events.append(make_event("security", "permission_change", "high",
                                 "zone-d", src, random.choice(TARGET_IPS["security"]), 0))

    # Screen capture (screen_capture_001)
    for i in range(5):
        events.append(make_event("security", "file_creation", "medium",
                                 "zone-d", src, src, 0))

    # Ingress tool transfer (ingress_tool_transfer_001)
    for i in range(5):
        events.append(make_event("network", "tool_download", "high",
                                 "zone-c", src, random.choice(ATTACKER_IPS), 443))
    for i in range(4):
        events.append(make_event("network", "suspicious_transfer", "high",
                                 "zone-c", src, random.choice(ATTACKER_IPS), 443))

    # Supply chain (supply_chain_001)
    for i in range(3):
        events.append(make_event("security", "supply_chain_compromise", "critical",
                                 "zone-d", random.choice(ATTACKER_IPS),
                                 random.choice(TARGET_IPS["security"]), 443))

    # Rootkit (rootkit_001)
    for i in range(3):
        events.append(make_event("security", "rootkit_detected", "critical",
                                 "zone-d", src, src, 0))

    return events

def generate_false_positive_events():
    """Generate borderline events that should trigger some false positives.
    These are benign-looking patterns that slightly resemble attacks."""
    events = []

    # Legitimate admin activity that looks like scanning (FP for net_scan)
    admin_ip = "10.20.1.11"  # Network admin
    for port in [22, 80, 443, 3306, 5601, 8000, 8080, 9200]:
        events.append(make_event("network", "port_scan", "info",
                                 "zone-c", admin_ip, "10.20.1.10", port,
                                 is_attack=False,
                                 metadata={"scan_type": "health_check"}))

    # Automated backup that looks like exfiltration (FP for data_exfil)
    backup_ip = "10.20.9.10"
    for i in range(5):
        events.append(make_event("security", "data_exfiltration", "info",
                                 "zone-d", backup_ip, "10.20.9.200", 443,
                                 is_attack=False,
                                 metadata={"bytes_transferred": random.randint(10000000, 100000000),
                                           "process": "backup_agent"}))

    # Config management tool that looks like persistence (FP for service_exec)
    config_ip = "10.20.1.12"
    for i in range(4):
        events.append(make_event("network", "service_creation", "info",
                                 "zone-c", config_ip, config_ip, 0,
                                 is_attack=False,
                                 metadata={"process": "ansible-playbook"}))
    for i in range(3):
        events.append(make_event("network", "service_modification", "info",
                                 "zone-c", config_ip, config_ip, 0,
                                 is_attack=False))

    # Legitimate auth failures (FP for brute_force)
    for i in range(8):
        events.append(make_event("traffic_management", "auth_failure", "info",
                                 "zone-a", f"10.20.5.{random.randint(10,15)}",
                                 "10.20.5.10", 22,
                                 is_attack=False,
                                 metadata={"reason": "expired_password"}))

    # Network monitoring that looks like C2 beaconing (FP for c2_beacon)
    monitor_ip = "10.20.9.11"
    for i in range(5):
        events.append(make_event("network", "c2_beacon", "info",
                                 "zone-c", monitor_ip, "10.20.9.10", 443,
                                 is_attack=False,
                                 metadata={"process": "monitoring_agent"}))

    # IoT sensor calibration that looks like anomaly (FP for iot_anomaly)
    for sensor_id in [f"sensor_temperature_{i:03d}" for i in range(18, 21)]:
        for j in range(6):
            events.append(make_event("iot_sensors", "sensor_anomaly", "info",
                                     "zone-b", f"10.20.8.{random.randint(10,20)}",
                                     "10.20.8.10", 1883,
                                     is_attack=False,
                                     actor_id=sensor_id,
                                     metadata={"reason": "calibration", "sensor_value": 50}))

    return events


def main():
    print("=" * 60)
    print("CityShield Evaluation Event Injection")
    print("=" * 60)

    # Generate all attack campaigns
    campaigns = {
        "Brute Force Campaign": generate_brute_force_campaign,
        "Port Scan & Recon Campaign": generate_port_scan_campaign,
        "C2 & DNS Tunnel Campaign": generate_c2_campaign,
        "Lateral Movement Campaign": generate_lateral_movement_campaign,
        "Data Exfiltration Campaign": generate_data_exfiltration_campaign,
        "Credential Attacks": generate_credential_attacks,
        "Defense Evasion": generate_defense_evasion,
        "Execution & Persistence": generate_execution_persistence,
        "IoT Attacks": generate_iot_attacks,
        "Impact Attacks": generate_impact_attacks,
        "Web Exploits": generate_web_attacks,
        "Phishing Attacks": generate_phishing_attacks,
        "Privilege Escalation": generate_privilege_escalation,
        "Miscellaneous Attacks": generate_misc_attacks,
        "False Positive Events": generate_false_positive_events,
    }

    all_events = {"logs-traffic": [], "logs-iot": [], "logs-network": []}
    total = 0

    for name, gen_func in campaigns.items():
        events = gen_func()
        total += len(events)

        # Route events to appropriate indices
        for e in events:
            comp = e.get("component", "")
            if "iot" in comp or "sensor" in comp:
                all_events["logs-iot"].append(e)
            elif "traffic" in comp:
                all_events["logs-traffic"].append(e)
            else:
                all_events["logs-network"].append(e)

        print(f"  {name}: {len(events)} events generated")

    print(f"\nTotal events: {total}")
    print(f"  logs-traffic: {len(all_events['logs-traffic'])}")
    print(f"  logs-iot: {len(all_events['logs-iot'])}")
    print(f"  logs-network: {len(all_events['logs-network'])}")

    # Inject events
    print("\nInjecting events into OpenSearch...")
    for index, events in all_events.items():
        if events:
            # Bulk index in batches of 500
            for i in range(0, len(events), 500):
                batch = events[i:i+500]
                result = bulk_index(index, batch)
                if result and not result.get("errors"):
                    print(f"  {index}: batch {i//500 + 1} indexed ({len(batch)} events)")
                else:
                    errs = sum(1 for item in (result or {}).get("items", []) if "error" in item.get("index", {}))
                    print(f"  {index}: batch {i//500 + 1} - {errs} errors out of {len(batch)}")

    # Force refresh
    requests.post(f"{OPENSEARCH_URL}/logs-*/_refresh", timeout=10)

    print("\nInjection complete. Wait 30-60 seconds for detection engine to process.")
    print("Then run: python3 scripts/collect_metrics.py")

if __name__ == "__main__":
    main()
