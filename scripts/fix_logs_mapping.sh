#!/bin/bash
#
# Fix logs index mapping for asset_id field
#

echo "Creating index template for logs-* with correct asset_id mapping..."

curl -X PUT 'http://localhost:9200/_index_template/logs-template' \
  -H 'Content-Type: application/json' \
  -d '{
  "index_patterns": ["logs-*"],
  "template": {
    "mappings": {
      "properties": {
        "asset_id": {"type": "keyword"},
        "@timestamp": {"type": "date"},
        "component": {"type": "keyword"},
        "event_type": {"type": "keyword"},
        "severity": {"type": "keyword"},
        "message": {"type": "text"}
      }
    }
  }
}'

echo ""
echo "✓ Template created"
echo ""
echo "Note: Existing logs-* indices won't be updated."
echo "New events will use the correct mapping."
echo ""
echo "To reindex existing data (optional):"
echo "  1. Stop simulators: docker compose stop traffic_sim iot_sim"
echo "  2. Delete old indices: curl -X DELETE 'http://localhost:9200/logs-*'"
echo "  3. Restart simulators: docker compose up -d traffic_sim iot_sim"
