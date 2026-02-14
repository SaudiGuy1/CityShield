#!/bin/bash

# CityShield - OpenSearch Dashboards Index Pattern Initialization
# This script creates index patterns for all CityShield indices

echo "🔧 Initializing OpenSearch Dashboards Index Patterns..."

# Wait for OpenSearch Dashboards to be ready
until curl -s http://opensearch-dashboards:5601/api/status | grep -q "available"; do
  echo "⏳ Waiting for OpenSearch Dashboards to be ready..."
  sleep 5
done

echo "✅ OpenSearch Dashboards is ready"

# Create logs-* index pattern (all logs)
echo "📊 Creating logs-* index pattern..."
curl -X POST "http://opensearch-dashboards:5601/api/saved_objects/index-pattern/logs-*" \
  -H "osd-xsrf: true" \
  -H "Content-Type: application/json" \
  -d '{
    "attributes": {
      "title": "logs-*",
      "timeFieldName": "@timestamp"
    }
  }' 2>/dev/null

# Create logs-network index pattern
echo "📊 Creating logs-network index pattern..."
curl -X POST "http://opensearch-dashboards:5601/api/saved_objects/index-pattern/logs-network" \
  -H "osd-xsrf: true" \
  -H "Content-Type: application/json" \
  -d '{
    "attributes": {
      "title": "logs-network",
      "timeFieldName": "@timestamp"
    }
  }' 2>/dev/null

# Create logs-traffic index pattern
echo "📊 Creating logs-traffic index pattern..."
curl -X POST "http://opensearch-dashboards:5601/api/saved_objects/index-pattern/logs-traffic" \
  -H "osd-xsrf: true" \
  -H "Content-Type: application/json" \
  -d '{
    "attributes": {
      "title": "logs-traffic",
      "timeFieldName": "@timestamp"
    }
  }' 2>/dev/null

# Create logs-iot index pattern
echo "📊 Creating logs-iot index pattern..."
curl -X POST "http://opensearch-dashboards:5601/api/saved_objects/index-pattern/logs-iot" \
  -H "osd-xsrf: true" \
  -H "Content-Type: application/json" \
  -d '{
    "attributes": {
      "title": "logs-iot",
      "timeFieldName": "@timestamp"
    }
  }' 2>/dev/null

# Create alerts index pattern
echo "📊 Creating alerts index pattern..."
curl -X POST "http://opensearch-dashboards:5601/api/saved_objects/index-pattern/alerts" \
  -H "osd-xsrf: true" \
  -H "Content-Type: application/json" \
  -d '{
    "attributes": {
      "title": "alerts",
      "timeFieldName": "triggered_at"
    }
  }' 2>/dev/null

# Set logs-* as default index pattern
echo "⚙️  Setting logs-* as default index pattern..."
curl -X POST "http://opensearch-dashboards:5601/api/opensearch-dashboards/settings/defaultIndex" \
  -H "osd-xsrf: true" \
  -H "Content-Type: application/json" \
  -d '{"value":"logs-*"}' 2>/dev/null

echo ""
echo "✅ OpenSearch Dashboards index patterns initialized successfully!"
echo ""
echo "Available index patterns:"
echo "  - logs-* (all logs, default)"
echo "  - logs-network (network infrastructure)"
echo "  - logs-traffic (traffic management)"
echo "  - logs-iot (IoT sensors)"
echo "  - alerts (security alerts)"
echo ""
