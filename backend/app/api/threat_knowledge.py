"""MITRE ATT&CK threat knowledge base for alert analysis."""

THREAT_KB = {
    "T1110": {
        "technique": "Brute Force",
        "tactic": "Credential Access",
        "kill_chain_phase": "Exploitation",
        "description": "Adversaries may use brute force techniques to attempt access to accounts when passwords are unknown or when password hashes are obtained. Systematic guessing of passwords is attempted using dictionaries or common password lists.",
        "danger": "If successful, the attacker gains unauthorized access to user accounts, potentially escalating privileges, moving laterally across the network, and accessing sensitive smart city control systems. Compromised traffic management credentials could allow manipulation of traffic signals causing accidents.",
        "remediation": [
            "Immediately lock the targeted accounts and force password resets",
            "Enable multi-factor authentication (MFA) on all accounts",
            "Implement account lockout policies after 5 failed attempts",
            "Block the source IP at the firewall level",
            "Review access logs for any successful unauthorized logins",
            "Deploy rate limiting on authentication endpoints"
        ],
        "indicators": "Multiple failed login attempts from the same source IP in a short time window, often targeting multiple accounts sequentially.",
        "severity_context": "High risk in smart city environments where compromised credentials can control physical infrastructure."
    },
    "T1595": {
        "technique": "Active Scanning",
        "tactic": "Reconnaissance",
        "kill_chain_phase": "Reconnaissance",
        "description": "Adversaries may execute active reconnaissance scans to gather information that can be used during targeting. Active scans involve probing victim infrastructure via network traffic to identify open ports, running services, and potential vulnerabilities.",
        "danger": "Port scanning is a precursor to more severe attacks. The attacker is mapping the network to identify exploitable services. In smart city infrastructure, this can expose SCADA systems, IoT management interfaces, and critical control systems.",
        "remediation": [
            "Block the scanning source IP immediately at the perimeter firewall",
            "Review and close unnecessary open ports on all city infrastructure",
            "Ensure all exposed services are patched and up to date",
            "Enable IDS/IPS signatures for scan detection",
            "Implement network segmentation to limit scan visibility",
            "Conduct an inventory of all exposed services and ports"
        ],
        "indicators": "Rapid connection attempts to multiple ports on one or more hosts from a single source, often in sequential or random port order.",
        "severity_context": "Moderate immediate risk but high strategic risk as it typically precedes exploitation attempts."
    },
    "T1498": {
        "technique": "Network Denial of Service",
        "tactic": "Impact",
        "kill_chain_phase": "Actions on Objectives",
        "description": "Adversaries may perform Network Denial of Service (DoS/DDoS) attacks to degrade or block the availability of targeted resources. This may involve flooding targets with traffic volumes that exceed capacity, disrupting critical smart city services.",
        "danger": "DDoS attacks on smart city infrastructure can disable traffic management systems causing gridlock and accidents, knock out emergency response coordination, disable IoT sensor networks leaving the city blind to environmental hazards, and disrupt critical public safety systems.",
        "remediation": [
            "Activate DDoS mitigation services and traffic scrubbing",
            "Implement rate limiting and traffic shaping at network edges",
            "Block attacking source IPs and subnets at the firewall",
            "Enable upstream provider DDoS protection",
            "Switch critical services to backup/failover systems",
            "Monitor for secondary attacks hidden behind the DDoS smokescreen",
            "Document the attack for law enforcement reporting"
        ],
        "indicators": "Sudden spike in network traffic volume, connection floods from multiple sources, service degradation or unavailability.",
        "severity_context": "Critical in smart city environments where service availability directly impacts public safety."
    },
    "T1071": {
        "technique": "Application Layer Protocol Abuse",
        "tactic": "Command and Control",
        "kill_chain_phase": "Command and Control",
        "description": "Adversaries may communicate using application layer protocols to avoid detection and blend in with normal traffic. This includes abusing HTTP, HTTPS, DNS, or MQTT protocols that IoT devices commonly use.",
        "danger": "Attackers using legitimate protocols for C2 communication can maintain persistent access to compromised IoT devices. This can lead to botnet recruitment of city sensors, data exfiltration of sensor readings, or manipulation of IoT device behavior without detection.",
        "remediation": [
            "Implement deep packet inspection on IoT network segments",
            "Deploy protocol-aware firewalls between IoT and control networks",
            "Monitor for unusual IoT communication patterns and destinations",
            "Enforce allowlisted communication endpoints for IoT devices",
            "Rotate IoT device credentials and certificates",
            "Isolate suspicious IoT devices for forensic analysis"
        ],
        "indicators": "IoT devices communicating with unusual external endpoints, abnormal protocol usage patterns, encrypted traffic to unexpected destinations.",
        "severity_context": "High risk as compromised IoT devices can be used as pivot points into critical infrastructure."
    },
    "T1499": {
        "technique": "Endpoint Denial of Service",
        "tactic": "Impact",
        "kill_chain_phase": "Actions on Objectives",
        "description": "Adversaries may perform Endpoint Denial of Service attacks to degrade or block the availability of services to users. This targets specific applications or services rather than the network itself, overwhelming application resources.",
        "danger": "Targeting specific IoT endpoints or city service APIs can disable individual sensor networks, making the city unable to monitor air quality, water quality, or traffic conditions in specific zones. Attackers may use this to create blind spots for physical attacks.",
        "remediation": [
            "Implement application-level rate limiting and request throttling",
            "Deploy web application firewalls (WAF) with DoS protection",
            "Scale affected services horizontally if possible",
            "Block malicious request patterns at the load balancer",
            "Enable circuit breakers to prevent cascade failures",
            "Review application logs to identify specific attack vectors"
        ],
        "indicators": "High volume of requests to specific endpoints, application error rates spiking, CPU/memory exhaustion on service hosts.",
        "severity_context": "High risk when targeting critical monitoring services that provide situational awareness."
    },
    "T1056": {
        "technique": "Input Capture - Credential Harvesting",
        "tactic": "Collection",
        "kill_chain_phase": "Collection",
        "description": "Adversaries may use methods of capturing user input to obtain credentials or collect information. This includes keylogging, credential interception, and harvesting credentials from network traffic.",
        "danger": "Captured credentials for traffic management, IoT control, or network administration systems could give attackers full control over city infrastructure. This is especially dangerous for systems that control physical processes like traffic signals or water treatment.",
        "remediation": [
            "Force immediate password changes for all potentially compromised accounts",
            "Enable encrypted communication (TLS) for all management interfaces",
            "Deploy endpoint detection and response (EDR) on management workstations",
            "Implement privileged access management (PAM) for critical systems",
            "Enable session monitoring for administrative access",
            "Audit all recent privileged operations for unauthorized changes"
        ],
        "indicators": "Unusual process activity on management workstations, network traffic containing cleartext credentials, unauthorized access to credential stores.",
        "severity_context": "Critical risk as harvested credentials provide direct access to city control systems."
    },
    "T1040": {
        "technique": "Network Sniffing",
        "tactic": "Credential Access",
        "kill_chain_phase": "Credential Access",
        "description": "Adversaries may sniff network traffic to capture information passed over the network including credentials, configuration data, and operational commands sent to city infrastructure.",
        "danger": "In smart city networks, sniffed traffic can reveal SCADA commands, sensor data, traffic control signals, and administrative credentials. Attackers can use this intelligence to plan targeted attacks against specific infrastructure components.",
        "remediation": [
            "Enforce TLS/encryption for all network communication",
            "Implement 802.1X network access control",
            "Deploy network segmentation with encrypted tunnels between segments",
            "Monitor for promiscuous mode interfaces on the network",
            "Use encrypted protocols (SNMPv3, SSH) for device management",
            "Conduct network sweep for unauthorized devices or taps"
        ],
        "indicators": "Network interfaces in promiscuous mode, ARP spoofing attempts, unexpected network taps or mirror ports.",
        "severity_context": "High risk in environments with legacy protocols or unencrypted management traffic."
    },
    "T1046": {
        "technique": "Network Service Scanning",
        "tactic": "Discovery",
        "kill_chain_phase": "Discovery",
        "description": "Adversaries may attempt to get a listing of services running on remote hosts and local network infrastructure devices, including those that may be vulnerable to remote exploitation. Common methods include port scans and service identification.",
        "danger": "Service scanning identifies attack surface in city networks. Discovered vulnerable services (outdated firmware, unpatched systems) become immediate exploitation targets. Smart city devices often run legacy software with known vulnerabilities.",
        "remediation": [
            "Block the scanning source at the network perimeter",
            "Audit all discovered services and patch vulnerable ones",
            "Implement network access control lists (ACLs) to limit service visibility",
            "Deploy honeypots to detect and study scanning activity",
            "Disable unnecessary services on all infrastructure devices",
            "Review firewall rules to minimize exposed attack surface"
        ],
        "indicators": "Sequential port connection attempts, service banner grabbing, vulnerability scanner signatures in traffic.",
        "severity_context": "Moderate direct risk but indicates active adversary interest and usually precedes exploitation."
    },
    "T1565": {
        "technique": "Data Manipulation",
        "tactic": "Impact",
        "kill_chain_phase": "Actions on Objectives",
        "description": "Adversaries may insert, delete, or manipulate data in order to influence external outcomes or hide activity, thus threatening the integrity of the data. In smart city contexts, this means falsifying sensor readings or control data.",
        "danger": "Manipulated IoT sensor data can cause incorrect automated responses: false environmental readings could trigger unnecessary evacuations or mask real hazards. Tampered traffic data could cause signal timing errors leading to accidents. Falsified water quality data could hide contamination.",
        "remediation": [
            "Implement data integrity checks and checksums on all sensor data",
            "Deploy anomaly detection on sensor reading patterns",
            "Cross-validate sensor data across multiple independent sources",
            "Enable audit logging for all data modifications",
            "Isolate and recalibrate affected sensors",
            "Review all automated actions triggered by suspicious data"
        ],
        "indicators": "Sensor readings outside normal ranges, sudden data pattern changes, inconsistency between correlated sensors.",
        "severity_context": "Critical risk as manipulated data directly impacts city operations and public safety decisions."
    }
}

