# CityShield Attack Execution Guide

## Overview

CityShield now features a **Real Attack Execution Engine** that generates authentic malicious traffic and events to test detection capabilities. This is not a simulation - these are real attack techniques that produce genuine indicators of compromise (IOCs) for security training.

## Quick Start

### Login Credentials
```
Username: admin
Password: CityShield@Admin2026
```

### Access Points
- **Main Platform**: http://localhost:3000
- **Custom Scenario Builder**: Navigate to Scenarios → Custom Scenario Builder
- **OpenSearch Dashboards**: http://localhost:5601

## Attack Techniques Available

### 1. Brute Force Authentication (MITRE T1110)
Executes real authentication attempts against target services.

**Configurable Parameters:**
- `attempts` (10-1000): Number of authentication attempts
- `delay_ms` (10-5000): Delay between attempts in milliseconds
- `target_service` (ssh|http|https|rdp): Target service to attack
- `allow_success` (boolean): Allow one successful auth for detection testing

**Detection Signature:**
- 5+ failed authentication attempts from same source
- Should trigger alert: `CS-T1110: Brute Force Authentication`

**Example Attack Output:**
```json
{
  "technique": "Brute Force",
  "status": "completed",
  "total_attempts": 50,
  "failed_attempts": 50,
  "successful": false,
  "events_generated": 50,
  "detection_expected": true,
  "mitre_technique": "T1110"
}
```

---

### 2. Network Port Scanning (MITRE T1046)
Performs real network reconnaissance by probing ports on target hosts.

**Configurable Parameters:**
- `scan_type` (syn|connect|udp): Type of port scan
- `target_hosts` (1-50): Number of hosts to scan
- `ports` (array): List of ports to probe (default: [22, 80, 443, 1883, 502])

**Detection Signature:**
- 10+ port probes from single source
- Should trigger alert: `CS-T1595: Active Scanning - Port Scan`

**Example Attack Output:**
```json
{
  "technique": "Port Scan",
  "status": "completed",
  "hosts_scanned": 10,
  "total_probes": 60,
  "open_ports_found": 18,
  "events_generated": 61,
  "detection_expected": true,
  "mitre_technique": "T1046"
}
```

---

### 3. Command & Control Beaconing (MITRE T1071)
Establishes persistent communication with a simulated C2 server.

**Configurable Parameters:**
- `beacon_interval_seconds` (10-600): Time between beacons
- `duration_seconds` (60-3600): Total beaconing duration
- `protocol` (https|http|dns): Communication protocol
- `jitter_percent` (0-50): Random variance in timing to evade detection

**Detection Signature:**
- Regular outbound connections to suspicious IPs
- Should trigger alert: `CS-T1071: Application Layer Protocol Abuse`

**Example Attack Output:**
```json
{
  "technique": "C2 Beaconing",
  "status": "completed",
  "beacons_sent": 5,
  "c2_server": "185.234.72.11",
  "average_interval": 60,
  "events_generated": 5,
  "detection_expected": true,
  "mitre_technique": "T1071"
}
```

---

### 4. Data Exfiltration (MITRE T1041)
Simulates large data transfers to external servers.

**Configurable Parameters:**
- `data_volume_mb` (10-1000): Amount of data to exfiltrate in MB
- `method` (https|dns|ftp): Exfiltration protocol

**Detection Signature:**
- Large outbound data transfers
- Should trigger alert: Data volume threshold exceeded

**Example Attack Output:**
```json
{
  "technique": "Data Exfiltration",
  "status": "completed",
  "data_transferred_mb": 100,
  "destination": "203.0.113.50",
  "method": "https",
  "events_generated": 11,
  "detection_expected": true,
  "mitre_technique": "T1041"
}
```

---

## Using the Custom Scenario Builder

### Step 1: Navigate to Custom Builder
1. Login to CityShield
2. Go to **Scenarios** page
3. Click **"Custom Scenario Builder"** button

### Step 2: Configure Scenario Details
```
Name: Advanced Persistent Threat Simulation
Description: Multi-stage attack testing reconnaissance through exfiltration
Target Component: network_infrastructure
Target Device: (leave empty for random selection)
```

### Step 3: Build Attack Chain
Select attack techniques in order of execution:

**Example Attack Chain:**
1. **Port Scan** - Reconnaissance phase
   - scan_type: syn
   - target_hosts: 5
   - ports: [22, 80, 443, 3389]

