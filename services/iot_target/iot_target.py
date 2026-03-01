"""Simulated IoT Sensor Hub for CityShield Research Lab.

Provides:
- HTTP management interface on port 8080 (status, sensor readings, config)
- TCP listener on port 1883 simulating an MQTT broker (responds to CONNECT)

This is a training target -- deliberately minimal, no authentication.
"""
import logging
import random
import socket
import threading
from datetime import datetime, timezone

from fastapi import FastAPI
import uvicorn

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("iot_target")

app = FastAPI(title="IoT Sensor Hub (Training Target)")

SENSOR_RANGES = {
    "temperature": (15.0, 35.0, "celsius"),
    "humidity": (30.0, 90.0, "percent"),
    "pressure": (990.0, 1030.0, "hPa"),
    "air_quality_index": (10, 150, "AQI"),
    "water_level": (0.5, 5.0, "meters"),
    "noise_db": (30, 85, "dB"),
}


def _readings() -> dict:
    """Generate current sensor readings with slight random variance."""
    out = {}
    for name, (lo, hi, unit) in SENSOR_RANGES.items():
        val = round(random.uniform(lo, hi), 2)
        out[name] = {"value": val, "unit": unit}
    return out


@app.get("/health")
def health():
    return {"status": "ok", "device": "iot-sensor-hub"}


@app.get("/status")
def status():
    return {
        "device_id": "iot-range-target",
        "device_type": "smart_sensor_hub",
        "firmware": "v1.2.3",
        "uptime_seconds": 86400,
        "last_calibration": "2025-01-15T00:00:00Z",
        "protocols": ["http", "mqtt"],
        "sensor_count": len(SENSOR_RANGES),
    }


@app.get("/sensors")
def sensors():
    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "device_id": "iot-range-target",
        "readings": _readings(),
    }


@app.get("/config")
def get_config():
    return {
        "reporting_interval_seconds": 30,
        "threshold_alerts": True,
        "mqtt_port": 1883,
        "http_port": 8080,
    }


@app.post("/config")
def update_config(data: dict):
    return {"status": "updated", "applied": data}


# ---------------------------------------------------------------------------
# Lightweight MQTT-like TCP listener on port 1883
# ---------------------------------------------------------------------------

def _mqtt_listener():
    """Accept TCP connections on 1883 and respond with a minimal CONNACK."""
    srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    srv.bind(("0.0.0.0", 1883))
    srv.listen(5)
    logger.info("MQTT-like listener started on :1883")
    while True:
        conn, addr = srv.accept()
        try:
            data = conn.recv(1024)
            if data:
                # Respond with a minimal CONNACK (0x20 0x02 0x00 0x00)
                conn.sendall(b"\x20\x02\x00\x00")
        except Exception:
            pass
        finally:
            conn.close()


if __name__ == "__main__":
    threading.Thread(target=_mqtt_listener, daemon=True).start()
    uvicorn.run(app, host="0.0.0.0", port=8080, log_level="info")
