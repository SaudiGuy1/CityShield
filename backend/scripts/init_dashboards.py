"""Initialize OpenSearch Dashboards with CityShield index patterns."""
import requests
import time
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DASHBOARDS_URL = "http://opensearch-dashboards:5601"

def wait_for_dashboards():
    """Wait for OpenSearch Dashboards to be ready."""
    max_retries = 30
    for i in range(max_retries):
        try:
            response = requests.get(f"{DASHBOARDS_URL}/api/status", timeout=5)
            if response.status_code == 200:
                logger.info("✅ OpenSearch Dashboards is ready")
                return True
        except requests.exceptions.RequestException:
            pass

        logger.info(f"⏳ Waiting for OpenSearch Dashboards... ({i+1}/{max_retries})")
        time.sleep(5)

    logger.error("❌ OpenSearch Dashboards did not become ready in time")
    return False

def create_index_pattern(pattern_id, title, time_field="@timestamp"):
    """Create an index pattern in OpenSearch Dashboards."""
    url = f"{DASHBOARDS_URL}/api/saved_objects/index-pattern/{pattern_id}"
    headers = {
        "osd-xsrf": "true",
        "Content-Type": "application/json"
    }
    data = {
        "attributes": {
            "title": title,
            "timeFieldName": time_field
        }
    }

    try:
        response = requests.post(url, json=data, headers=headers, timeout=10)
        if response.status_code in [200, 409]:  # 409 = already exists
            logger.info(f"✅ Index pattern created: {title}")
            return True
        else:
            logger.warning(f"⚠️  Failed to create index pattern {title}: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        logger.error(f"❌ Error creating index pattern {title}: {e}")
        return False

def set_default_index(pattern_id):
    """Set the default index pattern."""
    url = f"{DASHBOARDS_URL}/api/opensearch-dashboards/settings/defaultIndex"
    headers = {
        "osd-xsrf": "true",
        "Content-Type": "application/json"
    }
    data = {"value": pattern_id}

    try:
        response = requests.post(url, json=data, headers=headers, timeout=10)
        if response.status_code == 200:
            logger.info(f"✅ Set default index pattern: {pattern_id}")
            return True
        else:
            logger.warning(f"⚠️  Failed to set default index: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        logger.error(f"❌ Error setting default index: {e}")
        return False

def main():
    """Initialize all index patterns."""
    logger.info("🔧 Initializing OpenSearch Dashboards Index Patterns...")

    if not wait_for_dashboards():
        return False

    # Give it a bit more time to fully initialize
    time.sleep(5)

    # Create index patterns
    patterns = [
        ("logs-*", "logs-*", "@timestamp"),
        ("logs-network", "logs-network", "@timestamp"),
        ("logs-traffic", "logs-traffic", "@timestamp"),
        ("logs-iot", "logs-iot", "@timestamp"),
        ("alerts", "alerts", "triggered_at"),
        ("city-assets", "city-assets", None),
        ("scenario_runs", "scenario_runs", "started_at"),
    ]

    success_count = 0
    for pattern_id, title, time_field in patterns:
        if create_index_pattern(pattern_id, title, time_field):
            success_count += 1

    # Set default index pattern
    set_default_index("logs-*")

    logger.info(f"""
✅ OpenSearch Dashboards Initialization Complete!

📊 Index Patterns Created: {success_count}/{len(patterns)}
  - logs-* (all logs, default)
  - logs-network (network infrastructure)
  - logs-traffic (traffic management)
  - logs-iot (IoT sensors)
  - alerts (security alerts)
  - city-assets (smart city devices)
  - scenario_runs (attack scenarios)

🌐 Access OpenSearch Dashboards: http://localhost:5601
""")

    return success_count == len(patterns)

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
