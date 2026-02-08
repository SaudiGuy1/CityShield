# Detection Rules

Detection rules define threat detection logic aligned with MITRE ATT&CK framework.

## Rule Format

Rules are defined in YAML format in `services/detection_engine/rules/`.

### Required Fields

```yaml
rule_id: unique_rule_identifier
name: Human-readable rule name
description: Detailed description of what the rule detects
enabled: true
severity: high  # low, medium, high, critical
query_window_seconds: 300
match_logic:
  type: rule_type
  parameters:
    # Rule-specific parameters
technique_id: T1046  # MITRE ATT&CK technique
technique_name: Network Service Scanning
response_actions:
  - block_ip
  - isolate_service
```

## Rule Types

### net_scan

Detects network scanning by counting distinct ports accessed by a single source.

```yaml
match_logic:
  type: net_scan
  parameters:
    threshold: 10              # Min distinct ports
    field: dst_port            # Field to count
    group_by: src_ip           # Group by source IP
    event_types:               # Event types to match
      - port_scan
      - network_probe
```

### iot_anomaly

Detects IoT sensor anomalies by counting anomalous events.

```yaml
match_logic:
  type: iot_anomaly
  parameters:
    threshold: 5               # Min anomaly events
    field: actor_id            # Field to group by
    event_types:
      - sensor_anomaly
      - data_tampering
```

## Built-in Rules

### Network Port Scan (T1046)

Detects scanning of multiple ports from a single source IP within 5 minutes.

**File**: `net_scan.yml`
**Threshold**: 10 distinct ports
**Response**: block_ip

### IoT Sensor Anomaly (T1565)

Detects anomalous IoT sensor behavior including out-of-range values and tampering.

**File**: `iot_anomaly.yml`
**Threshold**: 5 anomaly events
**Response**: isolate_service

## Creating Custom Rules

1. Create a YAML file in `services/detection_engine/rules/`
2. Follow the rule format above
3. Restart the detection engine:
   ```bash
   docker compose restart detection_engine
   ```

### Example Custom Rule

```yaml
rule_id: high_severity_events
name: High Severity Event Spike
description: Detects spike in high severity events
enabled: true
severity: medium
query_window_seconds: 600
match_logic:
  type: event_count
  parameters:
    threshold: 20
    severity_filter: high
technique_id: T1499
technique_name: Endpoint Denial of Service
response_actions: []
```

## MITRE ATT&CK Mapping

All rules map to MITRE ATT&CK techniques. See `mitre_mapping.yml` for supported techniques:

- **T1046**: Network Service Scanning (Discovery)
- **T1565**: Data Manipulation (Impact)
- **T1499**: Endpoint Denial of Service (Impact)
- **T1110**: Brute Force (Credential Access)

## Response Actions

Rules can trigger automated responses:

- **block_ip**: Block malicious IP address
- **isolate_service**: Quarantine compromised service
- **revoke_token**: Revoke user authentication tokens

Multiple actions can be specified per rule.
