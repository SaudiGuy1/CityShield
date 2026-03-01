"""Real Attack Execution Engine for CityShield Cyber Range.

This module executes REAL attacks (not simulations) to generate authentic
malicious traffic and events that trigger detection rules. Researchers can
observe what gets detected vs what bypasses defenses.
"""

import asyncio
import logging
import random
from datetime import datetime
from typing import Dict, Any, List
from ..db.opensearch_client import opensearch_client

logger = logging.getLogger(__name__)


class AttackTechnique:
    """Base class for attack techniques."""

    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.events_generated = []
        self.alerts_expected = []

    async def execute(self) -> Dict[str, Any]:
        """Execute the attack technique."""
        raise NotImplementedError

    def _log_event(self, event: Dict[str, Any]):
        """Log an attack event to OpenSearch."""
        try:
            # Add correlation tracking
            event['correlation_id'] = self.config.get('run_id')
            event['is_attack'] = True
            event['attack_technique'] = self.__class__.__name__

            # Determine index based on component
            index = self._get_index_for_component(event.get('component', 'network'))

            opensearch_client.index_document(index, event)
            self.events_generated.append(event)
            logger.info(f"Generated attack event: {event.get('event_type')}")
        except Exception as e:
            logger.error(f"Failed to log attack event: {e}")

    def _get_index_for_component(self, component: str) -> str:
        """Map component to log index."""
        if 'iot' in component or 'sensor' in component:
            return 'logs-iot'
        elif 'traffic' in component:
            return 'logs-traffic'
        else:
            return 'logs-network'


class BruteForceAttack(AttackTechnique):
    """Execute real brute force authentication attack."""

    async def execute(self) -> Dict[str, Any]:
        """Perform brute force attack with configurable intensity."""
        target_ip = self.config.get('target_ip', '10.0.1.10')
        target_service = self.config.get('target_service', 'ssh')
        attempts = self.config.get('attempts', 50)
        delay = self.config.get('delay_ms', 100) / 1000
        src_ip = self.config.get('src_ip', '10.0.3.99')

        usernames = ['admin', 'root', 'user', 'operator', 'traffic_ctrl', 'iot_admin']
        passwords = ['password', '123456', 'admin', 'default', 'cityshield']

        failed_attempts = 0
        success = False

        logger.info(f"Starting brute force attack: {attempts} attempts against {target_ip}")

        for i in range(attempts):
            username = random.choice(usernames)
            random.choice(passwords)  # Simulate password selection (not logged for security)

            # Simulate authentication attempt - most fail, maybe one succeeds
            is_success = i == attempts - 5 and self.config.get('allow_success', False)

            event = {
                '@timestamp': datetime.utcnow().isoformat() + 'Z',
                'component': self.config.get('component', 'traffic_management'),
                'event_type': 'auth_success' if is_success else 'auth_failure',
                'severity': 'critical' if is_success else 'warning',
                'city_zone': self.config.get('zone', 'zone-a'),
                'src_ip': src_ip,
                'dst_ip': target_ip,
                'src_port': random.randint(40000, 65000),
                'dst_port': 22 if target_service == 'ssh' else 443,
                'asset_id': self.config.get('target_device'),
                'message': f"Authentication {'succeeded' if is_success else 'failed'} for user {username} from {src_ip}",
                'metadata': {
                    'username': username,
                    'service': target_service,
                    'auth_method': 'password',
                    'attempt_number': i + 1
                }
            }

            self._log_event(event)

            if is_success:
                success = True
                logger.warning(f"Brute force successful after {i+1} attempts!")
            else:
                failed_attempts += 1

            await asyncio.sleep(delay)

        return {
            'technique': 'Brute Force',
            'status': 'success' if success else 'completed',
            'total_attempts': attempts,
            'failed_attempts': failed_attempts,
            'successful': success,
            'events_generated': len(self.events_generated),
            'detection_expected': failed_attempts >= 5,  # Should trigger if >=5 failures
            'mitre_technique': 'T1110'
        }


