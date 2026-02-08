"""Initialize CityShield with real MITRE ATT&CK data and realistic scenarios."""
import requests
import json
from datetime import datetime
import os

OPENSEARCH_URL = os.getenv("OPENSEARCH_URL", "http://localhost:9200")

# Real MITRE ATT&CK techniques for smart city/ICS environments
MITRE_RULES = [
    {
        "rule_id": "CS-T1110",
        "name": "Brute Force Authentication",
        "description": "Detects multiple failed authentication attempts followed by a successful login, indicating credential brute force attack",
        "technique_id": "T1110",
        "technique_name": "Brute Force",
        "tactic": "Credential Access",
        "severity": "high",
        "component": "traffic_management",
        "enabled": True,
        "match_logic": {
            "type": "threshold",
            "parameters": {
                "event_type": "auth_failure",
                "threshold": 5,
                "time_window": 60,
                "field": "src_ip"
            }
        },
        "response_actions": ["create_alert", "block_ip"],
        "mitre_url": "https://attack.mitre.org/techniques/T1110/"
    },
    {
        "rule_id": "CS-T1595",
        "name": "Active Scanning - Port Scan",
        "description": "Detects systematic port scanning activity across network infrastructure",
        "technique_id": "T1595.001",
        "technique_name": "Active Scanning: Scanning IP Blocks",
        "tactic": "Reconnaissance",
        "severity": "medium",
        "component": "network_infrastructure",
        "enabled": True,
        "match_logic": {
            "type": "threshold",
            "parameters": {
            "event_type": "port_scan",
            "threshold": 10,
            "time_window": 30,
            "field": "src_ip"
            }
        },
        "response_actions": ["create_alert"],
        "mitre_url": "https://attack.mitre.org/techniques/T1595/001/"
    },
    {
        "rule_id": "CS-T1498",
        "name": "Network Denial of Service",
        "description": "Detects high-volume traffic patterns indicative of DDoS attacks against smart city infrastructure",
        "technique_id": "T1498",
        "technique_name": "Network Denial of Service",
        "tactic": "Impact",
        "severity": "critical",
        "component": "network_infrastructure",
        "enabled": True,
        "match_logic": {
            "type": "threshold",
            "parameters": {
            "event_type": "high_traffic",
            "threshold": 100,
            "time_window": 10,
            "field": "dst_ip"
            }
        },
        "response_actions": ["create_alert"],
        "mitre_url": "https://attack.mitre.org/techniques/T1498/"
    },
    {
        "rule_id": "CS-T1071",
        "name": "Application Layer Protocol Abuse",
        "description": "Detects suspicious use of application protocols for command and control",
        "technique_id": "T1071.001",
        "technique_name": "Application Layer Protocol: Web Protocols",
        "tactic": "Command and Control",
        "severity": "high",
        "component": "iot_sensors",
        "enabled": True,
        "match_logic": {
            "type": "threshold",
            "parameters": {
            "event_type": "suspicious_protocol",
            "threshold": 3,
            "time_window": 60,
            "field": "dst_port"
            }
        },
        "response_actions": ["create_alert"],
        "mitre_url": "https://attack.mitre.org/techniques/T1071/001/"
    },
    {
        "rule_id": "CS-T1499",
        "name": "Endpoint Denial of Service",
        "description": "Detects attempts to overwhelm IoT sensors and smart devices",
        "technique_id": "T1499",
        "technique_name": "Endpoint Denial of Service",
        "tactic": "Impact",
        "severity": "high",
        "component": "iot_sensors",
        "enabled": True,
        "match_logic": {
            "type": "threshold",
            "parameters": {
            "event_type": "sensor_overload",
            "threshold": 50,
            "time_window": 20,
            "field": "sensor_id"
            }
        },
        "response_actions": ["create_alert"],
        "mitre_url": "https://attack.mitre.org/techniques/T1499/"
    },
    {
        "rule_id": "CS-T1056",
        "name": "Input Capture - Credential Harvesting",
        "description": "Detects attempts to capture credentials from traffic management systems",
        "technique_id": "T1056.001",
        "technique_name": "Input Capture: Keylogging",
        "tactic": "Collection",
        "severity": "critical",
        "component": "traffic_management",
        "enabled": True,
        "match_logic": {
            "type": "threshold",
            "parameters": {
            "event_type": "credential_access",
            "threshold": 1,
            "time_window": 60,
            "field": "event_type"
            }
        },
        "response_actions": ["create_alert", "isolate_system"],
        "mitre_url": "https://attack.mitre.org/techniques/T1056/001/"
    },
    {
        "rule_id": "CS-T1040",
        "name": "Network Sniffing",
        "description": "Detects promiscuous mode network sniffing on smart city network",
        "technique_id": "T1040",
        "technique_name": "Network Sniffing",
        "tactic": "Discovery",
        "severity": "medium",
        "component": "network_infrastructure",
        "enabled": True,
        "match_logic": {
            "type": "threshold",
            "parameters": {
            "event_type": "promiscuous_mode",
            "threshold": 1,
            "time_window": 300,
            "field": "src_ip"
            }
        },
        "response_actions": ["create_alert"],
        "mitre_url": "https://attack.mitre.org/techniques/T1040/"
    },
    {
        "rule_id": "CS-T1496",
        "name": "Resource Hijacking",
        "description": "Detects unauthorized use of IoT device resources for cryptomining",
        "technique_id": "T1496",
        "technique_name": "Resource Hijacking",
        "tactic": "Impact",
        "severity": "medium",
        "component": "iot_sensors",
        "enabled": True,
        "match_logic": {
            "type": "threshold",
            "parameters": {
            "event_type": "high_cpu_usage",
            "threshold": 1,
            "time_window": 60,
            "field": "sensor_id"
            }
        },
        "response_actions": ["create_alert"],
        "mitre_url": "https://attack.mitre.org/techniques/T1496/"
    },
    {
        "rule_id": "CS-T1486",
        "name": "Data Encrypted for Impact",
        "description": "Detects ransomware-like encryption of smart city data",
        "technique_id": "T1486",
        "technique_name": "Data Encrypted for Impact",
        "tactic": "Impact",
        "severity": "critical",
        "component": "traffic_management",
        "enabled": True,
        "match_logic": {
            "type": "threshold",
            "parameters": {
            "event_type": "mass_encryption",
            "threshold": 1,
            "time_window": 60,
            "field": "actor_id"
            }
        },
        "response_actions": ["create_alert", "block_ransomware"],
        "mitre_url": "https://attack.mitre.org/techniques/T1486/"
    },
    {
        "rule_id": "CS-T1562",
        "name": "Impair Defenses - Disable Security Tools",
        "description": "Detects attempts to disable or modify security monitoring tools",
        "technique_id": "T1562.001",
        "technique_name": "Impair Defenses: Disable or Modify Tools",
        "tactic": "Defense Evasion",
        "severity": "critical",
        "component": "network_infrastructure",
        "enabled": True,
        "match_logic": {
            "type": "threshold",
            "parameters": {
            "event_type": "security_tool_disabled",
            "threshold": 1,
            "time_window": 60,
            "field": "event_type"
            }
        },
        "response_actions": ["create_alert", "isolate_system"],
        "mitre_url": "https://attack.mitre.org/techniques/T1562/001/"
    }
]

