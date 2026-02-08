# Threat Model

CityShield's threat model covers smart city infrastructure attack scenarios.

## Threat Actors

### External Attackers
- Nation-state actors
- Cybercriminals
- Hacktivists
- Script kiddies

### Insider Threats
- Malicious insiders with system access
- Compromised user accounts

## Attack Vectors

### Network-Based Attacks
- Port scanning (T1046)
- Denial of Service (T1499)
- Man-in-the-Middle
- Brute force authentication (T1110)

### IoT/Sensor Attacks
- Data tampering (T1565)
- Sensor spoofing
- Firmware compromise

### Application-Layer Attacks
- API abuse
- Authentication bypass
- Privilege escalation

## Assets

### Critical Assets
- Traffic management systems
- IoT sensor networks
- Citizen safety systems
- Data analytics infrastructure

### Data Assets
- Real-time sensor data
- Historical analytics
- User credentials
- Configuration data

## Security Controls

### Preventive Controls
- Network segmentation
- Authentication & authorization
- Input validation
- Rate limiting

### Detective Controls
- Rule-based threat detection
- Anomaly detection
- Log aggregation and analysis
- Threat intelligence enrichment

### Responsive Controls
- Automated containment (IP blocking, service isolation)
- Incident response playbooks
- Alert triage workflows
