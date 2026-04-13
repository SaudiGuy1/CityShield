"""Response manager main application."""
import ipaddress
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


def get_auto_response_config(client: OpenSearch, rule_id: str) -> dict:
    """
    Get auto-response configuration for a rule.

    Returns:
        dict: Auto-response config with 'enabled' and 'conditions' keys, or None if not found
    """
    try:
        result = client.get(index="rules", id=rule_id)
        rule = result["_source"]
        config = rule.get("auto_response_config")

        if not config:
            # Default: auto-response disabled
            return {"enabled": False, "conditions": {}}

        return config
    except Exception as e:
        logger.warning(f"Could not get auto-response config for rule {rule_id}: {e}")
        return {"enabled": False, "conditions": {}}


def is_ip_in_subnets(ip_str: str, subnets: list) -> bool:
    """Check if an IP address falls within any of the given CIDR subnets."""
    try:
        ip = ipaddress.ip_address(ip_str)
    except ValueError:
        return False
    for cidr in subnets:
        try:
            if ip in ipaddress.ip_network(cidr, strict=False):
                return True
        except ValueError:
            continue
    return False


def check_whitelist(alert: dict, conditions: dict) -> bool:
    """
    Check if the alert source IP is in a whitelisted subnet.

    Returns True if the source should be whitelisted (alert auto-resolved).
    """
    whitelisted = conditions.get("whitelisted_subnets", [])
    if not whitelisted:
        return False

    evidence = alert.get("evidence", {})
    src_ip = evidence.get("src_ip") or evidence.get("host_ip") or evidence.get("asset_id", "")
    if not src_ip:
        return False

    return is_ip_in_subnets(src_ip, whitelisted)


def check_auto_response_conditions(alert: dict, conditions: dict) -> tuple:
    """
    Check if alert meets auto-response conditions.

    Args:
        alert: Alert dictionary
        conditions: Auto-response conditions from rule config

    Returns:
        tuple: (bool, str) - (meets_conditions, reason_if_not)
    """
    # Check minimum severity
    min_severity = conditions.get("min_severity", "high")
    severity_order = {"low": 1, "medium": 2, "high": 3, "critical": 4}

    alert_severity = alert.get("severity", "low")
    if severity_order.get(alert_severity, 0) < severity_order.get(min_severity, 3):
        return False, f"Alert severity '{alert_severity}' below minimum '{min_severity}'"

    # Check enrichment requirement
    require_enrichment = conditions.get("require_enrichment", False)
    if require_enrichment and not alert.get("enrichment"):
        return False, "Enrichment required but not present"

    return True, "All conditions met"


def check_rate_limit(client: OpenSearch, rule_id: str, max_executions_per_hour: int) -> tuple:
    """
    Check if rate limit is exceeded for auto-response executions.

    Args:
        client: OpenSearch client
        rule_id: Rule ID
        max_executions_per_hour: Maximum allowed executions per hour

    Returns:
        tuple: (bool, int) - (within_limit, current_count)
    """
    one_hour_ago = datetime.utcnow() - timedelta(hours=1)

    query = {
        "query": {
            "bool": {
                "must": [
                    {"term": {"rule_id": rule_id}},
                    {"term": {"execution_type": "automated"}},
                    {
                        "range": {
                            "started_at": {
                                "gte": one_hour_ago.isoformat() + "Z"
                            }
                        }
                    }
                ]
            }
        },
        "size": 0
    }

    try:
        result = client.count(index="action-audit-log", body=query)
        current_count = result.get("count", 0)

        if current_count >= max_executions_per_hour:
            return False, current_count

        return True, current_count
    except Exception as e:
        logger.error(f"Error checking rate limit: {e}")
        # On error, allow execution (fail open)
        return True, 0


def create_audit_entry(client: OpenSearch, alert: dict, action_name: str, execution_type: str) -> str:
    """
    Create audit log entry for action execution.

    Args:
        client: OpenSearch client
        alert: Alert dictionary
        action_name: Name of the action
        execution_type: 'manual' or 'automated'

    Returns:
        str: Audit entry ID
    """
    import uuid

    audit_id = str(uuid.uuid4())
    audit_entry = {
        "audit_id": audit_id,
        "alert_id": alert["alert_id"],
        "rule_id": alert["rule_id"],
        "action_name": action_name,
        "execution_type": execution_type,
        "triggered_by": "system" if execution_type == "automated" else "unknown",
        "status": "pending",
        "parameters": {},
        "playbook_path": "",
        "started_at": datetime.utcnow().isoformat() + "Z"
    }

    try:
        client.index(
            index="action-audit-log",
            body=audit_entry,
            id=audit_id,
            refresh=True
        )
        logger.debug(f"Created audit entry {audit_id} for {execution_type} action {action_name}")
        return audit_id
    except Exception as e:
        logger.error(f"Error creating audit entry: {e}")
        return audit_id  # Return ID anyway