# Realistic attack scenarios based on real-world incidents
ATTACK_SCENARIOS = [
    {
        "scenario_id": "scenario-bruteforce-ssh",
        "name": "SSH Brute Force Attack",
        "description": "Simulates a coordinated SSH brute force attack against traffic management controllers. Based on real-world attacks against smart city infrastructure.",
        "attack_pattern": "Brute Force",
        "mitre_technique": "T1110",
        "target_component": "traffic_management",
        "components": ["traffic_sim"],
        "duration_seconds": 120,
        "intensity": "high",
        "parameters": {
            "failed_attempts_per_second": 5,
            "source_ips": ["10.0.0.50", "10.0.0.51", "10.0.0.52"],
            "target_services": ["ssh", "telnet"],
            "credential_lists": ["admin:admin", "root:root", "admin:password"]
        },
        "expected_alerts": ["CS-T1110"],
        "severity": "high"
    },
    {
        "scenario_id": "scenario-ddos-traffic",
        "name": "DDoS Against Traffic Control",
        "description": "Large-scale DDoS attack overwhelming traffic light control systems. Simulates attacks seen in 2016 Dyn cyberattack patterns.",
        "attack_pattern": "DDoS",
        "mitre_technique": "T1498",
        "target_component": "traffic_management",
        "components": ["traffic_sim"],
        "duration_seconds": 90,
        "intensity": "critical",
        "parameters": {
            "requests_per_second": 1000,
            "attack_type": "syn_flood",
            "source_count": 50,
            "target_ports": [80, 443, 8080]
        },
        "expected_alerts": ["CS-T1498"],
        "severity": "critical"
    },
    {
        "scenario_id": "scenario-portscan-recon",
        "name": "Network Reconnaissance - Port Scan",
        "description": "Systematic port scanning across smart city network infrastructure to identify vulnerable services. Common reconnaissance technique.",
        "attack_pattern": "Port Scan",
        "mitre_technique": "T1595.001",
        "target_component": "network_infrastructure",
        "components": ["network_emulator"],
        "duration_seconds": 60,
        "intensity": "medium",
        "parameters": {
            "scan_type": "tcp_syn",
            "port_range": "1-1024",
            "scan_rate": "100_per_second",
            "targets": "10.0.0.0/24"
        },
        "expected_alerts": ["CS-T1595"],
        "severity": "medium"
    },
    {
        "scenario_id": "scenario-iot-botnet",
        "name": "IoT Botnet Recruitment",
        "description": "Mirai-style botnet attempting to compromise IoT sensors through default credentials and known vulnerabilities.",
        "attack_pattern": "Malware",
        "mitre_technique": "T1071.001",
        "target_component": "iot_sensors",
        "components": ["iot_sim"],
        "duration_seconds": 180,
        "intensity": "high",
        "parameters": {
            "infection_vector": "telnet_brute_force",
            "default_credentials": True,
            "propagation_rate": "5_per_minute",
            "c2_callback_interval": 30
        },
        "expected_alerts": ["CS-T1071", "CS-T1110"],
        "severity": "critical"
    },
    {
        "scenario_id": "scenario-ransomware-traffic",
        "name": "Ransomware Attack on Traffic Systems",
        "description": "Targeted ransomware encrypting traffic management data. Based on attacks against transportation infrastructure.",
        "attack_pattern": "Ransomware",
        "mitre_technique": "T1486",
        "target_component": "traffic_management",
        "components": ["traffic_sim"],
        "duration_seconds": 150,
        "intensity": "critical",
        "parameters": {
            "encryption_algorithm": "AES-256",
            "file_types": ["config", "database", "logs"],
            "ransom_amount": "5_BTC",
            "spread_method": "lateral_movement"
        },
        "expected_alerts": ["CS-T1486", "CS-T1056"],
        "severity": "critical"
    },
    {
        "scenario_id": "scenario-mitm-network",
        "name": "Man-in-the-Middle Attack",
        "description": "ARP poisoning and traffic interception on smart city network. Captures sensitive data in transit.",
        "attack_pattern": "Data Exfiltration",
        "mitre_technique": "T1040",
        "target_component": "network_infrastructure",
        "components": ["network_emulator"],
        "duration_seconds": 120,
        "intensity": "high",
        "parameters": {
            "attack_method": "arp_poisoning",
            "targeted_protocols": ["HTTP", "MQTT", "Modbus"],
            "capture_credentials": True,
            "data_exfil_rate": "100MB_per_hour"
        },
        "expected_alerts": ["CS-T1040"],
        "severity": "high"
    },
    {
        "scenario_id": "scenario-dos-sensors",
        "name": "Sensor Overload DoS",
        "description": "Flooding IoT sensors with requests to disrupt environmental monitoring. Based on attacks against industrial sensors.",
        "attack_pattern": "DoS",
        "mitre_technique": "T1499",
        "target_component": "iot_sensors",
        "components": ["iot_sim"],
        "duration_seconds": 60,
        "intensity": "high",
        "parameters": {
            "request_rate": "500_per_second",
            "target_sensor_types": ["temperature", "humidity", "air_quality"],
            "malformed_packets": True,
            "resource_exhaustion": "memory"
        },
        "expected_alerts": ["CS-T1499"],
        "severity": "high"
    },
    {
        "scenario_id": "scenario-cryptojacking",
        "name": "Cryptojacking IoT Devices",
        "description": "Hijacking IoT device resources for cryptocurrency mining. Common attack against resource-constrained devices.",
        "attack_pattern": "Resource Hijacking",
        "mitre_technique": "T1496",
        "target_component": "iot_sensors",
        "components": ["iot_sim"],
        "duration_seconds": 300,
        "intensity": "medium",
        "parameters": {
            "mining_software": "xmrig",
            "target_cryptocurrency": "monero",
            "cpu_usage": "80_percent",
            "pool_address": "suspicious.mining.pool"
        },
        "expected_alerts": ["CS-T1496"],
        "severity": "medium"
    }
]


