"""IoT sensor event generator."""
import random
import json
from datetime import datetime
from typing import Dict, Any


class IoTGenerator:
    """Generates IoT sensor simulation events."""

    ZONES = ["zone_1", "zone_2", "zone_3", "zone_4", "zone_central"]
    SENSOR_TYPES = ["temperature", "humidity", "air_quality", "noise_level", "water_quality"]
    SENSORS = [f"sensor_{sensor_type}_{i:03d}" for sensor_type in SENSOR_TYPES for i in range(1, 21)]

    # Normal ranges for sensor values
    NORMAL_RANGES = {
        "temperature": (15, 30),
        "humidity": (30, 70),
        "air_quality": (0, 100),
        "noise_level": (30, 80),
        "water_quality": (6.5, 8.5)
    }

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

    def _get_sensor_type(self, sensor_id: str) -> str:
        """Extract sensor type from sensor ID."""
        for sensor_type in self.SENSOR_TYPES:
            if sensor_type in sensor_id:
                return sensor_type
        return "unknown"

    def generate_normal_event(self) -> Dict[str, Any]:
        """Generate a normal IoT sensor event."""
        sensor_id = random.choice(self.SENSORS)
        sensor_type = self._get_sensor_type(sensor_id)
        zone = random.choice(self.ZONES)

        # Generate realistic IPs
        src_ip = f"10.{random.randint(50, 99)}.{random.randint(1, 255)}.{random.randint(1, 255)}"

        # Get normal range for sensor type
        min_val, max_val = self.NORMAL_RANGES.get(sensor_type, (0, 100))
        sensor_value = round(random.uniform(min_val, max_val), 2)

        event = {
            "@timestamp": datetime.utcnow().isoformat() + "Z",
            "component": "iot_sensors",
            "event_type": "sensor_reading",
            "severity": "info",
            "city_zone": zone,
            "src_ip": src_ip,
            "dst_ip": "10.0.1.100",  # IoT gateway
            "src_port": random.randint(50000, 60000),
            "dst_port": 1883,  # MQTT port
            "actor_id": sensor_id,
            "message": f"{sensor_type} reading from {sensor_id}: {sensor_value}",
            "metadata": {
                "is_attack": False,
                "sensor_type": sensor_type,
                "sensor_value": sensor_value,
                "unit": self._get_unit(sensor_type)
            }
        }

        return event

    def generate_attack_event(self) -> Dict[str, Any]:
        """Generate an attack event based on attack type."""
        if self.attack_type == "anomaly_burst":
            return self._generate_anomaly_burst()
        else:
            return self._generate_data_tampering()

    def _generate_anomaly_burst(self) -> Dict[str, Any]:
        """Generate an anomaly burst event (high rate or out-of-range values)."""
        sensor_id = self.attack_params.get("sensor_id", random.choice(self.SENSORS))
        sensor_type = self._get_sensor_type(sensor_id)
        zone = self.attack_params.get("target_zone", random.choice(self.ZONES))

        src_ip = f"10.{random.randint(50, 99)}.{random.randint(1, 255)}.{random.randint(1, 255)}"

        # Generate anomalous value (way outside normal range)
        min_val, max_val = self.NORMAL_RANGES.get(sensor_type, (0, 100))
        if random.random() > 0.5:
            sensor_value = round(random.uniform(max_val * 1.5, max_val * 2), 2)
        else:
            sensor_value = round(random.uniform(min_val * 0.5, min_val * 0.1), 2)

        event = {
            "@timestamp": datetime.utcnow().isoformat() + "Z",
            "component": "iot_sensors",
            "event_type": "sensor_anomaly",
            "severity": "high",
            "city_zone": zone,
            "src_ip": src_ip,
            "dst_ip": "10.0.1.100",
            "src_port": random.randint(50000, 60000),
            "dst_port": 1883,
            "actor_id": sensor_id,
            "message": f"Anomalous {sensor_type} reading from {sensor_id}: {sensor_value}",
            "metadata": {
                "is_attack": True,
                "attack_type": "anomaly_burst",
                "attack_start_time": datetime.utcnow().isoformat() + "Z",
                "sensor_type": sensor_type,
                "sensor_value": sensor_value,
                "unit": self._get_unit(sensor_type),
                "expected_range": f"{min_val}-{max_val}"
            }
        }

        return event

    def _generate_data_tampering(self) -> Dict[str, Any]:
        """Generate a data tampering event."""
        sensor_id = random.choice(self.SENSORS)
        sensor_type = self._get_sensor_type(sensor_id)
        zone = random.choice(self.ZONES)

        attacker_ip = "192.168.100.50"

        event = {
            "@timestamp": datetime.utcnow().isoformat() + "Z",
            "component": "iot_sensors",
            "event_type": "data_tampering",
            "severity": "critical",
            "city_zone": zone,
            "src_ip": attacker_ip,
            "dst_ip": "10.0.1.100",
            "src_port": random.randint(40000, 60000),
            "dst_port": 1883,
            "actor_id": sensor_id,
            "message": f"Suspected data tampering for {sensor_id}",
            "metadata": {
                "is_attack": True,
                "attack_type": "data_tampering",
                "attack_start_time": datetime.utcnow().isoformat() + "Z",
                "sensor_type": sensor_type,
                "tampering_indicator": "unauthorized_write_attempt"
            }
        }

        return event

    def _get_unit(self, sensor_type: str) -> str:
        """Get unit for sensor type."""
        units = {
            "temperature": "celsius",
            "humidity": "percent",
            "air_quality": "AQI",
            "noise_level": "dB",
            "water_quality": "pH"
        }
        return units.get(sensor_type, "unknown")

    def generate_event(self) -> Dict[str, Any]:
        """Generate an event based on current mode."""
        if self.mode == "attack":
            return self.generate_attack_event()
        else:
            return self.generate_normal_event()
