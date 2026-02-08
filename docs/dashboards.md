# Dashboards

OpenSearch Dashboards provide visualization and analysis of logs and alerts.

## Access

http://localhost:5601

## Importing Dashboards

```bash
./scripts/import_dashboards.sh
```

## Built-in Dashboards

### Ingestion & Health Dashboard
**Purpose**: Monitor system health and log ingestion rates
**Panels**:
- Events over time (time-series line chart)
- Events by component (bar chart)

### Alerts Dashboard
**Purpose**: Monitor and analyze security alerts
**Panels**:
- Alerts by severity over time
- Top triggered rules
- Alert status breakdown

### Investigation Dashboard
**Purpose**: Deep-dive analysis for incident investigation
**Features**:
- Filterable log search
- Timeline visualization
- Pivot by IP, component, zone

## Creating Custom Dashboards

1. Navigate to http://localhost:5601/app/dashboards
2. Click "Create dashboard"
3. Add visualizations from "Visualize Library"
4. Save dashboard

## Index Patterns

- **logs-*** : All simulator logs (time field: @timestamp)
- **alerts** : All alerts (time field: triggered_at)

## Common Queries

### Find all attacks
```
metadata.is_attack: true
```

### Find alerts by severity
```
severity: high OR severity: critical
```

### Find events from specific IP
```
src_ip: "192.168.100.50"
```

### Find events in time range
Use the time picker in the top-right corner.
