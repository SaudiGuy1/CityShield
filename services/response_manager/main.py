"""Response manager main application."""
import os
import time
import logging
from datetime import datetime, timedelta
from opensearchpy import OpenSearch, RequestsHttpConnection

from executor import ResponseExecutor

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuration
OPENSEARCH_URL = os.getenv("OPENSEARCH_URL", "http://opensearch:9200")
OPENSEARCH_USER = os.getenv("OPENSEARCH_USER", "admin")
OPENSEARCH_PASS = os.getenv("OPENSEARCH_PASS", "admin")
POLL_INTERVAL = int(os.getenv("RESPONSE_POLL_INTERVAL_SECONDS", "30"))
RESPONSE_ENABLED = os.getenv("RESPONSE_ENABLED", "true").lower() == "true"


def get_actionable_alerts(client: OpenSearch) -> list:
    """
    Get alerts that need response actions.

    Returns alerts that are:
    - Status: open
    - Severity: high or critical
    - Not yet responded to
    """
    query = {
        "query": {
            "bool": {
                "must": [
                    {"term": {"status": "open"}},
                    {"terms": {"severity": ["high", "critical"]}},
                    {
                        "bool": {
                            "should": [
                                {"bool": {"must_not": {"exists": {"field": "response"}}}},
                                {"term": {"response.status": "pending"}}
                            ]
                        }
                    }
                ]
            }
        },
        "size": 100,
        "sort": [{"triggered_at": {"order": "asc"}}]
    }

    try:
        result = client.search(index="alerts", body=query)
        alerts = [hit["_source"] for hit in result["hits"]["hits"]]
        return alerts
    except Exception as e:
        logger.error(f"Error querying actionable alerts: {e}")
        return []


def get_rule_response_actions(client: OpenSearch, rule_id: str) -> list:
    """Get response actions for a rule from the rules index."""
    try:
        result = client.get(index="rules", id=rule_id)
        rule = result["_source"]
        return rule.get("response_actions", [])
    except Exception as e:
        logger.warning(f"Could not get response actions for rule {rule_id}: {e}")
        return []


def update_alert_response(client: OpenSearch, alert_id: str, response_data: dict):
    """Update alert with response execution results."""
    try:
        client.update(
            index="alerts",
            id=alert_id,
            body={"doc": {"response": response_data}},
            refresh=True
        )
        logger.info(f"Updated alert {alert_id} with response data")
    except Exception as e:
        logger.error(f"Error updating alert {alert_id}: {e}")


def main():
    """Main response manager loop."""
    logger.info("Starting CityShield Response Manager...")

    if not RESPONSE_ENABLED:
        logger.warning("Response manager is disabled by configuration")
        logger.info("Set RESPONSE_ENABLED=true to enable automated responses")
        # Keep running but don't execute responses
        while True:
            time.sleep(POLL_INTERVAL)

    # Connect to OpenSearch
    logger.info(f"Connecting to OpenSearch at {OPENSEARCH_URL}")
    client = OpenSearch(
        hosts=[OPENSEARCH_URL],
        http_auth=(OPENSEARCH_USER, OPENSEARCH_PASS),
        use_ssl=False,
        verify_certs=False,
        connection_class=RequestsHttpConnection,
        timeout=30
    )

    # Wait for OpenSearch to be ready
    max_retries = 30
    for i in range(max_retries):
        try:
            health = client.cluster.health()
            logger.info(f"OpenSearch cluster health: {health['status']}")
            break
        except Exception as e:
            if i < max_retries - 1:
                logger.warning(f"Waiting for OpenSearch to be ready... ({i+1}/{max_retries})")
                time.sleep(2)
            else:
                logger.error("Failed to connect to OpenSearch")
                raise

    # Initialize executor
    executor = ResponseExecutor()

    logger.info(f"Response manager started")
    logger.info(f"Poll interval: {POLL_INTERVAL} seconds")

    # Main response loop
    while True:
        try:
            logger.debug("Checking for actionable alerts...")

            alerts = get_actionable_alerts(client)

            if alerts:
                logger.info(f"Found {len(alerts)} actionable alerts")

                for alert in alerts:
                    alert_id = alert["alert_id"]
                    rule_id = alert["rule_id"]

                    # Get response actions from rule
                    response_actions = get_rule_response_actions(client, rule_id)

                    if not response_actions:
                        logger.info(f"No response actions defined for rule {rule_id}")
                        # Mark as processed with no action
                        update_alert_response(client, alert_id, {
                            "status": "no_action",
                            "message": "No response actions configured",
                            "completed_at": datetime.utcnow().isoformat() + "Z"
                        })
                        continue

                    # Execute each response action
                    all_responses = []
                    for action_name in response_actions:
                        logger.info(f"Executing response action: {action_name} for alert {alert_id}")

                        try:
                            result = executor.execute_action(action_name, alert)
                            all_responses.append(result)

                            if result["status"] == "success":
                                logger.info(f"Response action {action_name} completed successfully")
                            else:
                                logger.error(f"Response action {action_name} failed: {result.get('error')}")

                        except Exception as e:
                            logger.error(f"Error executing response action {action_name}: {e}")
                            all_responses.append({
                                "action": action_name,
                                "status": "failed",
                                "error": str(e),
                                "started_at": datetime.utcnow().isoformat() + "Z",
                                "completed_at": datetime.utcnow().isoformat() + "Z"
                            })

                    # Update alert with all response results
                    response_data = {
                        "actions": all_responses,
                        "status": "completed",
                        "completed_at": datetime.utcnow().isoformat() + "Z"
                    }
                    update_alert_response(client, alert_id, response_data)

            else:
                logger.debug("No actionable alerts found")

            # Sleep until next poll
            time.sleep(POLL_INTERVAL)

        except KeyboardInterrupt:
            logger.info("Response manager shutting down...")
            break
        except Exception as e:
            logger.error(f"Error in response loop: {e}")
            time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
