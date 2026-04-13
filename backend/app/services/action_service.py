"""Action execution and audit service."""
import logging
import uuid
import yaml
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from pathlib import Path

from ..db.opensearch_client import opensearch_client
from ..models.action import (
    ActionMetadata,
    ActionAuditEntry,
    ActionAuditFilters
)

logger = logging.getLogger(__name__)


class ActionService:
    """Service for managing action execution and audit logging."""

    PLAYBOOKS_MAP_PATH = "/app/services/response_manager/playbooks_map.yml"
    ACTION_AUDIT_INDEX = "action-audit-log"

    @staticmethod
    def _load_playbooks_map() -> Dict[str, Any]:
        """Load playbook mappings from YAML file."""
        try:
            # Try multiple possible paths for development and production
            possible_paths = [
                ActionService.PLAYBOOKS_MAP_PATH,
                "/services/response_manager/playbooks_map.yml",
                "services/response_manager/playbooks_map.yml",
                "../services/response_manager/playbooks_map.yml"
            ]

            for path_str in possible_paths:
                path = Path(path_str)
                if path.exists():
                    with open(path, "r") as f:
                        data = yaml.safe_load(f)
                        return data.get("response_actions", {})

            logger.warning("Could not find playbooks_map.yml, using empty map")
            return {}
        except Exception as e:
            logger.error(f"Error loading playbooks map: {e}")
            return {}

    @staticmethod
    def get_available_actions() -> List[ActionMetadata]:
        """
        Get list of available response actions with metadata.

        Returns:
            List of ActionMetadata objects
        """
        playbooks_map = ActionService._load_playbooks_map()
        actions = []

        for action_name, config in playbooks_map.items():
            actions.append(ActionMetadata(
                action_name=action_name,
                description=config.get("description", ""),
                parameters=config.get("parameters", []),
                playbook=config.get("playbook", ""),
                requires_target=action_name in ["block_ip", "isolate_service", "revoke_token"]
            ))

        return actions

    @staticmethod
    def create_audit_entry(
        alert_id: str,
        rule_id: str,
        action_name: str,
        execution_type: str,
        triggered_by: str,
        parameters: Optional[Dict[str, Any]] = None,
        playbook_path: Optional[str] = None
    ) -> str:
        """
        Create a new action audit entry with status=pending.

        Args:
            alert_id: Alert ID this action is responding to
            rule_id: Rule ID that triggered the alert
            action_name: Name of the action being executed
            execution_type: 'manual' or 'automated'
            triggered_by: Username or 'system'
            parameters: Action parameters
            playbook_path: Path to the Ansible playbook

        Returns:
            audit_id: Unique ID for this audit entry
        """
        audit_id = str(uuid.uuid4())

        # Get playbook path if not provided
        if not playbook_path:
            playbooks_map = ActionService._load_playbooks_map()
            if action_name in playbooks_map:
                playbook_path = playbooks_map[action_name].get("playbook", "")

        audit_entry = {
            "audit_id": audit_id,
            "alert_id": alert_id,
            "rule_id": rule_id,
            "action_name": action_name,
            "execution_type": execution_type,
            "triggered_by": triggered_by,
            "status": "pending",
            "parameters": parameters or {},
            "playbook_path": playbook_path or "",
            "started_at": datetime.utcnow().isoformat() + "Z"
        }

        try:
            opensearch_client.index_document(
                index=ActionService.ACTION_AUDIT_INDEX,
                document=audit_entry,
                doc_id=audit_id
            )
            logger.info(f"Created audit entry {audit_id} for action {action_name}")
            return audit_id
        except Exception as e:
            logger.error(f"Error creating audit entry: {e}")
            raise

    @staticmethod
    def update_audit_entry(audit_id: str, result: Dict[str, Any]) -> None:
        """
        Update audit entry with execution results.

        Args:
            audit_id: Audit entry ID
            result: Execution result dictionary with status, stdout, stderr, etc.
        """
        updates = {
            "status": result.get("status", "failed"),
            "completed_at": datetime.utcnow().isoformat() + "Z"
        }

        # Add optional fields if present
        if "stdout" in result:
            updates["stdout"] = result["stdout"]
        if "stderr" in result:
            updates["stderr"] = result["stderr"]
        if "error" in result:
            updates["error"] = result["error"]

        try:
            opensearch_client.update_document(
                index=ActionService.ACTION_AUDIT_INDEX,
                doc_id=audit_id,
                updates=updates
            )
            logger.info(f"Updated audit entry {audit_id} with status {updates['status']}")
        except Exception as e:
            logger.error(f"Error updating audit entry {audit_id}: {e}")
            raise

    @staticmethod
    def execute_manual_action(
        alert_id: str,
        action_name: str,
        parameters: Optional[Dict[str, Any]],
        triggered_by: str
    ) -> str:
        """
        Execute a manual response action.

        This creates an audit entry and returns immediately. The actual execution
        should be handled asynchronously by the response_manager service or a
        background task.

        Args:
            alert_id: Alert ID
            action_name: Action to execute
            parameters: Action parameters
            triggered_by: Username of the user triggering this action

        Returns:
            audit_id: Audit entry ID for tracking
        """
        # Validate action exists
        playbooks_map = ActionService._load_playbooks_map()
        if action_name not in playbooks_map:
            raise ValueError(f"Unknown action: {action_name}")

        # Get alert to extract rule_id
        alert = opensearch_client.get_document(index="alerts", doc_id=alert_id)
        if not alert:
            raise ValueError(f"Alert not found: {alert_id}")

        rule_id = alert.get("rule_id", "unknown")

        # Create audit entry
        audit_id = ActionService.create_audit_entry(
            alert_id=alert_id,
            rule_id=rule_id,
            action_name=action_name,
            execution_type="manual",
            triggered_by=triggered_by,
            parameters=parameters
        )

        # TODO: Trigger actual execution (could be via message queue, direct call, etc.)
        # For now, we'll mark it as pending and let response_manager pick it up
        # or we could execute synchronously here

        logger.info(f"Manual action {action_name} queued for alert {alert_id} by {triggered_by}")
        return audit_id

    @staticmethod
    def query_audit_log(filters: ActionAuditFilters) -> List[ActionAuditEntry]:
        """
        Query action audit log with filters.

        Args:
            filters: ActionAuditFilters object with query parameters

        Returns:
            List of ActionAuditEntry objects
        """
        # Build OpenSearch query
        must_clauses = []

        if filters.alert_id:
            must_clauses.append({"term": {"alert_id": filters.alert_id}})
        if filters.rule_id:
            must_clauses.append({"term": {"rule_id": filters.rule_id}})
        if filters.action_name:
            must_clauses.append({"term": {"action_name": filters.action_name}})
        if filters.execution_type:
            must_clauses.append({"term": {"execution_type": filters.execution_type}})
        if filters.triggered_by:
            must_clauses.append({"term": {"triggered_by.keyword": filters.triggered_by}})
        if filters.status:
            must_clauses.append({"term": {"status": filters.status}})

        # Time range filter
        if filters.start_time or filters.end_time:
            range_clause = {"range": {"started_at": {}}}
            if filters.start_time:
                range_clause["range"]["started_at"]["gte"] = filters.start_time.isoformat() + "Z"
            if filters.end_time:
                range_clause["range"]["started_at"]["lte"] = filters.end_time.isoformat() + "Z"
            must_clauses.append(range_clause)

        query = {
            "query": {
                "bool": {
                    "must": must_clauses if must_clauses else [{"match_all": {}}]
                }
            },
            "size": filters.limit,
            "sort": [{"started_at": {"order": "desc"}}]
        }

        try:
            results = opensearch_client.search(
                index=ActionService.ACTION_AUDIT_INDEX,
                query=query
            )

            # Convert to ActionAuditEntry objects
            entries = []
            for doc in results:
                # Parse datetime fields
                started_at = datetime.fromisoformat(doc["started_at"].replace("Z", "+00:00"))
                completed_at = None
                if doc.get("completed_at"):
                    completed_at = datetime.fromisoformat(doc["completed_at"].replace("Z", "+00:00"))

                entries.append(ActionAuditEntry(
                    audit_id=doc["audit_id"],
                    alert_id=doc["alert_id"],
                    rule_id=doc["rule_id"],
                    action_name=doc["action_name"],
                    execution_type=doc["execution_type"],
                    triggered_by=doc["triggered_by"],
                    status=doc["status"],
                    parameters=doc.get("parameters", {}),
                    playbook_path=doc.get("playbook_path", ""),
                    stdout=doc.get("stdout"),
                    stderr=doc.get("stderr"),
                    started_at=started_at,
                    completed_at=completed_at,
                    error=doc.get("error")
                ))

            return entries
        except Exception as e:
            logger.error(f"Error querying audit log: {e}")
            return []

    @staticmethod
    def get_audit_entry(audit_id: str) -> Optional[ActionAuditEntry]:
        """
        Get a specific audit entry by ID.

        Args:
            audit_id: Audit entry ID

        Returns:
            ActionAuditEntry or None if not found
        """
        try:
            doc = opensearch_client.get_document(
                index=ActionService.ACTION_AUDIT_INDEX,
                doc_id=audit_id
            )

            if not doc:
                return None

            started_at = datetime.fromisoformat(doc["started_at"].replace("Z", "+00:00"))
            completed_at = None
            if doc.get("completed_at"):
                completed_at = datetime.fromisoformat(doc["completed_at"].replace("Z", "+00:00"))

            return ActionAuditEntry(
                audit_id=doc["audit_id"],
                alert_id=doc["alert_id"],
                rule_id=doc["rule_id"],
                action_name=doc["action_name"],
                execution_type=doc["execution_type"],
                triggered_by=doc["triggered_by"],
                status=doc["status"],
                parameters=doc.get("parameters", {}),
                playbook_path=doc.get("playbook_path", ""),
                stdout=doc.get("stdout"),
                stderr=doc.get("stderr"),
                started_at=started_at,
                completed_at=completed_at,
                error=doc.get("error")
            )
        except Exception as e:
            logger.error(f"Error getting audit entry {audit_id}: {e}")
            return None

    @staticmethod
    def check_rate_limit(
        rule_id: str,
        max_executions_per_hour: int
    ) -> bool:
        """
        Check if rate limit is exceeded for a rule.

        Args:
            rule_id: Rule ID to check
            max_executions_per_hour: Maximum allowed executions per hour

        Returns:
            True if within limit, False if limit exceeded
        """
        one_hour_ago = datetime.utcnow() - timedelta(hours=1)

        filters = ActionAuditFilters(
            rule_id=rule_id,
            execution_type="automated",
            start_time=one_hour_ago,
            limit=max_executions_per_hour + 1  # Get one more to check if exceeded
        )

        executions = ActionService.query_audit_log(filters)

        if len(executions) >= max_executions_per_hour:
            logger.warning(
                f"Rate limit exceeded for rule {rule_id}: "
                f"{len(executions)} executions in the last hour"
            )
            return False

        return True
