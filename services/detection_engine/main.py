"""Detection engine main application."""
import os
import time
import logging
import yaml
from pathlib import Path
from opensearchpy import OpenSearch, RequestsHttpConnection

from rule_runtime import RuleRuntime
from alert_writer import AlertWriter
from enrichment.mock_provider import MockThreatIntelProvider
from enrichment.abuseipdb_provider import AbuseIPDBProvider

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
POLL_INTERVAL = int(os.getenv("DETECTION_POLL_INTERVAL_SECONDS", "30"))
THREAT_INTEL_PROVIDER = os.getenv("THREAT_INTEL_PROVIDER", "mock")


def load_rules() -> list:
    """Load detection rules from YAML files."""
    rules = []
    rules_dir = Path("rules")

    if not rules_dir.exists():
        logger.error("Rules directory not found")
        return rules

    for rule_file in rules_dir.glob("*.yml"):
        try:
            with open(rule_file, "r") as f:
                rule = yaml.safe_load(f)
                if rule.get("enabled", True):
                    rules.append(rule)
                    logger.info(f"Loaded rule: {rule['rule_id']} - {rule['name']}")
        except Exception as e:
            logger.error(f"Error loading rule {rule_file}: {e}")

    return rules


def get_threat_intel_provider():
    """Get threat intelligence provider based on configuration."""
    if THREAT_INTEL_PROVIDER == "abuseipdb":
        provider = AbuseIPDBProvider()
        if provider.is_available():
            logger.info("Using AbuseIPDB threat intelligence provider")
            return provider
        else:
            logger.warning("AbuseIPDB provider not available, falling back to mock")
            return MockThreatIntelProvider()
    else:
        logger.info("Using mock threat intelligence provider")
        return MockThreatIntelProvider()


def _ensure_logs_template(client: OpenSearch):
    """Create an index template for logs-* indices with explicit field mappings.

    Simulators create logs-traffic, logs-iot, logs-network via plain HTTP POST
    with no mappings. OpenSearch auto-maps strings as 'text' type, which silently
    breaks terms aggregations (fielddata disabled). This template ensures all
    logs-* indices get consistent, explicit mappings.

    Fields are mapped as text + keyword sub-field so that _agg_field() in
    rule_runtime.py can use the .keyword suffix on both old and new indices.
    """
    template_body = {
        "index_patterns": ["logs-*"],
        "order": 0,
        "mappings": {
            "properties": {
                "@timestamp": {"type": "date"},
                "component": {
                    "type": "text",
                    "fields": {"keyword": {"type": "keyword", "ignore_above": 256}}
                },
                "event_type": {
                    "type": "text",
                    "fields": {"keyword": {"type": "keyword", "ignore_above": 256}}
                },
                "severity": {"type": "keyword"},
                "city_zone": {
                    "type": "text",
                    "fields": {"keyword": {"type": "keyword", "ignore_above": 256}}
                },
                "src_ip": {
                    "type": "text",
                    "fields": {"keyword": {"type": "keyword", "ignore_above": 256}}
                },
                "dst_ip": {
                    "type": "text",
                    "fields": {"keyword": {"type": "keyword", "ignore_above": 256}}
                },
                "src_port": {"type": "integer"},
                "dst_port": {"type": "integer"},
                "actor_id": {
                    "type": "text",
                    "fields": {"keyword": {"type": "keyword", "ignore_above": 256}}
                },
                "asset_id": {
                    "type": "text",
                    "fields": {"keyword": {"type": "keyword", "ignore_above": 256}}
                },
                "sensor_id": {
                    "type": "text",
                    "fields": {"keyword": {"type": "keyword", "ignore_above": 256}}
                },
                "correlation_id": {"type": "keyword"},
                "message": {"type": "text"},
                "metadata": {"type": "object"}
            }
        }
    }

    try:
        client.indices.put_template(name="logs-template", body=template_body)
        logger.info("Created/updated logs-* index template")
    except Exception as e:
        logger.warning(f"Could not create logs-* index template: {e}")


def main():
    """Main detection engine loop."""
    logger.info("Starting CityShield Detection Engine...")

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

    # Ensure index template for logs-* so new indices get explicit field mappings.
    # Existing auto-mapped indices still work because rule_runtime uses .keyword suffix.
    _ensure_logs_template(client)

    # Load rules
    rules = load_rules()
    if not rules:
        logger.warning("No rules loaded, detection engine will not generate alerts")

    # Initialize components
    rule_runtime = RuleRuntime(client)
    alert_writer = AlertWriter(client)
    threat_intel_provider = get_threat_intel_provider()

    logger.info(f"Detection engine started with {len(rules)} rules")
    logger.info(f"Poll interval: {POLL_INTERVAL} seconds")

    # Main detection loop
    while True:
        try:
            logger.debug("Running detection cycle...")

            for rule in rules:
                try:
                    # Evaluate rule
                    alerts = rule_runtime.evaluate_rule(rule)

                    # Process alerts
                    for alert_data in alerts:
                        # Enrich with threat intelligence
                        enrichment = {}
                        src_ip = alert_data.get("evidence", {}).get("src_ip")
                        if src_ip:
                            try:
                                enrichment = threat_intel_provider.enrich_ip(src_ip)
                                logger.info(f"Enriched alert with IP reputation: {src_ip} -> {enrichment.get('reputation')}")
                            except Exception as e:
                                logger.error(f"Error enriching alert: {e}")

                        # Write alert
                        alert_id = alert_writer.write_alert(alert_data, enrichment)
                        logger.info(f"Alert {alert_id} generated for rule {rule['rule_id']}")

                except Exception as e:
                    logger.error(f"Error processing rule {rule.get('rule_id')}: {e}")

            # Sleep until next poll
            time.sleep(POLL_INTERVAL)

        except KeyboardInterrupt:
            logger.info("Detection engine shutting down...")
            break
        except Exception as e:
            logger.error(f"Error in detection loop: {e}")
            time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
