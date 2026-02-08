"""Scenario runner logic."""
import logging
import time
import requests
from typing import Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)


class ScenarioRunner:
    """Runs attack scenarios by orchestrating simulators."""

    def __init__(self, simulator_urls: Dict[str, str]):
        """
        Initialize scenario runner.

        Args:
            simulator_urls: Dictionary mapping service names to their URLs
        """
        self.simulator_urls = simulator_urls

    def run_scenario(self, scenario: Dict[str, Any]) -> Dict[str, Any]:
        """
        Run a scenario.

        Args:
            scenario: Scenario definition dictionary

        Returns:
            Results dictionary
        """
        scenario_id = scenario["scenario_id"]
        scenario_name = scenario["name"]

        # Generate steps from attack pattern if not provided
        steps = scenario.get("steps")
        if not steps:
            steps = self._generate_steps_from_attack_pattern(scenario)

        logger.info(f"Starting scenario: {scenario_name} ({scenario_id})")

        start_time = datetime.utcnow()
        results = {
            "scenario_id": scenario_id,
            "started_at": start_time.isoformat() + "Z",
            "steps_executed": [],
            "status": "running"
        }

        try:
            # Execute each step
            for i, step in enumerate(steps):
                delay = step.get("delay_seconds", 0)
                service = step.get("service")
                action = step.get("action")
                params = step.get("params", {})

                # Wait for delay
                if delay > 0:
                    logger.info(f"Waiting {delay} seconds before step {i+1}")
                    time.sleep(delay)

                # Execute step
                logger.info(f"Executing step {i+1}: {action} on {service}")
                step_result = self._execute_step(service, action, params)

                results["steps_executed"].append({
                    "step": i + 1,
                    "service": service,
                    "action": action,
                    "params": params,
                    "result": step_result,
                    "timestamp": datetime.utcnow().isoformat() + "Z"
                })

                if not step_result.get("success", False):
                    logger.error(f"Step {i+1} failed: {step_result.get('error')}")
                    # Continue executing remaining steps even if one fails

            end_time = datetime.utcnow()
            duration = (end_time - start_time).total_seconds()

            results["status"] = "completed"
            results["completed_at"] = end_time.isoformat() + "Z"
            results["duration_seconds"] = duration

            logger.info(f"Scenario {scenario_name} completed in {duration:.2f} seconds")

        except Exception as e:
            logger.error(f"Error running scenario {scenario_name}: {e}")
            results["status"] = "failed"
            results["error"] = str(e)
            results["completed_at"] = datetime.utcnow().isoformat() + "Z"

        return results

    def _generate_steps_from_attack_pattern(self, scenario: Dict[str, Any]) -> list:
        """Generate scenario steps from attack pattern and MITRE technique."""
        attack_pattern = scenario.get("attack_pattern", "").lower()
        target_component = scenario.get("target_component", "traffic_management")
        duration = scenario.get("duration_seconds", 60)

        # Map target component to simulator service
        component_to_service = {
            "traffic_management": "traffic_sim",
            "iot_sensors": "iot_sim",
            "network_infrastructure": "network_emulator"
        }
        service = component_to_service.get(target_component, "traffic_sim")

        # Map attack pattern to attack type
        pattern_to_attack_type = {
            "brute force": "brute_force",
            "ddos": "ddos",
            "port scan": "port_scan",
            "ransomware": "ransomware",
            "data exfiltration": "mitm",
            "malware": "malware",
            "dos": "ddos",
            "resource hijacking": "cryptojacking"
        }

        attack_type = pattern_to_attack_type.get(attack_pattern, "suspicious")

        steps = [
            {
                "service": service,
                "action": "start_attack",
                "params": {
                    "type": attack_type,
                    "target_zone": "zone_central",
                    "attacker_ip": "45.129.56.200"
                },
                "delay_seconds": 0
            },
            {
                "service": service,
                "action": "wait",
                "params": {},
                "delay_seconds": duration
            },
            {
                "service": service,
                "action": "stop_attack",
                "params": {},
                "delay_seconds": 0
            }
        ]

        logger.info(f"Generated {len(steps)} steps for attack pattern: {attack_pattern}")
        return steps

    def _execute_step(self, service: str, action: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a single scenario step."""
        if service not in self.simulator_urls:
            return {
                "success": False,
                "error": f"Unknown service: {service}"
            }

        base_url = self.simulator_urls[service]

        # Map action to API endpoint
        endpoint_map = {
            "start_attack": "/attack/start",
            "stop_attack": "/attack/stop",
            "set_mode": "/mode"
        }

        endpoint = endpoint_map.get(action)
        if not endpoint:
            return {
                "success": False,
                "error": f"Unknown action: {action}"
            }

        url = f"{base_url}{endpoint}"

        try:
            # Make HTTP request
            response = requests.post(url, json=params, timeout=10)

            if response.status_code == 200:
                return {
                    "success": True,
                    "response": response.json()
                }
            else:
                return {
                    "success": False,
                    "error": f"HTTP {response.status_code}: {response.text}"
                }

        except requests.exceptions.Timeout:
            return {
                "success": False,
                "error": "Request timeout"
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    def health_check_simulators(self) -> Dict[str, bool]:
        """Check health status of all simulators."""
        health_status = {}

        for service, url in self.simulator_urls.items():
            try:
                response = requests.get(f"{url}/health", timeout=5)
                health_status[service] = response.status_code == 200
            except Exception as e:
                logger.error(f"Health check failed for {service}: {e}")
                health_status[service] = False

        return health_status