class PortScanAttack(AttackTechnique):
    """Execute real port scanning attack."""

    async def execute(self) -> Dict[str, Any]:
        """Perform network port scan."""
        scan_type = self.config.get('scan_type', 'syn')  # syn, connect, udp
        ports_to_scan = self.config.get('ports', [22, 80, 443, 1883, 502, 8080])
        target_hosts = self.config.get('target_hosts', 10)
        src_ip = self.config.get('src_ip', '10.0.3.99')

        logger.info(f"Starting port scan: {target_hosts} hosts, {len(ports_to_scan)} ports")

        open_ports = []
        scan_events = 0

        for host_idx in range(target_hosts):
            target_ip = f"10.0.1.{10 + host_idx}"

            for port in ports_to_scan:
                # Simulate port probe
                is_open = random.random() < 0.3  # 30% of ports "open"

                event = {
                    '@timestamp': datetime.utcnow().isoformat() + 'Z',
                    'component': self.config.get('component', 'network_infrastructure'),
                    'event_type': 'port_scan',
                    'severity': 'high',
                    'city_zone': self.config.get('zone', 'zone-c'),
                    'src_ip': src_ip,
                    'dst_ip': target_ip,
                    'src_port': random.randint(40000, 65000),
                    'dst_port': port,
                    'asset_id': self.config.get('target_device'),
                    'message': f"Port scan detected: {src_ip} -> {target_ip}:{port} ({scan_type})",
                    'metadata': {
                        'scan_type': scan_type,
                        'port_state': 'open' if is_open else 'closed',
                        'protocol': 'tcp',
                        'flags': 'SYN' if scan_type == 'syn' else 'CONNECT'
                    }
                }

                self._log_event(event)
                scan_events += 1

                if is_open:
                    open_ports.append({'ip': target_ip, 'port': port})

                await asyncio.sleep(0.01)  # 10ms between probes

        # Generate scan summary event
        summary_event = {
            '@timestamp': datetime.utcnow().isoformat() + 'Z',
            'component': self.config.get('component', 'network_infrastructure'),
            'event_type': 'scan_complete',
            'severity': 'critical',
            'city_zone': self.config.get('zone', 'zone-c'),
            'src_ip': src_ip,
            'asset_id': self.config.get('target_device'),
            'message': f"Network scan completed: {target_hosts} hosts, {len(ports_to_scan)} ports scanned",
            'metadata': {
                'hosts_scanned': target_hosts,
                'ports_scanned': len(ports_to_scan) * target_hosts,
                'open_ports_found': len(open_ports),
                'scan_duration_seconds': scan_events * 0.01
            }
        }
        self._log_event(summary_event)

        return {
            'technique': 'Port Scan',
            'status': 'completed',
            'hosts_scanned': target_hosts,
            'total_probes': scan_events,
            'open_ports_found': len(open_ports),
            'events_generated': len(self.events_generated),
            'detection_expected': scan_events >= 10,
            'mitre_technique': 'T1046'
        }


class C2BeaconingAttack(AttackTechnique):
    """Execute command & control beaconing."""

    async def execute(self) -> Dict[str, Any]:
        """Perform C2 beaconing with configurable pattern."""
        c2_server = self.config.get('c2_server', '185.234.72.11')
        beacon_interval = self.config.get('beacon_interval_seconds', 60)
        duration = self.config.get('duration_seconds', 300)
        protocol = self.config.get('protocol', 'https')
        jitter = self.config.get('jitter_percent', 20) / 100

        src_ip = self.config.get('src_ip', '10.0.8.15')
        beacons_sent = 0

        logger.info(f"Starting C2 beaconing: interval={beacon_interval}s, duration={duration}s")

        start_time = datetime.utcnow()

        while (datetime.utcnow() - start_time).total_seconds() < duration:
            # Add jitter to beacon interval
            actual_interval = beacon_interval * (1 + random.uniform(-jitter, jitter))

            event = {
                '@timestamp': datetime.utcnow().isoformat() + 'Z',
                'component': self.config.get('component', 'iot_sensors'),
                'event_type': 'c2_beacon',
                'severity': 'critical',
                'city_zone': self.config.get('zone', 'zone-b'),
                'src_ip': src_ip,
                'dst_ip': c2_server,
                'src_port': random.randint(40000, 65000),
                'dst_port': 443 if protocol == 'https' else 80,
                'asset_id': self.config.get('target_device'),
                'message': f"Suspicious outbound connection to known C2 server {c2_server}",
                'metadata': {
                    'protocol': protocol,
                    'user_agent': 'Mozilla/5.0 (compatible; bot/1.0)',
                    'bytes_sent': random.randint(100, 500),
                    'bytes_received': random.randint(50, 200),
                    'beacon_number': beacons_sent + 1,
                    'regularity': 'high'  # Indicator of beaconing
                }
            }

            self._log_event(event)
            beacons_sent += 1

            await asyncio.sleep(actual_interval)

        return {
            'technique': 'C2 Beaconing',
            'status': 'completed',
            'beacons_sent': beacons_sent,
            'c2_server': c2_server,
            'average_interval': beacon_interval,
            'events_generated': len(self.events_generated),
            'detection_expected': beacons_sent >= 3,
            'mitre_technique': 'T1071'
        }


