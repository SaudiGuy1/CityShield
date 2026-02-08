"""Network emulator application."""
import os
import json
import time
import logging
import threading
import requests
from fastapi import FastAPI
from pydantic import BaseModel
from typing import Dict, Any, Optional

from attacks import AttackGenerator

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuration
LOG_FILE_PATH = "/data/logs/network_emulator.jsonl"
EVENT_RATE = float(os.getenv("EVENT_RATE", "1"))  # Events per second
OPENSEARCH_URL = os.getenv("OPENSEARCH_URL", "http://opensearch:9200")
OPENSEARCH_INDEX = "logs-network"

# Create FastAPI app
app = FastAPI(title="Network Emulator")

# Global state
generator = AttackGenerator()
simulator_running = True


class ModeRequest(BaseModel):
    """Mode request model."""
    mode: str  # normal or attack


class AttackRequest(BaseModel):
    """Attack request model."""
    type: str
    target_zone: Optional[str] = None
    attacker_ip: Optional[str] = "192.168.100.50"


def write_event_to_file(event: Dict[str, Any]):
    """Write event to JSON lines file."""
    try:
        with open(LOG_FILE_PATH, "a") as f:
            f.write(json.dumps(event) + "\n")
    except Exception as e:
        logger.error(f"Error writing event to file: {e}")


def write_event_to_opensearch(event: Dict[str, Any]):
    """Write event directly to OpenSearch."""
    try:
        response = requests.post(
            f"{OPENSEARCH_URL}/{OPENSEARCH_INDEX}/_doc",
            json=event,
            headers={"Content-Type": "application/json"},
            timeout=2
        )
        if response.status_code not in [200, 201]:
            logger.error(f"Failed to write to OpenSearch: {response.status_code}")
    except Exception as e:
        logger.error(f"Error writing event to OpenSearch: {e}")


def simulation_loop():
    """Main simulation loop."""
    logger.info("Starting network emulator loop...")
    while simulator_running:
        try:
            # Generate event
            event = generator.generate_event()
            write_event_to_file(event)
            write_event_to_opensearch(event)
            logger.debug(f"Generated event: {event['event_type']}")

            # Sleep based on event rate
            time.sleep(1.0 / EVENT_RATE)
        except Exception as e:
            logger.error(f"Error in simulation loop: {e}")
            time.sleep(1)


# Start simulation thread
simulation_thread = threading.Thread(target=simulation_loop, daemon=True)
simulation_thread.start()
logger.info("Network emulator started")


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "simulator": "network_emulator",
        "mode": generator.mode,
        "event_rate": EVENT_RATE
    }


@app.post("/mode")
async def set_mode(request: ModeRequest):
    """Set simulator mode."""
    generator.set_mode(request.mode)
    logger.info(f"Mode changed to: {request.mode}")
    return {"status": "ok", "mode": request.mode}


@app.post("/attack/start")
async def start_attack(request: AttackRequest):
    """Start attack simulation."""
    params = {
        "target_zone": request.target_zone,
        "attacker_ip": request.attacker_ip
    }
    generator.start_attack(request.type, params)
    logger.info(f"Attack started: {request.type} with params {params}")
    return {"status": "attack_started", "type": request.type, "params": params}


@app.post("/attack/stop")
async def stop_attack():
    """Stop attack simulation."""
    generator.stop_attack()
    logger.info("Attack stopped")
    return {"status": "attack_stopped"}


@app.get("/status")
async def get_status():
    """Get simulator status."""
    return {
        "simulator": "network_emulator",
        "mode": generator.mode,
        "attack_type": generator.attack_type,
        "attack_params": generator.attack_params,
        "event_rate": EVENT_RATE,
        "log_file": LOG_FILE_PATH
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