def create_index_if_not_exists(index_name, mappings=None):
    """Create OpenSearch index if it doesn't exist."""
    try:
        response = requests.head(f"{OPENSEARCH_URL}/{index_name}")
        if response.status_code == 404:
            if mappings:
                requests.put(
                    f"{OPENSEARCH_URL}/{index_name}",
                    json={"mappings": mappings},
                    headers={"Content-Type": "application/json"}
                )
            else:
                requests.put(f"{OPENSEARCH_URL}/{index_name}")
            print(f"✅ Created index: {index_name}")
        else:
            print(f"ℹ️  Index already exists: {index_name}")
    except Exception as e:
        print(f"❌ Error creating index {index_name}: {e}")


def index_document(index, doc, doc_id=None):
    """Index a document in OpenSearch."""
    try:
        if doc_id:
            url = f"{OPENSEARCH_URL}/{index}/_doc/{doc_id}"
        else:
            url = f"{OPENSEARCH_URL}/{index}/_doc"

        response = requests.post(
            url,
            json=doc,
            headers={"Content-Type": "application/json"}
        )

        if response.status_code in [200, 201]:
            return True
        else:
            print(f"❌ Failed to index document: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error indexing document: {e}")
        return False


def initialize_rules():
    """Initialize detection rules with real MITRE ATT&CK data."""
    print("\n🔧 Initializing MITRE ATT&CK Detection Rules...")
    create_index_if_not_exists("rules")

    success_count = 0
    for rule in MITRE_RULES:
        rule["created_at"] = datetime.utcnow().isoformat()
        rule["updated_at"] = datetime.utcnow().isoformat()

        if index_document("rules", rule, doc_id=rule["rule_id"]):
            success_count += 1
            print(f"  ✅ {rule['rule_id']}: {rule['name']} ({rule['technique_id']})")

    print(f"\n✅ Initialized {success_count}/{len(MITRE_RULES)} detection rules")


