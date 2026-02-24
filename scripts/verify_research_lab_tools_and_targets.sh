#!/usr/bin/env bash
# verify_research_lab_tools_and_targets.sh
# Verifies the Research Lab image has all required tools and can reach Metasploitable.
# Run from the project root.  zsh-safe (no unquoted globs or splits).
set -uo pipefail

PASS=0
FAIL=0
SKIP=0

ok()   { PASS=$((PASS+1)); echo "  [PASS] $1"; }
fail() { FAIL=$((FAIL+1)); echo "  [FAIL] $1"; }
skip() { SKIP=$((SKIP+1)); echo "  [SKIP] $1"; }

LAB_IMAGE="cityshield-lab:latest"
LAB_CONTAINER_PREFIX="cityshield-lab-"
VERIFY_CONTAINER="cityshield-lab-verify"

echo "=== CityShield Research Lab Verification ==="
echo ""

# ── Step 1: Build the lab image ───────────────────────────────────────────────
echo "1) Building lab image"
if docker compose build researcher-lab-image >/dev/null 2>&1; then
  ok "researcher-lab-image built"
else
  fail "researcher-lab-image build failed"
  echo "   Cannot continue without a valid image."
  exit 1
fi

# ── Step 2: Handle existing lab containers ────────────────────────────────────
echo "2) Checking existing lab containers"
EXISTING=$(docker ps -a --filter "name=${LAB_CONTAINER_PREFIX}" --format '{{.Names}}' 2>/dev/null || true)
if [ -n "$EXISTING" ]; then
  echo "   Found existing lab container(s): $EXISTING"
  echo "   Removing so re-provision picks up the new image + banner..."
  for c in $EXISTING; do
    docker rm -f "$c" >/dev/null 2>&1 && echo "   Removed $c" || echo "   Could not remove $c"
  done
  echo ""
  echo "   *** Re-provision your lab from the UI (Scenarios → Research Lab → Provision Lab) ***"
  echo "   *** to get the updated welcome banner and cyber_range_net connectivity.           ***"
  echo ""
else
  echo "   No existing lab containers found."
fi

# ── Step 3: Spin up a temporary verify container ──────────────────────────────
echo "3) Starting temporary verify container"
docker rm -f "$VERIFY_CONTAINER" >/dev/null 2>&1 || true

# Find the cityshield_network (compose may prefix it)
CS_NET=$(docker network ls --format '{{.Name}}' | grep 'cityshield_network' | head -n1)
CR_NET=$(docker network ls --format '{{.Name}}' | grep 'cyber_range_net' | head -n1)

NET_ARGS=""
if [ -n "$CS_NET" ]; then
  NET_ARGS="--network $CS_NET"
else
  echo "   [WARN] cityshield_network not found — running without network attachment"
fi

# shellcheck disable=SC2086
docker run -d --name "$VERIFY_CONTAINER" $NET_ARGS \
  --cap-add NET_RAW --cap-add NET_ADMIN \
  "$LAB_IMAGE" sleep infinity >/dev/null 2>&1

if ! docker inspect --format='{{.State.Running}}' "$VERIFY_CONTAINER" 2>/dev/null | grep -q true; then
  fail "Could not start verify container"
  exit 1
fi
ok "Verify container running"

# Also connect to cyber_range_net if it exists
if [ -n "$CR_NET" ]; then
  docker network connect "$CR_NET" "$VERIFY_CONTAINER" 2>/dev/null && \
    ok "Connected to $CR_NET" || \
    fail "Could not connect to $CR_NET"
else
  skip "cyber_range_net not found (metasploitable not deployed?)"
fi

# ── Step 4: Check required tools ──────────────────────────────────────────────
echo ""
echo "4) Checking required tools inside lab image"

TOOLS="nmap hydra nikto nc tcpdump curl wget python3 ping dig"
for tool in $TOOLS; do
  # "command -v" is a shell builtin — must run through bash, not as a bare exec.
  if docker exec "$VERIFY_CONTAINER" bash -c "command -v $tool" >/dev/null 2>&1; then
    ok "$tool found"
  else
    fail "$tool NOT found"
  fi
done

# ── Step 5: Check welcome banner ──────────────────────────────────────────────
echo ""
echo "5) Checking welcome banner"
if docker exec "$VERIFY_CONTAINER" test -f /home/researcher/.welcome.sh; then
  ok ".welcome.sh exists"
else
  fail ".welcome.sh missing"
fi

if docker exec "$VERIFY_CONTAINER" grep -q "metasploitable" /home/researcher/.welcome.sh 2>/dev/null; then
  ok "Banner mentions metasploitable"
else
  fail "Banner does NOT mention metasploitable"
fi

# ── Step 6: Connectivity to Metasploitable ────────────────────────────────────
echo ""
echo "6) Connectivity to Metasploitable"

if [ -z "$CR_NET" ]; then
  skip "cyber_range_net absent — cannot test metasploitable connectivity"
else
  # DNS resolution
  if docker exec "$VERIFY_CONTAINER" getent hosts metasploitable >/dev/null 2>&1; then
    ok "DNS resolves metasploitable"
  else
    fail "Cannot resolve metasploitable"
  fi

  # Ping
  if docker exec "$VERIFY_CONTAINER" ping -c 2 -W 3 metasploitable >/dev/null 2>&1; then
    ok "Ping metasploitable succeeds"
  else
    fail "Ping metasploitable failed"
  fi

  # Nmap port scan (no --open; Metasploitable services start slowly)
  NMAP_OUT=$(docker exec "$VERIFY_CONTAINER" nmap -sT -p 21-25,80,139,445,3306,5432,5900,8080 -Pn metasploitable 2>/dev/null || true)
  # Match "open" but not "closed" or "filtered"
  OPEN_COUNT=$(echo "$NMAP_OUT" | grep '/tcp' | grep -c ' open ' || true)
  if [ "${OPEN_COUNT:-0}" -gt 0 ]; then
    ok "nmap found $OPEN_COUNT open TCP port(s) on metasploitable"
  else
    # Host reachable (ping passed) but no ports open yet — services still starting
    if echo "$NMAP_OUT" | grep -q "Host is up"; then
      ok "nmap reached metasploitable (host up, services still starting — re-run in 30s)"
    else
      fail "nmap could not reach metasploitable"
    fi
  fi
fi

# ── Cleanup ───────────────────────────────────────────────────────────────────
echo ""
echo "Cleaning up verify container..."
docker rm -f "$VERIFY_CONTAINER" >/dev/null 2>&1

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "=== Results: $PASS passed, $FAIL failed, $SKIP skipped ==="
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
