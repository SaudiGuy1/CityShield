# OpenSearch Dashboards Integration Guide

## Overview

CityShield integrates with OpenSearch Dashboards to provide deep-dive event investigation capabilities. When you click "View in OpenSearch" from any alert, you'll be taken directly to the Discover interface with pre-filtered events.

## How It Works

### URL Format

OpenSearch Dashboards uses **RISON** (a URL-friendly variant of JSON) to encode state in URLs. The URL structure is:

```
http://localhost:5601/app/discover#/?_g=GLOBAL_STATE&_a=APP_STATE
```

Where:
- `_g` = Global state (time range, filters, refresh interval)
- `_a` = App state (index pattern, query, columns, sort)

### Current Implementation

When you click "View in OpenSearch" from an alert:

```typescript
// Build time range (alert time ± 2.5 minutes)
const from = (alert.triggered_at - 2.5min).toISOString()
const to = (alert.triggered_at + 2.5min).toISOString()

// Build query from alert context
const query = 'component:network_infrastructure AND city_zone:zone-a'

// Build RISON-encoded URL
const globalState = `(filters:!(),time:(from:'${from}',to:'${to}'))`
const appState = `(columns:!('@timestamp',component,event_type,severity,message),index:'logs-*',interval:auto,query:(language:lucene,query:'${query}'))`

const url = `http://localhost:5601/app/discover#/?_g=${globalState}&_a=${appState}`
```

### Index Patterns Used

CityShield has the following index patterns configured:

| Pattern | Description | Use Case |
|---------|-------------|----------|
| `logs-*` | All log indices (default) | General event investigation |
| `logs-network` | Network infrastructure events | Network-specific analysis |
| `logs-traffic` | Traffic management events | Traffic system investigation |
| `logs-iot` | IoT sensor events | Sensor data analysis |
| `alerts` | Security alerts | Alert correlation |

## Troubleshooting

### Issue: Empty Page in OpenSearch Dashboards

**Symptoms:**
- Clicking "View in OpenSearch" opens a blank/empty page
- No events visible
- Dashboard seems to load but shows nothing

**Causes and Fixes:**

#### 1. Index Pattern Not Configured

**Check:**
```bash
curl -s 'http://localhost:5601/api/saved_objects/index-pattern/logs-*' \
  -H 'osd-xsrf: true' | jq '.attributes.title'
```

**Expected:** `"logs-*"`

**Fix if missing:**
```bash
curl -X POST 'http://localhost:5601/api/saved_objects/index-pattern/logs-*' \
  -H 'osd-xsrf: true' \
  -H 'Content-Type: application/json' \
  -d '{
    "attributes": {
      "title": "logs-*",
      "timeFieldName": "@timestamp"
    }
  }'
```

Or run the initialization script:
```bash
docker exec cityshield_backend python /app/scripts/init_dashboards.py
```

#### 2. No Data in Time Range

**Check:**
```bash
# Count events in last hour
curl -s 'http://localhost:9200/logs-*/_count' | jq '.count'
```

**Fix:**
- Run attack scenarios to generate events
- Ensure simulators are running
- Check that detection engine is processing logs

#### 3. Query Syntax Errors

The query uses Lucene syntax. Common errors:

**❌ Invalid:**
```
component=network_infrastructure   # Wrong operator
component network_infrastructure    # Missing operator
```

**✅ Valid:**
```
component:network_infrastructure                          # Single term
component:network AND severity:high                       # AND operator
component:network OR component:traffic                    # OR operator
component:network* AND message:"failed authentication"    # Wildcards and phrases
```

#### 4. URL Encoding Issues

**Problem:** Over-encoding can break RISON format

**❌ Wrong:**
```typescript
const url = encodeURIComponent(`http://localhost:5601/app/discover#/?_g=...`)
// This encodes the entire URL including RISON syntax
```

**✅ Correct:**
```typescript
const query = 'component:network'  // Only encode query values if they contain special chars
const globalState = `(time:(from:'...',to:'...'))`  // Don't encode RISON structure
const url = `http://localhost:5601/app/discover#/?_g=${globalState}`
```

#### 5. Time Range Issues

**Check if time range makes sense:**
```typescript
// Alert triggered at: 2026-02-14T03:00:00Z
// Search window: ±2.5 minutes
// from: 2026-02-14T02:57:30Z
// to:   2026-02-14T03:02:30Z
```

**Fix if needed:**
- Adjust time window in `Alerts.tsx` (currently ±2.5 minutes)
- Ensure alert timestamps are in ISO 8601 format with Z suffix
- Check that events have `@timestamp` field

#### 6. Default Index Not Set

**Set default index pattern:**
```bash
curl -X POST 'http://localhost:5601/api/opensearch-dashboards/settings/defaultIndex' \
  -H 'osd-xsrf: true' \
  -H 'Content-Type: application/json' \
  -d '{"value":"logs-*"}'