def initialize_scenarios():
    """Initialize realistic attack scenarios."""
    print("\n🎯 Initializing Attack Scenarios...")
    create_index_if_not_exists("scenarios")

    success_count = 0
    for scenario in ATTACK_SCENARIOS:
        scenario["created_at"] = datetime.utcnow().isoformat()
        scenario["created_by"] = "system"

        if index_document("scenarios", scenario, doc_id=scenario["scenario_id"]):
            success_count += 1
            print(f"  ✅ {scenario['name']} (MITRE {scenario['mitre_technique']})")

    print(f"\n✅ Initialized {success_count}/{len(ATTACK_SCENARIOS)} attack scenarios")


def verify_initialization():
    """Verify that data was initialized correctly."""
    print("\n🔍 Verifying Initialization...")

    try:
        # Check rules
        rules_response = requests.get(f"{OPENSEARCH_URL}/rules/_count")
        rules_count = rules_response.json()["count"]
        print(f"  📊 Detection Rules: {rules_count}")

        # Check scenarios
        scenarios_response = requests.get(f"{OPENSEARCH_URL}/scenarios/_count")
        scenarios_count = scenarios_response.json()["count"]
        print(f"  📊 Attack Scenarios: {scenarios_count}")

        return rules_count > 0 and scenarios_count > 0
    except Exception as e:
        print(f"  ❌ Verification failed: {e}")
        return False


def main():
    """Main initialization function."""
    print("=" * 70)
    print("🛡️  CityShield Platform - Data Initialization")
    print("=" * 70)
    print("\nInitializing with real MITRE ATT&CK data and realistic scenarios...")

    # Initialize rules
    initialize_rules()

    # Initialize scenarios
    initialize_scenarios()

    # Verify
    if verify_initialization():
        print("\n" + "=" * 70)
        print("✅ Initialization Complete!")
        print("=" * 70)
        print("\n📋 Summary:")
        print(f"  • {len(MITRE_RULES)} MITRE ATT&CK detection rules")
        print(f"  • {len(ATTACK_SCENARIOS)} realistic attack scenarios")
        print("\n🚀 Platform ready for cyber range training!")
        print("\n💡 Quick Launch Scenarios:")
        print("  • SSH Brute Force Attack (T1110)")
        print("  • DDoS Against Traffic Control (T1498)")
        print("  • Network Reconnaissance (T1595.001)")
        print("  • IoT Botnet Recruitment (T1071.001)")
        print("  • Ransomware Attack (T1486)")
        print("  • Man-in-the-Middle Attack (T1040)")
        print("  • Sensor Overload DoS (T1499)")
        print("  • Cryptojacking Attack (T1496)")
    else:
        print("\n⚠️  Initialization completed with warnings. Please check the output above.")


if __name__ == "__main__":
    main()
