#!/bin/bash
#
# Production Deployment Verification Script
# Checks that all HighTopo-equivalent features are properly deployed
#

set -e

echo "=========================================="
echo "CityShield Production Verification"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check functions
check_pass() {
    echo -e "${GREEN}✓${NC} $1"
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    exit 1
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

echo "Step 1: Checking OpenSearch connectivity..."
if curl -s -f http://localhost:9200/_cluster/health > /dev/null 2>&1; then
    check_pass "OpenSearch is running"
else
    check_fail "OpenSearch is not accessible at http://localhost:9200"
fi

echo ""
echo "Step 2: Checking city-assets index..."
ASSET_COUNT=$(curl -s 'http://localhost:9200/city-assets/_count' 2>/dev/null | jq -r '.count' 2>/dev/null || echo "0")
if [ "$ASSET_COUNT" -gt "0" ]; then
    check_pass "city-assets index exists with $ASSET_COUNT assets"
else
    check_fail "city-assets index is empty. Run: ./scripts/create_assets_simple.sh"
fi

echo ""
echo "Step 3: Checking asset_id field in logs..."
LOGS_WITH_ASSET_ID=$(curl -s -X POST 'http://localhost:9200/logs-*/_search' \
    -H 'Content-Type: application/json' \
    -d '{"query":{"exists":{"field":"asset_id"}},"size":0}' 2>/dev/null | jq -r '.hits.total.value' 2>/dev/null || echo "0")
if [ "$LOGS_WITH_ASSET_ID" -gt "0" ]; then
    check_pass "Found $LOGS_WITH_ASSET_ID events with asset_id field"
else
    check_warn "No events with asset_id field yet (simulators may not be running)"
fi

echo ""
echo "Step 4: Checking backend service..."
if curl -s -f http://localhost:8000/api/health > /dev/null 2>&1; then
    check_pass "Backend API is running"
else
    check_fail "Backend is not accessible at http://localhost:8000"
fi

echo ""
echo "Step 5: Checking WebSocket endpoint..."
# Test WebSocket connection (this will fail but we check the HTTP upgrade response)
WS_RESPONSE=$(curl -s -i -N \
    -H "Connection: Upgrade" \
    -H "Upgrade: websocket" \
    -H "Sec-WebSocket-Version: 13" \
    -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
    http://localhost:8000/ws/city-telemetry 2>&1 | head -n 1)

if echo "$WS_RESPONSE" | grep -q "101"; then
    check_pass "WebSocket endpoint responds (HTTP 101 Switching Protocols)"
elif echo "$WS_RESPONSE" | grep -q "426"; then
    check_pass "WebSocket endpoint exists (requires proper WS handshake)"
else
    check_warn "WebSocket endpoint may not be configured"
fi

echo ""
echo "Step 6: Checking for mock data usage..."
MOCK_CHECK=$(grep -r "MOCK_CITY_COMPONENTS" backend/app/api/routes_overview.py 2>/dev/null || echo "")
if [ -z "$MOCK_CHECK" ]; then
    check_pass "No mock data detected in routes_overview.py"
else
    check_fail "MOCK_CITY_COMPONENTS still present in code!"
fi

echo ""
echo "Step 7: Checking detection engine..."
if docker compose ps detection_engine 2>/dev/null | grep -q "Up"; then
    check_pass "Detection engine is running"
else
    check_warn "Detection engine is not running"
fi

echo ""
echo "Step 8: Checking asset telemetry in backend logs..."
if docker compose logs backend 2>&1 | grep -q "Starting real-time asset telemetry"; then
    check_pass "Asset telemetry service is initialized"
else
    check_warn "Asset telemetry not found in logs (may need backend restart)"
fi

echo ""
echo "=========================================="
echo "Verification Summary"
echo "=========================================="
echo ""
echo "Core Infrastructure:"
check_pass "OpenSearch running with $ASSET_COUNT real assets"
check_pass "Backend API responding"
check_pass "No mock data fallbacks detected"
echo ""
echo "Real-Time Features:"
if [ "$LOGS_WITH_ASSET_ID" -gt "0" ]; then
    check_pass "Events include asset_id for 1:1 mapping"
else
    check_warn "No asset_id in events yet - start simulators"
fi
echo ""
echo "Next Steps:"
echo "  1. Open: http://localhost:3000"
echo "  2. Click 'Initialize Dashboards' on Overview page"
echo "  3. Verify 3D city shows $ASSET_COUNT real assets"
echo "  4. Check browser console for: [AssetStream] Connected"
echo ""
echo "=========================================="
echo "✓ Production verification complete"
echo "=========================================="
