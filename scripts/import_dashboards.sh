#!/bin/bash
# Import OpenSearch Dashboards saved objects

set -e

DASHBOARDS_URL=${DASHBOARDS_URL:-"http://localhost:5601"}
SAVED_OBJECTS_FILE="infrastructure/dashboards/saved_objects.ndjson"

echo "==================================="
echo "Import OpenSearch Dashboards"
echo "==================================="
echo ""
echo "Dashboards URL: $DASHBOARDS_URL"
echo "Saved objects file: $SAVED_OBJECTS_FILE"
echo ""

# Check if saved objects file exists
if [ ! -f "$SAVED_OBJECTS_FILE" ]; then
    echo "❌ Error: Saved objects file not found: $SAVED_OBJECTS_FILE"
    exit 1
fi

# Wait for dashboards to be ready
echo "Waiting for OpenSearch Dashboards to be ready..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if curl -sf "$DASHBOARDS_URL/api/status" > /dev/null 2>&1; then
        echo "✓ OpenSearch Dashboards is ready"
        break
    fi
    attempt=$((attempt + 1))
    echo "  Attempt $attempt/$max_attempts..."
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    echo "❌ Error: OpenSearch Dashboards not available after $max_attempts attempts"
    exit 1
fi

echo ""

# Import saved objects
echo "Importing saved objects..."

response=$(curl -X POST "$DASHBOARDS_URL/api/saved_objects/_import?overwrite=true" \
    -H "osd-xsrf: true" \
    --form file=@"$SAVED_OBJECTS_FILE" \
    -w "\n%{http_code}" \
    -s)

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "200" ]; then
    echo "✓ Dashboards imported successfully"
    echo ""
    echo "Access dashboards at: $DASHBOARDS_URL/app/dashboards"
    echo ""
else
    echo "❌ Error importing dashboards (HTTP $http_code)"
    echo "$body"
    exit 1
fi
