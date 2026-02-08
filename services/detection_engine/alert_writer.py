"""Alert writer for writing alerts to OpenSearch."""
import logging
import uuid
from datetime import datetime
from typing import Dict, Any
from opensearchpy import OpenSearch

logger = logging.getLogger(__name__)


class AlertWriter:
    """Writes alerts to OpenSearch."""

    def __init__(self, opensearch_client: OpenSearch):
        self.client = opensearch_client

    def write_alert(self, alert_data: Dict[str, Any], enrichment: Dict[str, Any] = None) -> str:
        """
        Write an alert to OpenSearch.

        Args:
            alert_data: Alert data dictionary
            enrichment: Optional enrichment data

        Returns:
            Alert ID
        """
        alert_id = str(uuid.uuid4())
        triggered_at = datetime.utcnow()

        alert = {
            "alert_id": alert_id,
            "triggered_at": triggered_at.isoformat() + "Z",
            "rule_id": alert_data.get("rule_id"),
            "rule_name": alert_data.get("rule_name"),
            "severity": alert_data.get("severity"),
            "component": alert_data.get("component"),
            "city_zone": alert_data.get("city_zone"),
            "technique_id": alert_data.get("technique_id"),
            "technique_name": alert_data.get("technique_name"),
            "evidence": alert_data.get("evidence", {}),
            "related_query": alert_data.get("related_query"),
            "status": "open",
            "enrichment": enrichment or {},
            "response": None
        }

        try:
            self.client.index(
                index="alerts",
                body=alert,
                id=alert_id,
                refresh=True
            )
            logger.info(f"Alert written: {alert_id} for rule {alert['rule_id']}")
            return alert_id

        except Exception as e:
            logger.error(f"Error writing alert: {e}")
            raise
