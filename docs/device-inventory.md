# CityShield Device/Asset Inventory

Complete inventory of all 25 devices/assets in the platform.

---

## Zone A — Traffic Management (4 assets)

Subnet: 10.20.5.0/24 | 3D Color: Red (#ef4444)

| # | Asset ID | Name | Type | Class | Criticality | IP | MAC | Detection Rules | Tags |
|---|---|---|---|---|---|---|---|---|---|
| 1 | traffic-ctrl-main-01 | Main Intersection Traffic Controller | traffic_controller | iot_device | critical | 10.20.5.10 | 00:1A:2B:3C:4D:01 | brute_force, net_scan, mitm | production, critical-path, traffic |
| 2 | traffic-cam-east-01 | East District Traffic Camera | traffic_camera | iot_device | medium | 10.20.5.20 | 00:1A:2B:3C:4D:02 | brute_force, ransomware | production, surveillance, traffic |
| 3 | traffic-signal-central-01 | Central District Signal Controller | traffic_signal | iot_device | high | 10.20.5.30 | 00:1A:2B:3C:4D:03 | — | production, traffic |
| 4 | parking-sensor-array-01 | Downtown Parking Sensor Array | parking_sensor | iot_device | low | 10.20.5.40 | 00:1A:2B:3C:4D:04 | — | production, parking |

---

## Zone B — IoT Sensors (5 assets)

Subnet: 10.20.8.0/24 | 3D Color: Green (#10b981)

| # | Asset ID | Name | Type | Class | Criticality | IP | MAC | Detection Rules | Tags |
|---|---|---|---|---|---|---|---|---|---|
| 5 | iot-gateway-alpha-01 | IoT Gateway Alpha | iot_gateway | network_device | critical | 10.20.8.1 | 00:1A:2B:3C:5D:01 | brute_force, net_scan, ddos | production, critical-path, iot |
| 6 | env-sensor-cluster-01 | Environmental Sensor Cluster Alpha | environmental_sensor | iot_device | high | 10.20.8.10 | 00:1A:2B:3C:5D:02 | — | production, environmental, iot |
| 7 | water-quality-monitor-01 | Water Quality Monitor Station 1 | water_sensor | iot_device | medium | 10.20.8.20 | — | — | production, water, iot |
| 8 | air-quality-station-01 | Air Quality Station Downtown | air_quality_sensor | iot_device | medium | 10.20.8.30 | — | — | production, air-quality, iot |
| 9 | smart-grid-monitor-01 | Smart Grid Monitor East | energy_monitor | iot_device | high | 10.20.8.40 | — | — | production, energy, iot |

---

## Zone C — Network Infrastructure (5 assets)

Subnet: 10.20.1.0/24 | 3D Color: Blue (#3b82f6)

| # | Asset ID | Name | Type | Class | Criticality | IP | MAC | Detection Rules | Tags |
|---|---|---|---|---|---|---|---|---|---|
| 10 | core-firewall-01 | Core Firewall Primary | firewall | network_device | critical | 10.20.1.1 | — | ddos, net_scan, brute_force | production, critical-path, network, security |
| 11 | dist-switch-01 | Distribution Switch Alpha | network_switch | network_device | high | 10.20.1.10 | — | — | production, network |
| 12 | ids-ips-cluster-01 | IDS/IPS Cluster Primary | ids_ips | security_device | critical | 10.20.1.20 | — | — | production, critical-path, security |
| 13 | vpn-concentrator-01 | VPN Concentrator Primary | vpn_gateway | network_device | high | 10.20.1.30 | — | — | production, vpn, security |
| 14 | dns-resolver-01 | Primary DNS Resolver | dns_server | network_service | high | 10.20.1.53 | — | — | production, dns, network |

---

## Zone D — Security Operations (4 assets)

Subnet: 10.20.9.0/24 | 3D Color: Purple (#8b5cf6)

| # | Asset ID | Name | Type | Class | Criticality | IP | MAC | Detection Rules | Tags |
|---|---|---|---|---|---|---|---|---|---|
| 15 | siem-collector-01 | SIEM Collector Primary | siem | security_device | critical | 10.20.9.10 | — | — | production, critical-path, security, siem |
| 16 | edr-platform-01 | EDR Platform Controller | edr | security_device | high | 10.20.9.20 | — | — | production, edr, security |
| 17 | vuln-scanner-01 | Vulnerability Scanner | vulnerability_scanner | security_device | medium | 10.20.9.30 | — | — | production, scanning, security |
| 18 | auth-gateway-01 | Authentication Gateway | authentication_server | security_device | critical | 10.20.9.40 | — | — | production, critical-path, authentication, security |

---

## Zone E — Industrial Systems (6 assets)

Subnet: 10.20.12.0/24 | 3D Color: Orange (#f97316)

| # | Asset ID | Name | Type | Class | Criticality | IP | MAC | Detection Rules | Tags |
|---|---|---|---|---|---|---|---|---|---|
| 19 | power-plant-scada-01 | Power Plant SCADA Master | scada_master | industrial_control | critical | 10.20.12.1 | — | — | production, critical-path, scada, industrial |
| 20 | water-treatment-scada-01 | Water Treatment SCADA HMI | scada_hmi | industrial_control | critical | 10.20.12.10 | — | — | production, critical-path, scada, water |
| 21 | manufacturing-plc-01 | Manufacturing PLC Controller | plc | industrial_control | high | 10.20.12.20 | — | — | production, plc, industrial |
| 22 | wind-farm-controller-01 | Wind Farm Controller East | turbine_controller | industrial_control | medium | 10.20.12.30 | — | — | production, renewable, industrial |
| 23 | grid-substation-01 | Grid Substation Controller | grid_controller | industrial_control | critical | 10.20.12.40 | — | — | production, critical-path, grid, industrial |
| 24 | city-rail-system-01 | City Rail System Controller | rail_controller | industrial_control | critical | 10.20.12.50 | — | — | production, critical-path, rail, industrial |

---

## Cyber Range (1 asset)

Subnet: 172.20.0.0/16 | 3D Color: Cyan (#06b6d4)

| # | Asset ID | Name | Type | Class | Criticality | IP | MAC | Tags |
|---|---|---|---|---|---|---|---|---|
| 25 | cyber-range-metasploitable | Metasploitable (Training Target) | training_target | network_service | low | 172.20.0.2 | 02:42:ac:14:00:02 | training, vulnerable-by-design, cyber-range |

---

## Asset Schema Reference

Every asset supports the following fields:

| Field | Type | Required | Description |
|---|---|---|---|
| asset_id | string | yes | Unique identifier (e.g. traffic-ctrl-main-01) |
| name | string | yes | Human-readable display name |
| asset_type | string | yes | Specific device type (e.g. traffic_controller, firewall, scada_master) |
| asset_class | string | yes | Category class (iot_device, network_device, security_device, industrial_control, network_service) |
| criticality | string | yes | low, medium, high, critical |
| status | string | no | active, inactive, maintenance, decommissioned |
| device_type | string | no | simulated, physical, virtual |
| lifecycle_state | string | no | operational, maintenance, decommissioned |
| location.zone | string | yes | zone-a through zone-e, or cyber-range |
| location.subnet | string | yes | CIDR subnet |
| location.building | string | no | Building name |
| location.geo.lat | float | no | Latitude |
| location.geo.lon | float | no | Longitude |
| network.ip_address | string | no | Device IP address |
| network.mac_address | string | no | Device MAC address |
| network.vlan | string | no | VLAN assignment |
| network.gateway | string | no | Default gateway |
| detection_rules | string[] | no | Rules that monitor this asset (e.g. brute_force, net_scan) |
| dependencies | string[] | no | Asset IDs this device depends on |
| tags | string[] | no | Searchable tags |
| metadata | object | no | Arbitrary key-value metadata |
| @timestamp | string | yes | ISO 8601 timestamp |

---

## Asset Type to Category Mapping

Used by the backend (routes_overview.py) to group assets into dashboard categories:

| Category | Asset Types |
|---|---|
| Traffic | traffic_controller, traffic_camera, traffic_signal, parking_sensor |
| IoT | iot_gateway, environmental_sensor, water_sensor, air_quality_sensor, energy_monitor |
| Network | firewall, network_switch, vpn_gateway, dns_server |
| Security | ids_ips, siem, edr, vulnerability_scanner, authentication_server |
| Industrial | scada_master, scada_hmi, plc, turbine_controller, grid_controller, rail_controller |
| Training | training_server, training_target |

---

## 3D Visualization Properties

Zone positions in the 3D city scene:

| Zone | Center (x, z) | Label |
|---|---|---|
| zone-a | [-8, -8] | Traffic |
| zone-b | [8, -8] | IoT |
| zone-c | [-8, 8] | Network |
| zone-d | [8, 8] | Security |
| zone-e | [0, 0] | Industrial (center) |
| cyber-range | [20, 0] | Cyber Range |

Building width by category:

| Category | Width |
|---|---|
| traffic | 0.7 |
| iot | 0.55 |
| network | 0.65 |
| security | 0.8 |
| industrial | 0.75 |
| training | 0.7 |

Status colors:

| Status | Color |
|---|---|
| ok | #10b981 (green) |
| warning | #f59e0b (amber) |
| critical | #ef4444 (red) |
| offline | #6b7280 (gray) |

Building height: Derived from risk score (0-100) or event count, mapped to 0.6–4.0 units.

---

## Summary Statistics

| Metric | Value |
|---|---|
| Total assets | 25 |
| Zones | 6 (5 operational + 1 cyber range) |
| Critical assets | 10 |
| High assets | 8 |
| Medium assets | 5 |
| Low assets | 2 |

By asset class:

| Class | Count |
|---|---|
| iot_device | 9 |
| industrial_control | 6 |
| network_device | 5 |
| security_device | 5 |
| network_service | 2 (dns_server counted here too) |

---

## Gaps / Enhancement Opportunities

| Issue | Affected Assets |
|---|---|
| Missing MAC addresses | 15 out of 25 have no MAC |
| Missing detection_rules | 19 out of 25 have no detection rules mapped |
| Missing geo coordinates | Only Zone A has lat/lon |
| No status field | 23 of 24 bulk-loaded assets lack status |
| No device_type field | 23 of 24 lack device_type (simulated/physical/virtual) |
| No lifecycle_state | 23 of 24 lack lifecycle_state |
| No dependencies | No asset declares dependencies |
| No metadata | No asset uses extended metadata |
