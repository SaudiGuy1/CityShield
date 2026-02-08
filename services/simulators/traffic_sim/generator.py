"""Traffic event generator with realistic MITRE ATT&CK attack emulation."""
import random
import json
from datetime import datetime
from typing import Dict, Any


class TrafficGenerator:
    """Generates traffic simulation events with realistic attack patterns."""

    ZONES = ["zone_1", "zone_2", "zone_3", "zone_4", "zone_central"]
    EVENT_TYPES = ["vehicle_movement", "traffic_light_change", "speed_violation", "collision_detected"]
    VEHICLES = [f"vehicle_{i:04d}" for i in range(1, 101)]

    # Realistic attack IPs
    ATTACKER_IPS = [
        "45.129.56.200",  # Known malicious IP range
        "185.220.101.50",  # Tor exit node range
        "192.168.100.50",  # Internal threat
        "10.0.0.50",  # Compromised internal host
        "203.0.113.15"  # Documentation/test range
    ]

    def __init__(self):
        self.mode = "normal"
        self.attack_type = None
        self.attack_params = {}
        self.attack_counter = 0
        self.brute_force_attempts = 0
        self.credentials = [
            ("admin", "admin"),
            ("root", "root"),
            ("admin", "password"),
            ("admin", "123456"),
            ("user", "user"),
            ("administrator", "password123")
        ]

    def set_mode(self, mode: str):
        """Set simulation mode."""
        self.mode = mode

    def start_attack(self, attack_type: str, params: Dict[str, Any]):
        """Start attack simulation."""
        self.mode = "attack"
        self.attack_type = attack_type
        self.attack_params = params
        self.attack_counter = 0
        self.brute_force_attempts = 0

    def stop_attack(self):
        """Stop attack simulation."""
        self.mode = "normal"
        self.attack_type = None
        self.attack_params = {}
        self.attack_counter = 0
        self.brute_force_attempts = 0

    def generate_normal_event(self) -> Dict[str, Any]:
        """Generate a normal traffic event."""
        event_type = random.choice(self.EVENT_TYPES)
        vehicle_id = random.choice(self.VEHICLES)
        zone = random.choice(self.ZONES)

        # Generate realistic IPs
        src_ip = f"10.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}"
        dst_ip = f"10.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}"

        event = {
            "@timestamp": datetime.utcnow().isoformat() + "Z",
            "component": "traffic_management",
            "event_type": event_type,
            "severity": "info",
            "city_zone": zone,
            "src_ip": src_ip,
            "dst_ip": dst_ip,
            "src_port": random.randint(30000, 60000),
            "dst_port": random.choice([80, 443, 8080, 8443]),
            "actor_id": vehicle_id,
            "message": f"{event_type} in {zone} by {vehicle_id}",
            "metadata": {
                "is_attack": False,
                "speed": random.randint(20, 80),
                "vehicle_type": random.choice(["car", "truck", "bus", "motorcycle"])
            }
        }

        return event

    def generate_attack_event(self) -> Dict[str, Any]:
        """Generate an attack event based on attack type."""
        self.attack_counter += 1

        if self.attack_type == "brute_force":
            return self._generate_brute_force_event()
        elif self.attack_type == "ddos":
            return self._generate_ddos_event()
        elif self.attack_type == "port_scan":
            return self._generate_port_scan_event()
        elif self.attack_type == "ransomware":
            return self._generate_ransomware_event()
        elif self.attack_type == "mitm":
            return self._generate_mitm_event()
        else:
            return self._generate_suspicious_event()

    def _generate_brute_force_event(self) -> Dict[str, Any]:
        """Generate realistic SSH/Telnet brute force attack (MITRE T1110)."""
        self.brute_force_attempts += 1
        attacker_ip = random.choice(self.ATTACKER_IPS)
        target_ip = f"10.{random.randint(1, 10)}.{random.randint(1, 10)}.{random.randint(1, 100)}"
        service = random.choice(["ssh", "telnet", "http"])
        port = 22 if service == "ssh" else 23 if service == "telnet" else 80

        # Simulate failed attempts, then eventually a success
        if self.brute_force_attempts < 15:
            # Failed authentication attempts
            username, password = random.choice(self.credentials)
            event = {
                "@timestamp": datetime.utcnow().isoformat() + "Z",
                "component": "traffic_management",
                "event_type": "auth_failure",
                "severity": "warning",
                "city_zone": random.choice(self.ZONES),
                "src_ip": attacker_ip,
                "dst_ip": target_ip,
                "src_port": random.randint(40000, 60000),
                "dst_port": port,
                "actor_id": "attacker",
                "message": f"Failed {service} authentication attempt from {attacker_ip} to {target_ip} (attempt {self.brute_force_attempts})",
                "metadata": {
                    "is_attack": True,
                    "attack_type": "brute_force",
                    "mitre_technique": "T1110",
                    "service": service,
                    "username": username,
                    "password_attempt": password,
                    "attempt_number": self.brute_force_attempts,
                    "success": False
                }
            }
        else:
            # Successful breach
            event = {
                "@timestamp": datetime.utcnow().isoformat() + "Z",
                "component": "traffic_management",
                "event_type": "auth_success",
                "severity": "critical",
                "city_zone": random.choice(self.ZONES),
                "src_ip": attacker_ip,
                "dst_ip": target_ip,
                "src_port": random.randint(40000, 60000),
                "dst_port": port,
                "actor_id": "attacker",
                "message": f"ALERT: Successful {service} authentication from {attacker_ip} after {self.brute_force_attempts} attempts",
                "metadata": {
                    "is_attack": True,
                    "attack_type": "brute_force",
                    "mitre_technique": "T1110",
                    "service": service,
                    "username": "admin",
                    "attempt_number": self.brute_force_attempts,
                    "success": True,
                    "breach_time": datetime.utcnow().isoformat() + "Z"
                }
            }
            # Reset counter after successful breach
            self.brute_force_attempts = 0

        return event

    def _generate_ddos_event(self) -> Dict[str, Any]:
        """Generate DDoS attack event (MITRE T1498)."""
        # Multiple attacker IPs for distributed attack
        attacker_ip = f"{random.choice(['45', '185', '203'])}.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}"
        target_ip = "10.0.1.100"  # Traffic control server

        event = {
            "@timestamp": datetime.utcnow().isoformat() + "Z",
            "component": "traffic_management",
            "event_type": "high_traffic",
            "severity": "critical",
            "city_zone": "zone_central",
            "src_ip": attacker_ip,
            "dst_ip": target_ip,
            "src_port": random.randint(1024, 65535),
            "dst_port": random.choice([80, 443, 8080]),
            "actor_id": "botnet",
            "message": f"High volume traffic from {attacker_ip} - potential DDoS attack",
            "metadata": {
                "is_attack": True,
                "attack_type": "ddos",
                "mitre_technique": "T1498",
                "packet_rate": random.randint(1000, 5000),
                "attack_vector": "syn_flood",
                "botnet_size_estimate": random.randint(100, 500)
            }
        }

        return event

    def _generate_port_scan_event(self) -> Dict[str, Any]:
        """Generate port scanning event (MITRE T1595.001)."""
        attacker_ip = random.choice(self.ATTACKER_IPS)
        target_ip = f"10.0.1.{random.randint(1, 254)}"

        event = {
            "@timestamp": datetime.utcnow().isoformat() + "Z",
            "component": "traffic_management",
            "event_type": "port_scan",
            "severity": "medium",
            "city_zone": random.choice(self.ZONES),
            "src_ip": attacker_ip,
            "dst_ip": target_ip,
            "src_port": random.randint(40000, 60000),
            "dst_port": random.randint(1, 1024),  # Common ports
            "actor_id": "scanner",
            "message": f"Port scan detected from {attacker_ip} scanning {target_ip}",
            "metadata": {
                "is_attack": True,
                "attack_type": "port_scan",
                "mitre_technique": "T1595.001",
                "scan_type": "tcp_syn",
                "ports_scanned": self.attack_counter,
                "scan_rate": "fast"
            }
        }

        return event

    def _generate_ransomware_event(self) -> Dict[str, Any]:
        """Generate ransomware attack event (MITRE T1486)."""
        attacker_ip = random.choice(self.ATTACKER_IPS)
        target_ip = f"10.0.1.{random.randint(10, 50)}"

        stages = ["initial_access", "encryption_start", "file_encryption", "ransom_note", "data_exfiltration"]
        stage = stages[min(self.attack_counter // 5, len(stages) - 1)]

        event = {
            "@timestamp": datetime.utcnow().isoformat() + "Z",
            "component": "traffic_management",
            "event_type": "mass_encryption" if "encryption" in stage else "suspicious_activity",
            "severity": "critical",
            "city_zone": "zone_central",
            "src_ip": target_ip,  # Encrypted machine
            "dst_ip": attacker_ip,  # C2 server
            "src_port": random.randint(40000, 60000),
            "dst_port": 443,
            "actor_id": "ransomware_agent",
            "message": f"Ransomware activity detected: {stage}",
            "metadata": {
                "is_attack": True,
                "attack_type": "ransomware",
                "mitre_technique": "T1486",
                "ransomware_family": "CityLocker",
                "stage": stage,
                "files_encrypted": self.attack_counter * 10,
                "ransom_amount_btc": 5.0
            }
        }

        return event

    def _generate_mitm_event(self) -> Dict[str, Any]:
        """Generate Man-in-the-Middle attack event (MITRE T1040)."""
        attacker_ip = "10.0.0.50"  # Internal attacker
        victim_ip = f"10.0.1.{random.randint(1, 100)}"
        target_ip = f"10.0.1.{random.randint(101, 200)}"

        event = {
            "@timestamp": datetime.utcnow().isoformat() + "Z",
            "component": "traffic_management",
            "event_type": "promiscuous_mode",
            "severity": "high",
            "city_zone": random.choice(self.ZONES),
            "src_ip": attacker_ip,
            "dst_ip": victim_ip,
            "src_port": random.randint(40000, 60000),
            "dst_port": random.choice([80, 1883, 502]),  # HTTP, MQTT, Modbus
            "actor_id": "mitm_attacker",
            "message": f"ARP poisoning detected - MITM attack in progress",
            "metadata": {
                "is_attack": True,
                "attack_type": "mitm",
                "mitre_technique": "T1040",
                "attack_method": "arp_poisoning",
                "captured_protocols": ["http", "mqtt"],
                "credentials_captured": random.choice([True, False])
            }
        }

        return event

    def _generate_suspicious_event(self) -> Dict[str, Any]:
        """Generate a generic suspicious activity event."""
        zone = random.choice(self.ZONES)
        suspicious_ip = random.choice(self.ATTACKER_IPS)

        event = {
            "@timestamp": datetime.utcnow().isoformat() + "Z",
            "component": "traffic_management",
            "event_type": "suspicious_activity",
            "severity": "high",
            "city_zone": zone,
            "src_ip": suspicious_ip,
            "dst_ip": f"10.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}",
            "src_port": random.randint(40000, 60000),
            "dst_port": random.choice([22, 23, 3389, 445]),  # Common attack ports
            "actor_id": "unknown",
            "message": f"Suspicious traffic detected in {zone}",
            "metadata": {
                "is_attack": True,
                "attack_type": "suspicious_activity",
                "attack_start_time": datetime.utcnow().isoformat() + "Z"
            }
        }

        return event

    def generate_event(self) -> Dict[str, Any]:
        """Generate an event based on current mode."""
        if self.mode == "attack":
            return self.generate_attack_event()
        else:
            return self.generate_normal_event()