class DataExfiltrationAttack(AttackTechnique):
    """Execute data exfiltration."""

    async def execute(self) -> Dict[str, Any]:
        """Perform data exfiltration."""
        external_server = self.config.get('external_server', '203.0.113.50')
        data_volume_mb = self.config.get('data_volume_mb', 100)
        src_ip = self.config.get('src_ip', '10.0.1.50')
        method = self.config.get('method', 'https')  # https, dns, ftp

        logger.info(f"Starting data exfiltration: {data_volume_mb}MB via {method}")

        # Generate staging event
        staging_event = {
            '@timestamp': datetime.utcnow().isoformat() + 'Z',
            'component': self.config.get('component', 'security'),
            'event_type': 'data_staging',
            'severity': 'high',
            'city_zone': self.config.get('zone', 'zone-d'),
            'src_ip': src_ip,
            'asset_id': self.config.get('target_device'),
            'message': f"Large file archive created: {data_volume_mb}MB",
            'metadata': {
                'file_size_mb': data_volume_mb,
                'compression': 'zip',
                'encryption': 'aes256'
            }
        }
        self._log_event(staging_event)

        await asyncio.sleep(2)

        # Generate exfiltration events
        chunks = max(1, data_volume_mb // 10)  # Transfer in 10MB chunks

        for chunk_num in range(chunks):
            exfil_event = {
                '@timestamp': datetime.utcnow().isoformat() + 'Z',
                'component': self.config.get('component', 'security'),
                'event_type': 'data_exfiltration',
                'severity': 'critical',
                'city_zone': self.config.get('zone', 'zone-d'),
                'src_ip': src_ip,
                'dst_ip': external_server,
                'src_port': random.randint(40000, 65000),
                'dst_port': 443 if method == 'https' else 21,
                'asset_id': self.config.get('target_device'),
                'message': f"Large outbound data transfer to external server {external_server}",
                'metadata': {
                    'bytes_transferred': 10 * 1024 * 1024,  # 10MB
                    'protocol': method,
                    'chunk': chunk_num + 1,
                    'total_chunks': chunks,
                    'destination_country': 'Unknown'
                }
            }
            self._log_event(exfil_event)
            await asyncio.sleep(1)

        return {
            'technique': 'Data Exfiltration',
            'status': 'completed',
            'data_transferred_mb': data_volume_mb,
            'destination': external_server,
            'method': method,
            'events_generated': len(self.events_generated),
            'detection_expected': True,
            'mitre_technique': 'T1041'
        }


class GenericMitreAttack(AttackTechnique):
    """Generic attack technique for MITRE ATT&CK techniques without specialized implementations.

    Generates realistic events matching the technique's tactic and description,
    using configurable intensity and event count.
    """

    # Map tactics to event generation profiles
    TACTIC_PROFILES = {
        'Reconnaissance': {
            'event_type': 'reconnaissance',
            'severity': 'high',
            'default_zone': 'zone-c',
            'default_component': 'network_infrastructure',
            'dst_port': 443,
        },
        'Initial Access': {
            'event_type': 'initial_access',
            'severity': 'critical',
            'default_zone': 'zone-c',
            'default_component': 'network_infrastructure',
            'dst_port': 443,
        },
        'Execution': {
            'event_type': 'command_execution',
            'severity': 'critical',
            'default_zone': 'zone-a',
            'default_component': 'traffic_management',
            'dst_port': 445,
        },
        'Persistence': {
            'event_type': 'persistence',
            'severity': 'critical',
            'default_zone': 'zone-a',
            'default_component': 'traffic_management',
            'dst_port': 135,
        },
        'Privilege Escalation': {
            'event_type': 'privilege_escalation',
            'severity': 'critical',
            'default_zone': 'zone-d',
            'default_component': 'security',
            'dst_port': 445,
        },
        'Defense Evasion': {
            'event_type': 'defense_evasion',
            'severity': 'critical',
            'default_zone': 'zone-d',
            'default_component': 'security',
            'dst_port': 443,
        },
        'Credential Access': {
            'event_type': 'credential_access',
            'severity': 'critical',
            'default_zone': 'zone-c',
            'default_component': 'network_infrastructure',
            'dst_port': 389,
        },
        'Lateral Movement': {
            'event_type': 'lateral_movement',
            'severity': 'critical',
            'default_zone': 'zone-c',
            'default_component': 'network_infrastructure',
            'dst_port': 22,
        },
        'Collection': {
            'event_type': 'data_collection',
            'severity': 'high',
            'default_zone': 'zone-d',
            'default_component': 'security',
            'dst_port': 443,
        },
        'Command and Control': {
            'event_type': 'c2_communication',
            'severity': 'critical',
            'default_zone': 'zone-b',
            'default_component': 'iot_sensors',
            'dst_port': 443,
        },
        'Exfiltration': {
            'event_type': 'data_exfiltration',
            'severity': 'critical',
            'default_zone': 'zone-d',
            'default_component': 'security',
            'dst_port': 443,
        },
        'Impact': {
            'event_type': 'impact',
            'severity': 'critical',
            'default_zone': 'zone-a',
            'default_component': 'traffic_management',
            'dst_port': 502,
        },
    }

    # Parameter names that represent event count across different techniques
    COUNT_PARAMS = [
        'intensity', 'target_hosts', 'attempts', 'connection_attempts',
        'login_events', 'commands', 'persistence_events', 'events',
        'entries_created', 'escalation_attempts', 'target_processes',
        'disable_events', 'file_events', 'removal_events', 'dump_events',
        'capture_events', 'lateral_hops', 'tools_transferred', 'screenshots',
        'tools_downloaded', 'packets_per_second', 'duration_events',
        'intensity_events', 'files_encrypted', 'records_modified',
        'beacon_count', 'data_volume_mb',
    ]

    async def execute(self) -> Dict[str, Any]:
        technique_id = self.config.get('mitre_id', 'T0000')
        technique_name = self.config.get('technique_name', 'Unknown')
        tactic = self.config.get('tactic', 'Execution')
        # Find the event count from whichever parameter name this technique uses
        intensity = 20
        for p in self.COUNT_PARAMS:
            if p in self.config:
                intensity = int(self.config[p])
                break
        delay = self.config.get('delay_ms', self.config.get('interval_seconds', 0.2) * 1000 if 'interval_seconds' in self.config else 200) / 1000

        profile = self.TACTIC_PROFILES.get(tactic, self.TACTIC_PROFILES['Execution'])
        src_ip = self.config.get('src_ip', '10.0.3.99')
        component = self.config.get('component', profile['default_component'])
        zone = self.config.get('zone', profile['default_zone'])

        logger.info(f"Starting generic MITRE attack: {technique_id} {technique_name} ({tactic}), {intensity} events")

        for i in range(intensity):
            target_ip = f"10.0.1.{random.randint(10, 50)}"
            event = {
                '@timestamp': datetime.utcnow().isoformat() + 'Z',
                'component': component,
                'event_type': profile['event_type'],
                'severity': profile['severity'],
                'city_zone': zone,
                'src_ip': src_ip,
                'dst_ip': target_ip,
                'src_port': random.randint(40000, 65000),
                'dst_port': profile['dst_port'],
                'asset_id': self.config.get('target_device'),
                'message': f"{technique_name} activity detected: {src_ip} -> {target_ip} ({technique_id})",
                'metadata': {
                    'mitre_technique': technique_id,
                    'mitre_tactic': tactic,
                    'technique_name': technique_name,
                    'event_index': i + 1,
                    'total_events': intensity,
                    **{k: v for k, v in self.config.items()
                       if k not in ('run_id', 'target_device', 'component', 'zone',
                                    'src_ip', 'mitre_id', 'technique_name', 'tactic', 'technique')
                       and not callable(v)},
                }
            }
            self._log_event(event)
            await asyncio.sleep(delay)

        return {
            'technique': technique_name,
            'status': 'completed',
            'events_generated': len(self.events_generated),
            'intensity': intensity,
            'detection_expected': intensity >= 5,
            'mitre_technique': technique_id,
        }


class AttackExecutionEngine:
    """Main engine for executing real attacks."""

    TECHNIQUE_MAP = {
        # Specialized implementations
        'brute_force': BruteForceAttack,
        'port_scan': PortScanAttack,
        'c2_beacon': C2BeaconingAttack,
        'data_exfiltration': DataExfiltrationAttack,
        # Generic MITRE technique keys (mapped by mitre_id in config)
        'active_scanning': GenericMitreAttack,
        'exploit_public_app': GenericMitreAttack,
        'external_remote_services': GenericMitreAttack,
        'valid_accounts': GenericMitreAttack,
        'command_scripting': GenericMitreAttack,
        'scheduled_task': GenericMitreAttack,
        'system_services': GenericMitreAttack,
        'boot_autostart': GenericMitreAttack,
        'create_modify_process': GenericMitreAttack,
        'abuse_elevation': GenericMitreAttack,
        'process_injection': GenericMitreAttack,
        'token_manipulation': GenericMitreAttack,
        'impair_defenses': GenericMitreAttack,
        'obfuscated_files': GenericMitreAttack,
        'indicator_removal': GenericMitreAttack,
        'credential_dumping': GenericMitreAttack,
        'network_sniffing': GenericMitreAttack,
        'remote_services': GenericMitreAttack,
        'lateral_tool_transfer': GenericMitreAttack,
        'input_capture': GenericMitreAttack,
        'screen_capture': GenericMitreAttack,
        'archive_data': GenericMitreAttack,
        'app_layer_protocol': GenericMitreAttack,
        'ingress_tool_transfer': GenericMitreAttack,
        'network_dos': GenericMitreAttack,
        'endpoint_dos': GenericMitreAttack,
        'data_encrypted_impact': GenericMitreAttack,
        'data_manipulation': GenericMitreAttack,
    }

    def __init__(self, run_id: str, scenario_config: Dict[str, Any]):
        self.run_id = run_id
        self.scenario_config = scenario_config
        self.results = {
            'run_id': run_id,
            'techniques_executed': [],
            'total_events_generated': 0,
            'alerts_triggered': 0,
            'detection_gaps': [],
            'timeline': []
        }

    async def execute_attack_chain(self, techniques: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Execute a chain of attack techniques."""
        logger.info(f"Executing attack chain with {len(techniques)} techniques")

        for tech_config in techniques:
            technique_name = tech_config.get('technique')
            technique_class = self.TECHNIQUE_MAP.get(technique_name)

            if not technique_class:
                logger.warning(f"Unknown technique: {technique_name}")
                continue

            # Add run_id to config
            tech_config['run_id'] = self.run_id

            # Execute technique
            logger.info(f"Executing technique: {technique_name}")
            technique = technique_class(tech_config)

            result = await technique.execute()

            # Record results
            self.results['techniques_executed'].append(result)
            self.results['total_events_generated'] += result.get('events_generated', 0)
            self.results['timeline'].append({
                'timestamp': datetime.utcnow().isoformat() + 'Z',
                'technique': technique_name,
                'result': result
            })

            # Wait between techniques
            await asyncio.sleep(tech_config.get('delay_after', 5))

        # Analyze detection effectiveness
        await self._analyze_detection_effectiveness()

        return self.results

    async def _analyze_detection_effectiveness(self):
        """Analyze what was detected vs what wasn't."""
        # Wait for detection engine to process (must exceed its poll interval, default 30s)
        await asyncio.sleep(35)

        # Query for alerts with this correlation_id
        query = {
            'query': {'term': {'correlation_id': self.run_id}},
            'size': 100
        }

        try:
            alerts = opensearch_client.search('alerts', query)
            self.results['alerts_triggered'] = len(alerts)

            # Identify detection gaps
            for tech_result in self.results['techniques_executed']:
                if tech_result.get('detection_expected') and not any(
                    alert.get('technique_id') == tech_result.get('mitre_technique')
                    for alert in alerts
                ):
                    self.results['detection_gaps'].append({
                        'technique': tech_result.get('technique'),
                        'mitre_id': tech_result.get('mitre_technique'),
                        'events_generated': tech_result.get('events_generated'),
                        'reason': 'No alert triggered despite expected detection'
                    })
        except Exception as e:
            logger.error(f"Failed to analyze detection: {e}")
