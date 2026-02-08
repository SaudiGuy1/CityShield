# Scenarios

Attack scenarios for testing detection and response capabilities.

## Built-in Scenarios

### Traffic Network Scan (traffic_scan_001)
**Description**: Simulates network port scanning attack
**Duration**: 180 seconds
**Components**: network_emulator
**Attack Type**: port_scan
**Detection**: Triggers net_scan_001 rule
**Response**: block_ip

### IoT Anomaly Burst (iot_burst_001)
**Description**: Simulates anomalous IoT sensor behavior
**Duration**: 180 seconds
**Components**: iot_sim
**Attack Type**: anomaly_burst
**Detection**: Triggers iot_anomaly_001 rule
**Response**: isolate_service

## Scenario Format

Scenarios are defined in JSON format:

```json
{
  "scenario_id": "my_scenario_001",
  "name": "My Custom Scenario",
  "description": "Description of what this scenario does",
  "components": ["network_emulator"],
  "duration_seconds": 180,
  "attack_pattern": "port_scan",
  "parameters": {
    "attacker_ip": "192.168.100.50",
    "target_zone": "zone_1"
  },
  "steps": [
    {
      "delay_seconds": 0,
      "service": "network_emulator",
      "action": "start_attack",
      "params": {
        "type": "port_scan",
        "attacker_ip": "192.168.100.50"
      }
    },
    {
      "delay_seconds": 180,
      "service": "network_emulator",
      "action": "stop_attack",
      "params": {}
    }
  ]
}
```

## Running Scenarios

### Via Web UI
1. Navigate to Scenarios page
2. Select scenario
3. Click "Run Scenario"
4. Monitor progress in Alerts page

### Via API
```bash
python scripts/run_scenario.py traffic_scan_001 --wait
```

### Via Backend API
```http
POST /api/scenarios/runs
Authorization: Bearer <token>
{
  "scenario_id": "traffic_scan_001"
}
```