```

## Manual Testing

### Test URL Generation

Create a test HTML file:

```html
<!DOCTYPE html>
<html>
<body>
<script>
const from = new Date(Date.now() - 5 * 60 * 1000).toISOString()
const to = new Date().toISOString()
const query = 'component:network_infrastructure'

const globalState = `(filters:!(),time:(from:'${from}',to:'${to}'))`
const appState = `(columns:!('@timestamp',component,event_type,severity,message),index:'logs-*',interval:auto,query:(language:lucene,query:'${query}'))`
const url = `http://localhost:5601/app/discover#/?_g=${globalState}&_a=${appState}`

console.log('Generated URL:', url)
window.location.href = url
</script>
</body>
</html>
```

Open this file in a browser - it should navigate directly to OpenSearch Dashboards with results.

### Test Index Pattern Directly

Navigate manually to:
```
http://localhost:5601/app/discover#/?_a=(index:'logs-*')
```

This should open Discover with the `logs-*` index pattern loaded.

### Test Query Directly in OpenSearch

```bash
curl -s 'http://localhost:9200/logs-*/_search' \
  -H 'Content-Type: application/json' \
  -d '{
    "query": {
      "bool": {
        "must": [
          {"match": {"component": "network_infrastructure"}},
          {"match": {"city_zone": "zone-a"}}
        ]
      }
    },
    "size": 10
  }' | jq '.hits.total.value'
```

Should return event count > 0.

## Advanced Usage

### Custom Column Selection

Modify the columns shown in Discover:

```typescript
const appState = `(columns:!('custom_field1','custom_field2','message'),index:'logs-*',...)`
```

### Add Filters

Add pre-applied filters:

```typescript
const globalState = `(filters:!((
  meta:(index:'logs-*',key:severity,value:critical),
  query:(match_phrase:(severity:critical))
)),time:(from:'${from}',to:'${to}'))`
```

### Sort Order

Change default sort:

```typescript
const appState = `(...,sort:!(!('severity',desc),!('@timestamp',desc)))`
```

### Different Index Pattern

Use a specific index instead of `logs-*`:

```typescript
const appState = `(index:'logs-network',...)`  // Network events only
```

## Integration with CityShield Features

### From Alerts Page

1. User expands alert
2. Clicks "View Related Events"
3. **EventDrillDown** component shows events in-app
4. User clicks "View in OpenSearch" for deeper analysis
5. Opens OpenSearch Dashboards with:
   - Pre-filtered time range
   - Pre-filtered component and zone
   - All related event fields visible

### From Device Management Page

Future enhancement: Add "View Events in OpenSearch" from device detail page:

```typescript
const viewDeviceEvents = (deviceId: string) => {
  const now = new Date()
  const from = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString() // 24h ago
  const to = now.toISOString()
  const query = `asset_id:${deviceId} OR actor_id:${deviceId}`

  const globalState = `(time:(from:'${from}',to:'${to}'))`
  const appState = `(index:'logs-*',query:(language:lucene,query:'${query}'))`

  window.open(`http://localhost:5601/app/discover#/?_g=${globalState}&_a=${appState}`, '_blank')
}
```

### From Attack Effectiveness Analyzer

Link detection gaps to OpenSearch:

```typescript
const viewMissedAttacks = (correlationId: string) => {
  const query = `correlation_id:${correlationId} AND is_attack:true`
  // ... build URL as above
}
```

## Security Considerations

### Authentication

OpenSearch Dashboards in this setup has:
- ✅ Same-origin policy (runs on localhost)
- ⚠️ No authentication enabled (development mode)
- ⚠️ Direct access to all indices

**For production:**
1. Enable OpenSearch security plugin
2. Configure role-based access control
3. Use authentication tokens in URLs
4. Implement SSO integration

### Data Exposure

All events in `logs-*` indices are accessible through Discover.

**Considerations:**
- Sensitive data should be masked in logs
- Use index patterns to restrict access by role
- Audit OpenSearch access logs

## Performance Tips

### Large Result Sets

If discover page is slow:
1. Reduce time window (±2.5min default is good)
2. Use more specific queries
3. Limit columns displayed
4. Consider using aggregations instead

### Index Performance

Ensure indices are optimized:
```bash
# Force merge old indices
curl -X POST "http://localhost:9200/logs-network/_forcemerge?max_num_segments=1"

# Check index size
curl -s "http://localhost:9200/_cat/indices/logs-*?v&s=store.size:desc"
```

## References

- **RISON Encoding**: https://github.com/Nanonid/rison
- **OpenSearch Dashboards URL Guide**: https://opensearch.org/docs/latest/dashboards/discover/index-discover/
- **Lucene Query Syntax**: https://opensearch.org/docs/latest/query-dsl/full-text/query-string/

---

**Last Updated**: 2026-02-14
**CityShield Version**: 2.0 - Real Attack Execution Edition
**OpenSearch Dashboards Version**: 2.x