2. **Brute Force** - Initial access
   - attempts: 100
   - delay_ms: 200
   - target_service: ssh
   - allow_success: true

3. **C2 Beacon** - Establish persistence
   - beacon_interval_seconds: 120
   - duration_seconds: 600
   - protocol: https
   - jitter_percent: 30

4. **Data Exfiltration** - Achieve objectives
   - data_volume_mb: 50
   - method: https

### Step 4: Execute Attack
Click **"Execute Attack Scenario"** to launch the attack chain. The system will:
- Execute each technique in sequence
- Generate real events in OpenSearch
- Track correlation across the attack chain
- Analyze detection effectiveness

### Step 5: View Attack Effectiveness Analysis
After completion, click **"View Attack Effectiveness Analysis"** to see:
- **Detection Rate**: Percentage of attacks detected
- **Events Generated**: Total malicious events created
- **Alerts Triggered**: Number of detection rules that fired
- **Detection Gaps**: Attacks that bypassed defenses
- **Timeline**: Chronological execution with detection status
- **Recommendations**: Suggestions to improve detection coverage

---

## Attack Effectiveness Metrics

### Detection Rate Calculation
```
Detection Rate = (Detected Techniques / Expected Detections) × 100%
```

**Rating Scale:**
- 🟢 **80-100%**: Excellent detection coverage
- 🟡 **50-79%**: Moderate gaps, improvement needed
- 🔴 **0-49%**: Critical gaps, significant blind spots

### Detection Gap Analysis
The analyzer identifies techniques that:
- Generated expected attack patterns
- Should have triggered detection rules
- But produced no alerts

**Example Detection Gap:**
```json
{
  "technique": "Brute Force",
  "mitre_id": "T1110",
  "events_generated": 10,
  "reason": "No alert triggered despite expected detection"
}
```

This indicates the brute force detection rule may need tuning (current threshold: 5+ failed attempts).

---

## Event Correlation and Tracking

### Correlation Fields
All attack events include:
```json
{
  "correlation_id": "custom-abc123",    // Links events from same attack run
  "is_attack": true,                     // Marks as intentional attack traffic
  "attack_technique": "BruteForceAttack" // Attack class name
}
```

### Querying Attack Events in OpenSearch
```json
GET /logs-*/_search
{
  "query": {
    "term": {
      "correlation_id.keyword": "custom-abc123"
    }
  }
}
```

### Event Indices by Component
- `logs-network`: Network infrastructure attacks
- `logs-traffic`: Traffic management attacks
- `logs-iot`: IoT sensor attacks

---

## Detection Rule Tuning

### Viewing Current Detection Rules
Navigate to **Rules** page to see all MITRE ATT&CK detection rules.

### Testing Rule Effectiveness
1. Execute attack with known parameters
2. View effectiveness analysis
3. If detection gap exists, adjust rule thresholds
4. Re-run attack to validate improvements

### Example: Tuning Brute Force Detection
**Current Rule:** Trigger on 5+ failed auth attempts
**Test Result:** 10 attempts, no alert
**Diagnosis:** Events generated but rule didn't fire - check rule query
**Fix:** Verify rule searches correct index and fields

---

## Pre-Built Attack Scenarios

In addition to custom scenarios, CityShield includes 10 pre-configured attack scenarios:

1. **SSH Brute Force Attack** (T1110)
2. **DDoS Against Traffic Control** (T1498)
3. **Network Reconnaissance - Port Scan** (T1595.001)
4. **IoT Botnet Recruitment** (T1071.001)
5. **Ransomware Attack on Traffic Systems** (T1486)
6. **Man-in-the-Middle Attack** (T1040)
7. **Sensor Overload DoS** (T1499)
8. **Cryptojacking IoT Devices** (T1496)
9. **SCADA System Compromise** (T1565)
10. **Wind Farm Controller Takeover** (T1071)

These execute with pre-defined parameters but also generate real attack traffic.

---

## Educational Value

### For Security Analysts
- Practice alert triage and investigation
- Drill down from alert → triggering events → source device
- Understand false positive vs true positive patterns
- Learn MITRE ATT&CK framework through real examples

### For Security Researchers
- Test detection rule effectiveness
- Identify blind spots in monitoring
- Experiment with attack variations
- Validate SIEM configurations

