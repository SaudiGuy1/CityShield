# Quick Test Guide - Critical Integration Fixes

**Date:** 2026-02-14
**Purpose:** Verify WebSocket authentication and Replay Events endpoint

---

## Prerequisites

```bash
# 1. Start backend
cd backend
uvicorn app.main:app --reload

# 2. Start frontend (in another terminal)
cd frontend
npm run dev

# 3. Ensure OpenSearch is running
# Default: localhost:9200
```

---

## Test 1: WebSocket Authentication (2 minutes)

### Step 1: Login and Get Token
1. Open browser: http://localhost:5173
2. Login with your credentials
3. Open DevTools (F12) → Console
4. Run:
   ```javascript
   console.log('Token:', localStorage.getItem('token'))
   ```
5. ✅ Verify token exists

### Step 2: Test WebSocket Connection
1. Navigate to Overview page (Digital Twin)
2. Open DevTools → Network tab → WS filter
3. Look for connection to `ws://localhost:8000/ws/city-telemetry`
4. Click on the WebSocket connection
5. ✅ Verify URL includes `?token=...` parameter
6. ✅ Verify Status is "101 Switching Protocols"

### Step 3: Verify Data Streaming
1. Switch to Console tab
2. ✅ Look for: `[AssetStream] Connected`
3. ✅ Look for: `[AssetStream] Updated XX assets` (every 2 seconds)

### Step 4: Test Rejection (No Token)
In browser console:
```javascript
const ws = new WebSocket('ws://localhost:8000/ws/city-telemetry')
ws.onclose = (e) => console.log('❌ Rejected:', e.code, e.reason)
// Expected: code=1008, reason="Missing auth token"
```

**✅ PASS CRITERIA:**
- Authenticated connection works
- Unauthorized connection rejected with code 1008
- Asset updates received every 2 seconds

---

## Test 2: Replay Events Endpoint (3 minutes)

### Step 1: Get Auth Token
In terminal:
```bash
# Login and get token (replace with your credentials)
TOKEN=$(curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}' \
  | jq -r '.access_token')

echo "Token: $TOKEN"
```

### Step 2: Get an Alert ID
```bash
# List alerts
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/alerts \
  | jq '.[0].alert_id'

# Save the alert_id for next step
ALERT_ID="<paste-alert-id-here>"
```

### Step 3: Call Replay Events Endpoint
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/alerts/${ALERT_ID}/replay-events" \
  | jq '.'
```

**✅ Expected Response:**
```json
{
  "alert_id": "...",
  "events": [
    {
      "@timestamp": "...",
      "message": "...",
      "level": "...",
      "component": "...",
      "city_zone": "..."
    }
  ],
  "time_window": {
    "start": "...",
    "end": "...",
    "center": "..."
  },
  "event_count": 123
}
```

### Step 4: Test Error Cases
```bash
# Test 1: Non-existent alert (should return 404)
curl -i -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/alerts/fake-alert-id/replay-events

# Test 2: No auth token (should return 401)
curl -i http://localhost:8000/api/alerts/${ALERT_ID}/replay-events
```

**✅ PASS CRITERIA:**
- Valid alert returns events array
- Time window is ±2.5 minutes from alert trigger
- Events sorted chronologically
- Invalid alert returns 404
- Missing token returns 401

---

## Test 3: End-to-End Workflow (5 minutes)

### Complete User Journey

1. **Login**
   - Navigate to http://localhost:5173
   - Enter credentials
   - ✅ Redirected to /overview

2. **Digital Twin**
   - Observe 3D city map
   - Open DevTools → Network → WS
   - ✅ WebSocket connected with token
   - ✅ Console shows asset updates

3. **View Alerts**
   - Navigate to /alerts
   - ✅ Alert list loads
   - ✅ No authentication errors

4. **Inspect Alert**
   - Click on an alert
   - ✅ Analysis panel expands
   - ✅ MITRE ATT&CK details shown
   - ✅ Remediation steps visible

5. **Logout**
   - Click logout
   - Try to access /overview
   - ✅ Redirected to login

**✅ PASS CRITERIA:**
- No 401/403 errors in console
- All data loads correctly
- WebSocket maintains connection
- Logout properly clears session

---

## Troubleshooting

### Issue: WebSocket won't connect

**Check:**
```bash
# 1. Backend running?
curl http://localhost:8000/api/health

# 2. Token exists?
# Browser console:
localStorage.getItem('token')

# 3. Backend logs
# Look for "WebSocket connection rejected" messages
```

**Fix:**
- Ensure backend is running
- Clear localStorage and re-login
- Check backend logs for specific error

### Issue: Replay endpoint returns empty events

**Check:**
```bash
# Verify alert exists
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/alerts/${ALERT_ID}

# Check if logs exist in time window
# Look at alert.triggered_at timestamp
```

**Fix:**
- Ensure alert has valid triggered_at timestamp
- Ensure logs-* indices contain data
- Check OpenSearch is accessible

### Issue: 401 Unauthorized

**Check:**
```bash
# Token still valid?
# Decode token to check expiration
echo $TOKEN | cut -d. -f2 | base64 -d | jq '.exp'
```

**Fix:**
- Re-login to get fresh token
- Check backend JWT_SECRET_KEY is set
- Verify clock sync (token expiration)

---

## Verification Checklist

### WebSocket Authentication
- [ ] Connection succeeds with valid token
- [ ] Connection rejected without token (code 1008)
- [ ] Connection rejected with invalid token (code 1008)
- [ ] Asset updates received every 2 seconds
- [ ] Auto-reconnect works after disconnect

### Replay Events Endpoint
- [ ] Endpoint returns events for valid alert
- [ ] Events sorted chronologically (oldest first)
- [ ] Time window is ±2.5 minutes
- [ ] Returns 404 for non-existent alert
- [ ] Returns 401 without authentication
- [ ] Maximum 500 events returned

### Frontend Integration
- [ ] Login flow works
- [ ] Digital Twin loads assets
- [ ] Alerts page shows alerts
- [ ] No console errors
- [ ] WebSocket URL includes token parameter

---

## Success Metrics

| Test | Expected | Status |
|------|----------|--------|
| WebSocket with token | Connected | ⬜ |
| WebSocket without token | Rejected 1008 | ⬜ |
| Replay events (valid) | Returns events | ⬜ |
| Replay events (invalid) | Returns 404 | ⬜ |
| Frontend loads | No errors | ⬜ |
| Asset streaming | 2s interval | ⬜ |

---

## Next Steps After Testing

### If All Tests Pass ✅
1. Commit changes to git
2. Deploy to staging environment
3. Run full regression test suite
4. Plan attack replay UI implementation

### If Tests Fail ❌
1. Check logs for specific errors
2. Verify environment variables set
3. Ensure OpenSearch has data
4. Review INTEGRATION_TEST_REPORT.md for details

---

**Quick Commands Reference**

```bash
# Start services
cd backend && uvicorn app.main:app --reload
cd frontend && npm run dev

# Get token
TOKEN=$(curl -X POST http://localhost:8000/api/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"admin"}' | jq -r '.access_token')

# Test replay endpoint
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/alerts/ALERT_ID/replay-events | jq

# Check health
curl http://localhost:8000/api/health
```

---

**Estimated Testing Time:** 10-15 minutes
**Difficulty:** Easy
**Prerequisites:** Backend and frontend running, valid login credentials
