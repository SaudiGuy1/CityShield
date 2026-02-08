"""Network attack event generator."""
import random
import json
from datetime import datetime
from typing import Dict, Any


class AttackGenerator:
    """Generates network attack simulation events."""

    ZONES = ["zone_1", "zone_2", "zone_3", "zone_4", "zone_central"]
    ATTACKER_IPS = ["192.168.100.50", "192.168.100.51", "203.0.113.10", "198.51.100.20"]

    def __init__(self):
        self.mode = "normal"
        self.attack_type = None
        self.attack_params = {}

    def set_mode(self, mode: str):
        """Set simulation mode."""
        self.mode = mode

    def start_attack(self, attack_type: str, params: Dict[str, Any]):
        """Start attack simulation."""
        self.mode = "attack"
        self.attack_type = attack_type
        self.attack_params = params

    def stop_attack(self):
        """Stop attack simulation."""
        self.mode = "normal"
        self.attack_type = None
        self.attack_params = {}

    def generate_normal_event(self) -> Dict[str, Any]:
        """Generate a normal network event."""
        zone = random.choice(self.ZONES)
        src_ip = f"10.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}"
        dst_ip = f"10.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}"

        event = {
            "@timestamp": datetime.utcnow().isoformat() + "Z",
            "component": "network",
            "event_type": "network_connection",
            "severity": "info",
            "city_zone": zone,
            "src_ip": src_ip,
            "dst_ip": dst_ip,
            "src_port": random.randint(30000, 60000),
            "dst_port": random.choice([80, 443, 8080, 3000]),
            "actor_id": "network_monitor",
            "message": f"Normal network connection from {src_ip} to {dst_ip}",
            "metadata": {
                "is_attack": False,
                "protocol": random.choice(["TCP", "UDP"]),
                "bytes_sent": random.randint(100, 10000)
            }
        }

        return event

    def generate_attack_event(self) -> Dict[str, Any]:
        """Generate an attack event based on attack type."""
        if self.attack_type == "port_scan":
            return self._generate_port_scan()
        elif self.attack_type == "dos":
            return self._generate_dos()
        elif self.attack_type == "brute_force":
            return self._generate_brute_force()
        else:
            return self._generate_port_scan()

    def _generate_port_scan(self) -> Dict[str, Any]:
        """Generate a port scan event."""
        attacker_ip = self.attack_params.get("attacker_ip", random.choice(self.ATTACKER_IPS))
        target_zone = self.attack_params.get("target_zone", random.choice(self.ZONES))
        target_ip = f"10.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}"

        event = {
            "@timestamp": datetime.utcnow().isoformat() + "Z",
            "component": "network",
            "event_type": "port_scan",
            "severity": "high",
            "city_zone": target_zone,
            "src_ip": attacker_ip,
            "dst_ip": target_ip,
            "src_port": random.randint(40000, 60000),
            "dst_port": random.randint(1, 65535),
            "actor_id": "network_monitor",
            "message": f"Port scan detected from {attacker_ip} targeting {target_ip}",
            "metadata": {
                "is_attack": True,
                "attack_type": "port_scan",
                "attack_start_time": datetime.utcnow().isoformat() + "Z",
                "scan_method": "SYN scan",
                "protocol": "TCP"
            }
        }

        return event

    def _generate_dos(self) -> Dict[str, Any]:
        """Generate a DoS attack event."""
        attacker_ip = self.attack_params.get("attacker_ip", random.choice(self.ATTACKER_IPS))
        target_zone = self.attack_params.get("target_zone", random.choice(self.ZONES))
        target_ip = f"10.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}"

        event = {
            "@timestamp": datetime.utcnow().isoformat() + "Z",
            "component": "network",
            "event_type": "dos_attack",
            "severity": "critical",
            "city_zone": target_zone,
            "src_ip": attacker_ip,
            "dst_ip": target_ip,
            "src_port": random.randint(40000, 60000),
            "dst_port": random.choice([80, 443, 8080]),
            "actor_id": "network_monitor",
            "message": f"DoS attack detected from {attacker_ip} targeting {target_ip}",
            "metadata": {
                "is_attack": True,
                "attack_type": "dos",
                "attack_start_time": datetime.utcnow().isoformat() + "Z",
                "requests_per_second": random.randint(1000, 10000),
                "protocol": "TCP"
            }
        }

        return event

    def _generate_brute_force(self) -> Dict[str, Any]:
        """Generate a brute force attack event."""
        attacker_ip = self.attack_params.get("attacker_ip", random.choice(self.ATTACKER_IPS))
        target_zone = self.attack_params.get("target_zone", random.choice(self.ZONES))
        target_ip = f"10.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}"

        event = {
            "@timestamp": datetime.utcnow().isoformat() + "Z",
            "component": "network",
            "event_type": "brute_force_attempt",
            "severity": "high",
            "city_zone": target_zone,
            "src_ip": attacker_ip,
            "dst_ip": target_ip,
            "src_port": random.randint(40000, 60000),
            "dst_port": random.choice([22, 3389, 21]),
            "actor_id": "network_monitor",
            "message": f"Brute force attack detected from {attacker_ip} targeting {target_ip}",
            "metadata": {
                "is_attack": True,
                "attack_type": "brute_force",
                "attack_start_time": datetime.utcnow().isoformat() + "Z",
                "failed_attempts": random.randint(10, 100),
                "target_service": random.choice(["SSH", "RDP", "FTP"])
            }
        }

        return event

    def generate_event(self) -> Dict[str, Any]:
        """Generate an event based on current mode."""
        if self.mode == "attack":
            return self.generate_attack_event()
        else:
            return self.generate_normal_event()