### For Red Team Practitioners
- Understand defender visibility
- Practice evasion techniques (jitter, low-and-slow)
- Build realistic attack chains
- Measure detection capabilities

---

## API Integration

### Execute Custom Scenario via API
```bash
curl -X POST http://localhost:8000/api/scenarios/custom \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "API Test Attack",
    "description": "Automated testing via API",
    "target_component": "network_infrastructure",
    "attack_chain": [
      {
        "technique": "brute_force",
        "parameters": {
          "attempts": 20,
          "delay_ms": 100,
          "target_service": "ssh",
          "allow_success": false
        }
      }
    ]
  }'
```

### Get Available Attack Techniques
```bash
curl http://localhost:8000/api/scenarios/attack-techniques \
  -H "Authorization: Bearer $TOKEN"
```

### Check Attack Run Status
```bash
curl http://localhost:8000/api/scenarios/runs/{run_id} \
  -H "Authorization: Bearer $TOKEN"
```

---

## Safety and Ethics

### Educational Use Only
⚠️ **WARNING**: This platform is for educational cybersecurity training only.

- All attacks are contained within the CityShield Docker environment
- No attacks are executed against external systems
- Events are logged for learning purposes
- Do not use techniques learned here for unauthorized access

### Responsible Disclosure
If you discover actual vulnerabilities in CityShield:
1. Document the issue
2. Report to project maintainers
3. Do not exploit or publicly disclose until patched

---

## Troubleshooting

### Attack Events Not Appearing
**Check:**
1. OpenSearch is running: `docker-compose ps opensearch`
2. Events in correct index: `curl http://localhost:9200/logs-network/_count`
3. Correlation ID matches: Search for `correlation_id` in OpenSearch Dashboards

### No Alerts Triggered
**Check:**
1. Detection engine is running: `docker-compose logs detection-engine`
2. Rules are loaded: Navigate to Rules page
3. Rule query matches event fields
4. Threshold is appropriate (e.g., 5 failures for brute force)

### Attack Effectiveness Shows 0%
**Reasons:**
1. Attack completed too fast for detection engine to process
2. Detection rules disabled or misconfigured
3. Events went to wrong index
4. Time window mismatch between attack and rule evaluation

### Custom Scenario Hangs on "Executing"
**Check:**
1. Backend logs: `docker-compose logs backend --tail=50`
2. Attack parameters are valid (within min/max ranges)
3. Network connectivity between containers
4. Background task queue is processing

---

## Advanced Topics

### Attack Chain Sequencing
Attacks execute sequentially with configurable delays:
```python
# In attack_engine.py
await asyncio.sleep(tech_config.get('delay_after', 5))
```

Adjust `delay_after` in parameters for custom timing between stages.

### Event Generation Rate
Control attack intensity:
- **Brute Force**: Adjust `delay_ms` (lower = faster)
- **Port Scan**: More `target_hosts` = more probes
- **C2 Beacon**: Lower `beacon_interval_seconds` = noisier
- **Exfiltration**: Higher `data_volume_mb` = more events

### Detection Analysis Algorithm
```python
# Pseudo-code from attack_engine.py
for each technique:
    if technique.detection_expected:
        check if alert exists with matching mitre_id
        if no alert found:
            add to detection_gaps[]
```

### Creating New Attack Techniques
To add a custom technique:
1. Create new class in `attack_engine.py` extending `AttackTechnique`
2. Implement `execute()` method
3. Add to `TECHNIQUE_MAP` in `AttackExecutionEngine`
4. Add parameter schema to `/api/scenarios/attack-techniques` endpoint
5. Rebuild and restart backend

---

## Support and Contribution

### Getting Help
- Review backend logs: `docker-compose logs backend`
- Check OpenSearch health: `curl http://localhost:9200/_cluster/health`
- Review this guide and project README

### Contributing
CityShield is an educational project. Contributions welcome:
- New attack techniques
- Enhanced detection rules
- UI improvements
- Documentation updates

---

## References

- **MITRE ATT&CK Framework**: https://attack.mitre.org/
- **NIST Cybersecurity Framework**: https://www.nist.gov/cyberframework
- **OpenSearch Documentation**: https://opensearch.org/docs/

---

**Last Updated**: 2026-02-14
**Platform Version**: CityShield v2.0 - Real Attack Execution Edition
**Maintained By**: University of Ha'il Cybersecurity Research Team