# Fallback for unknown techniques
DEFAULT_ANALYSIS = {
    "technique": "Unknown Technique",
    "tactic": "Unknown",
    "kill_chain_phase": "Unknown",
    "description": "An unrecognized attack technique was detected. Further investigation is required to determine the nature and scope of the threat.",
    "danger": "Unknown attack techniques may indicate novel or sophisticated adversary activity. The full impact cannot be assessed without manual investigation.",
    "remediation": [
        "Isolate affected systems from the network immediately",
        "Collect and preserve forensic evidence",
        "Escalate to the security operations team for manual investigation",
        "Monitor for additional indicators of compromise",
        "Review all system and network logs from the affected timeframe"
    ],
    "indicators": "Anomalous activity that doesn't match known attack patterns.",
    "severity_context": "Risk level undetermined - treat as high until investigation concludes."
}


def get_threat_analysis(technique_id: str, technique_name: str = "", evidence: dict = None) -> dict:
    """Get comprehensive threat analysis for an alert."""
    kb_entry = THREAT_KB.get(technique_id, DEFAULT_ANALYSIS)

    analysis = {
        "technique_id": technique_id,
        "technique_name": technique_name or kb_entry["technique"],
        "tactic": kb_entry["tactic"],
        "kill_chain_phase": kb_entry["kill_chain_phase"],
        "what_happened": kb_entry["description"],
        "why_dangerous": kb_entry["danger"],
        "how_to_fix": kb_entry["remediation"],
        "indicators": kb_entry["indicators"],
        "severity_context": kb_entry["severity_context"],
    }

    # Add evidence-specific context
    if evidence:
        context_parts = []
        if evidence.get("src_ip"):
            context_parts.append(f"Attack originated from IP: {evidence['src_ip']}")
        if evidence.get("distinct_port_count"):
            context_parts.append(f"{evidence['distinct_port_count']} distinct ports were scanned")
        if evidence.get("event_count"):
            context_parts.append(f"{evidence['event_count']} anomalous events detected")
        if evidence.get("target_ports"):
            context_parts.append(f"Targeted ports: {', '.join(str(p) for p in evidence['target_ports'][:10])}")
        if context_parts:
            analysis["evidence_summary"] = ". ".join(context_parts) + "."

    return analysis
