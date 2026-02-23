#!/usr/bin/env bash
# verify_cyber_range.sh - Verify the CityShield Cyber Range is operational.
# Run from the project root on the host machine.
# All OpenSearch URLs are quoted for zsh safety.
set -euo pipefail

OPENSEARCH_URL="${OPENSEARCH_URL:-http://localhost:9200}"
PASS=0
FAIL=0

ok()   { PASS=$((PASS+1)); echo "  [PASS] $1"; }
fail() { FAIL=$((FAIL+1)); echo "  [FAIL] $1"; }

echo "=== CityShield Cyber Range Verification ==="
echo ""

# 1. Metasploitable container running
echo "1) Metasploitable container"
if docker inspect --format='{{.State.Running}}' metasploitable 2>/dev/null | grep -q true; then
  ok "metasploitable container is running"
else
  fail "metasploitable container is NOT running"
fi

# 2. Attacker container running
echo "2) Attacker container"
if docker inspect --format='{{.State.Running}}' attacker 2>/dev/null | grep -q true; then
  ok "attacker container is running"
else
  fail "attacker container is NOT running"
fi

# 3. Attacker can resolve metasploitable hostname
echo "3) DNS resolution (attacker -> metasploitable)"
if docker exec attacker getent hosts metasploitable >/dev/null 2>&1; then
  ok "attacker can resolve 'metasploitable'"
else
  fail "attacker cannot resolve 'metasploitable'"
fi

# 4. Attacker can ping metasploitable
echo "4) Ping connectivity"
if docker exec attacker ping -c 2 -W 2 metasploitable >/dev/null 2>&1; then
  ok "attacker can ping metasploitable"
else
  fail "attacker cannot ping metasploitable"
fi

# 5. city-assets contains the metasploitable asset
echo "5) OpenSearch city-assets index"
ASSET_RESPONSE=$(curl -s "${OPENSEARCH_URL}/city-assets/_doc/cyber-range-metasploitable" 2>/dev/null || true)
if echo "$ASSET_RESPONSE" | grep -q '"found":true'; then
  ok "cyber-range-metasploitable asset exists in city-assets"
else
  fail "cyber-range-metasploitable asset NOT found in city-assets"
fi

# 6. Cyber range scenario exists
echo "6) Cyber range scenario"
SCENARIO_RESPONSE=$(curl -s "${OPENSEARCH_URL}/scenarios/_doc/scenario-cyber-range-portscan" 2>/dev/null || true)
if echo "$SCENARIO_RESPONSE" | grep -q '"found":true'; then
  ok "scenario-cyber-range-portscan exists in scenarios index"
else
  fail "scenario-cyber-range-portscan NOT found (run: python backend/init_data.py)"
fi

# 7. Recent cyber_range logs in OpenSearch (last 5 minutes)
echo "7) Recent cyber range logs"
LOG_COUNT=$(curl -s "${OPENSEARCH_URL}/logs-*/_count" \
  -H 'Content-Type: application/json' \
  -d '{"query":{"bool":{"must":[{"term":{"zone":"cyber-range"}},{"range":{"@timestamp":{"gte":"now-5m"}}}]}}}' 2>/dev/null \
  | grep -o '"count":[0-9]*' | grep -o '[0-9]*' || echo "0")

if [ "${LOG_COUNT:-0}" -gt 0 ]; then
  ok "Found $LOG_COUNT cyber-range log events in last 5 minutes"
else
  echo "  [INFO] No cyber-range logs in last 5 minutes (expected if no scenario has been run yet)"
fi

# 8. Range logger container running
echo "8) Range logger"
if docker inspect --format='{{.State.Running}}' cityshield_range_logger 2>/dev/null | grep -q true; then
  ok "range_logger container is running"
else
  fail "range_logger container is NOT running"
fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