def update_audit_entry(client: OpenSearch, audit_id: str, result: dict):
    """
    Update audit log entry with execution results.

    Args:
        client: OpenSearch client
        audit_id: Audit entry ID
        result: Execution result dictionary
    """
    updates = {
        "status": result.get("status", "failed"),
        "completed_at": datetime.utcnow().isoformat() + "Z"
    }

    if "stdout" in result:
        updates["stdout"] = result["stdout"]
    if "stderr" in result:
        updates["stderr"] = result["stderr"]
    if "error" in result:
        updates["error"] = result["error"]

    try:
        client.update(
            index="action-audit-log",
            id=audit_id,
            body={"doc": updates},
            refresh=True
        )
        logger.debug(f"Updated audit entry {audit_id} with status {updates['status']}")
    except Exception as e:
        logger.error(f"Error updating audit entry {audit_id}: {e}")


def update_alert_response(client: OpenSearch, alert_id: str, response_data: dict,
                          resolve: bool = False):
    """Update alert with response execution results.

    Args:
        client: OpenSearch client
        alert_id: Alert ID
        response_data: Response data dict written to the ``response`` field
        resolve: If True, also set the top-level alert ``status`` to
                 ``"resolved"`` so ``get_actionable_alerts`` no longer picks
                 it up.
    """
    try:
        doc: dict = {"response": response_data}
        if resolve:
            doc["status"] = "resolved"
        client.update(
            index="alerts",
            id=alert_id,
            body={"doc": doc},
            refresh=True
        )
        logger.info(f"Updated alert {alert_id} with response data (resolved={resolve})")
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

                    # Check if auto-response is enabled for this rule
                    auto_config = get_auto_response_config(client, rule_id)

                    # Check whitelist FIRST — auto-resolve regardless of
                    # whether full auto-response is enabled for this rule
                    conditions = auto_config.get("conditions", {})
                    if check_whitelist(alert, conditions):
                        src_ip = alert.get("evidence", {}).get("src_ip", "unknown")
                        logger.info(
                            f"Alert {alert_id} source {src_ip} is in whitelisted subnet — auto-resolving"
                        )
                        update_alert_response(client, alert_id, {
                            "status": "auto_resolved",
                            "message": f"Source IP {src_ip} is in a whitelisted subnet",
                            "completed_at": datetime.utcnow().isoformat() + "Z",
                        }, resolve=True)
                        continue

                    if not auto_config.get("enabled", False):
                        logger.debug(f"Auto-response disabled for rule {rule_id}, skipping alert {alert_id}")
                        continue

                    conditions_met, reason = check_auto_response_conditions(alert, conditions)

                    if not conditions_met:
                        logger.info(f"Auto-response conditions not met for alert {alert_id}: {reason}")
                        continue

                    # Check rate limit
                    max_executions = conditions.get("max_executions_per_hour", 10)
                    within_limit, current_count = check_rate_limit(client, rule_id, max_executions)

                    if not within_limit:
                        logger.warning(
                            f"Rate limit exceeded for rule {rule_id}: "
                            f"{current_count} automated executions in last hour (max: {max_executions})"
                        )
                        continue

                    # Get response actions from rule
                    response_actions = get_rule_response_actions(client, rule_id)

                    if not response_actions:
                        logger.info(f"No response actions defined for rule {rule_id}")
                        # Mark as processed with no action and resolve
                        update_alert_response(client, alert_id, {
                            "status": "no_action",
                            "message": "No response actions configured",
                            "completed_at": datetime.utcnow().isoformat() + "Z"
                        }, resolve=True)
                        continue

                    # Execute each response action
                    all_responses = []
                    for action_name in response_actions:
                        logger.info(f"Executing automated response action: {action_name} for alert {alert_id}")

                        # Create audit entry for automated execution
                        audit_id = create_audit_entry(client, alert, action_name, "automated")

                        try:
                            result = executor.execute_action(action_name, alert)
                            all_responses.append(result)

                            # Update audit entry with results
                            update_audit_entry(client, audit_id, result)

                            if result["status"] == "success":
                                logger.info(f"Automated response action {action_name} completed successfully")
                            else:
                                logger.error(f"Automated response action {action_name} failed: {result.get('error')}")

                        except Exception as e:
                            logger.error(f"Error executing automated response action {action_name}: {e}")
                            error_result = {
                                "action": action_name,
                                "status": "failed",
                                "error": str(e),
                                "started_at": datetime.utcnow().isoformat() + "Z",
                                "completed_at": datetime.utcnow().isoformat() + "Z"
                            }
                            all_responses.append(error_result)

                            # Update audit entry with error
                            update_audit_entry(client, audit_id, error_result)

                    # Update alert with all response results and resolve it
                    response_data = {
                        "actions": all_responses,
                        "status": "completed",
                        "completed_at": datetime.utcnow().isoformat() + "Z"
                    }
                    update_alert_response(client, alert_id, response_data, resolve=True)

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
