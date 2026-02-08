"""Response action executor using Ansible playbooks."""
import logging
import subprocess
import yaml
from datetime import datetime
from typing import Dict, Any, Optional
from pathlib import Path

logger = logging.getLogger(__name__)


class ResponseExecutor:
    """Executes response actions using Ansible playbooks."""

    def __init__(self, playbooks_map_path: str = "playbooks_map.yml"):
        """Initialize executor with playbook mappings."""
        self.playbooks_map = self._load_playbooks_map(playbooks_map_path)

    def _load_playbooks_map(self, path: str) -> Dict[str, Any]:
        """Load playbook mappings from YAML file."""
        try:
            with open(path, "r") as f:
                data = yaml.safe_load(f)
                return data.get("response_actions", {})
        except Exception as e:
            logger.error(f"Error loading playbooks map: {e}")
            return {}

    def execute_action(self, action_name: str, alert: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a response action.

        Args:
            action_name: Name of the response action (e.g., 'block_ip')
            alert: Alert data dictionary

        Returns:
            Result dictionary with status and details
        """
        if action_name not in self.playbooks_map:
            logger.error(f"Unknown response action: {action_name}")
            return {
                "action": action_name,
                "status": "failed",
                "error": f"Unknown action: {action_name}",
                "started_at": datetime.utcnow().isoformat() + "Z",
                "completed_at": datetime.utcnow().isoformat() + "Z"
            }

        playbook_config = self.playbooks_map[action_name]
        playbook_path = playbook_config.get("playbook")

        # Check if playbook exists
        if not Path(playbook_path).exists():
            logger.error(f"Playbook not found: {playbook_path}")
            return {
                "action": action_name,
                "status": "failed",
                "error": f"Playbook not found: {playbook_path}",
                "started_at": datetime.utcnow().isoformat() + "Z",
                "completed_at": datetime.utcnow().isoformat() + "Z"
            }

        # Prepare extra variables for playbook
        extra_vars = self._prepare_extra_vars(action_name, alert, playbook_config)

        # Execute playbook
        started_at = datetime.utcnow()
        logger.info(f"Executing action {action_name} for alert {alert['alert_id']}")

        try:
            result = self._run_ansible_playbook(playbook_path, extra_vars)
            completed_at = datetime.utcnow()

            return {
                "action": action_name,
                "status": "success" if result["returncode"] == 0 else "failed",
                "playbook": playbook_path,
                "extra_vars": extra_vars,
                "stdout": result.get("stdout", ""),
                "stderr": result.get("stderr", ""),
                "returncode": result.get("returncode", -1),
                "started_at": started_at.isoformat() + "Z",
                "completed_at": completed_at.isoformat() + "Z"
            }

        except Exception as e:
            logger.error(f"Error executing action {action_name}: {e}")
            return {
                "action": action_name,
                "status": "failed",
                "error": str(e),
                "started_at": started_at.isoformat() + "Z",
                "completed_at": datetime.utcnow().isoformat() + "Z"
            }

    def _prepare_extra_vars(self, action_name: str, alert: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare extra variables for Ansible playbook."""
        extra_vars = {
            "alert_id": alert.get("alert_id")
        }

        evidence = alert.get("evidence", {})

        # Action-specific variable mapping
        if action_name == "block_ip":
            extra_vars["ip_address"] = evidence.get("src_ip", "unknown")
        elif action_name == "isolate_service":
            # Determine service name from component
            component = alert.get("component", "unknown")
            service_map = {
                "traffic_management": "cityshield_traffic_sim",
                "iot_sensors": "cityshield_iot_sim",
                "network": "cityshield_network_emulator"
            }
            extra_vars["service"] = service_map.get(component, component)
        elif action_name == "revoke_token":
            extra_vars["user"] = evidence.get("user_id", "unknown")

        return extra_vars

    def _run_ansible_playbook(self, playbook_path: str, extra_vars: Dict[str, Any]) -> Dict[str, Any]:
        """Run Ansible playbook using subprocess."""
        # Build ansible-playbook command
        cmd = [
            "ansible-playbook",
            playbook_path,
            "-i", "/ansible/inventory.ini",
            "--extra-vars", yaml.dump(extra_vars)
        ]

        logger.debug(f"Running command: {' '.join(cmd)}")

        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )

            return {
                "returncode": result.returncode,
                "stdout": result.stdout,
                "stderr": result.stderr
            }

        except subprocess.TimeoutExpired:
            logger.error(f"Playbook execution timed out: {playbook_path}")
            raise
        except Exception as e:
            logger.error(f"Error running playbook: {e}")
            raise
