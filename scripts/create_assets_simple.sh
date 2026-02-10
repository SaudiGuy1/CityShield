#!/bin/bash
#
# Simple asset index creation using curl (no Python dependencies needed)
#

echo "=========================================="
echo "CityShield Asset Index Setup (Simple)"
echo "=========================================="
echo ""

# Check if OpenSearch is accessible
if ! curl -s -f http://localhost:9200/_cluster/health > /dev/null 2>&1; then
    echo "Error: Cannot connect to OpenSearch at http://localhost:9200"
    echo "Please start OpenSearch: docker compose up -d opensearch"
    exit 1
fi

echo "Step 1: Creating city-assets index..."

# Delete existing index if present
curl -s -X DELETE 'http://localhost:9200/city-assets' > /dev/null 2>&1

# Create index with mapping
curl -s -X PUT 'http://localhost:9200/city-assets' \
  -H 'Content-Type: application/json' \
  -d '{
  "mappings": {
    "properties": {
      "asset_id": {"type": "keyword"},
      "asset_type": {"type": "keyword"},
      "asset_class": {"type": "keyword"},
      "name": {"type": "text", "fields": {"keyword": {"type": "keyword"}}},
      "criticality": {"type": "keyword"},
      "location": {
        "properties": {
          "zone": {"type": "keyword"},
          "subnet": {"type": "keyword"},
          "geo": {"type": "geo_point"}
        }
      },
      "network": {
        "properties": {
          "ip_address": {"type": "ip"},
          "mac_address": {"type": "keyword"}
        }
      },
      "@timestamp": {"type": "date"}
    }
  }
}' > /dev/null

echo "✓ Index created"
echo ""
echo "Step 2: Loading asset data..."

# Bulk load assets
curl -s -X POST 'http://localhost:9200/_bulk' \
  -H 'Content-Type: application/x-ndjson' \
  --data-binary @- << 'BULKDATA' > /dev/null
{"index":{"_index":"city-assets","_id":"traffic-ctrl-main-01"}}
{"asset_id":"traffic-ctrl-main-01","asset_type":"traffic_controller","asset_class":"iot_device","name":"Main Intersection Traffic Controller","criticality":"critical","location":{"zone":"zone-a","subnet":"10.20.5.0/24","geo":{"lat":40.7128,"lon":-74.0060}},"network":{"ip_address":"10.20.5.10","mac_address":"00:1A:2B:3C:4D:01"},"detection_rules":["brute_force","net_scan","mitm"],"tags":["production","critical-path","traffic"],"@timestamp":"2026-02-10T12:00:00Z"}
{"index":{"_index":"city-assets","_id":"traffic-cam-east-01"}}
{"asset_id":"traffic-cam-east-01","asset_type":"traffic_camera","asset_class":"iot_device","name":"East District Traffic Camera","criticality":"medium","location":{"zone":"zone-a","subnet":"10.20.5.0/24","geo":{"lat":40.7135,"lon":-74.0055}},"network":{"ip_address":"10.20.5.20","mac_address":"00:1A:2B:3C:4D:02"},"detection_rules":["brute_force","ransomware"],"tags":["production","surveillance","traffic"],"@timestamp":"2026-02-10T12:00:00Z"}
{"index":{"_index":"city-assets","_id":"traffic-signal-central-01"}}
{"asset_id":"traffic-signal-central-01","asset_type":"traffic_signal","asset_class":"iot_device","name":"Central District Signal Controller","criticality":"high","location":{"zone":"zone-a","subnet":"10.20.5.0/24"},"network":{"ip_address":"10.20.5.30","mac_address":"00:1A:2B:3C:4D:03"},"tags":["production","traffic"],"@timestamp":"2026-02-10T12:00:00Z"}
{"index":{"_index":"city-assets","_id":"parking-sensor-array-01"}}
{"asset_id":"parking-sensor-array-01","asset_type":"parking_sensor","asset_class":"iot_device","name":"Downtown Parking Sensor Array","criticality":"low","location":{"zone":"zone-a","subnet":"10.20.5.0/24"},"network":{"ip_address":"10.20.5.40","mac_address":"00:1A:2B:3C:4D:04"},"tags":["production","parking"],"@timestamp":"2026-02-10T12:00:00Z"}
{"index":{"_index":"city-assets","_id":"iot-gateway-alpha-01"}}
{"asset_id":"iot-gateway-alpha-01","asset_type":"iot_gateway","asset_class":"network_device","name":"IoT Gateway Alpha","criticality":"critical","location":{"zone":"zone-b","subnet":"10.20.8.0/24"},"network":{"ip_address":"10.20.8.1","mac_address":"00:1A:2B:3C:5D:01"},"detection_rules":["brute_force","net_scan","ddos"],"tags":["production","critical-path","iot"],"@timestamp":"2026-02-10T12:00:00Z"}
{"index":{"_index":"city-assets","_id":"env-sensor-cluster-01"}}
{"asset_id":"env-sensor-cluster-01","asset_type":"environmental_sensor","asset_class":"iot_device","name":"Environmental Sensor Cluster Alpha","criticality":"high","location":{"zone":"zone-b","subnet":"10.20.8.0/24"},"network":{"ip_address":"10.20.8.10","mac_address":"00:1A:2B:3C:5D:02"},"tags":["production","environmental","iot"],"@timestamp":"2026-02-10T12:00:00Z"}
{"index":{"_index":"city-assets","_id":"water-quality-monitor-01"}}
{"asset_id":"water-quality-monitor-01","asset_type":"water_sensor","asset_class":"iot_device","name":"Water Quality Monitor Station 1","criticality":"medium","location":{"zone":"zone-b","subnet":"10.20.8.0/24"},"network":{"ip_address":"10.20.8.20"},"tags":["production","water","iot"],"@timestamp":"2026-02-10T12:00:00Z"}
{"index":{"_index":"city-assets","_id":"air-quality-station-01"}}
{"asset_id":"air-quality-station-01","asset_type":"air_quality_sensor","asset_class":"iot_device","name":"Air Quality Station Downtown","criticality":"medium","location":{"zone":"zone-b","subnet":"10.20.8.0/24"},"network":{"ip_address":"10.20.8.30"},"tags":["production","air-quality","iot"],"@timestamp":"2026-02-10T12:00:00Z"}
{"index":{"_index":"city-assets","_id":"smart-grid-monitor-01"}}
{"asset_id":"smart-grid-monitor-01","asset_type":"energy_monitor","asset_class":"iot_device","name":"Smart Grid Monitor East","criticality":"high","location":{"zone":"zone-b","subnet":"10.20.8.0/24"},"network":{"ip_address":"10.20.8.40"},"tags":["production","energy","iot"],"@timestamp":"2026-02-10T12:00:00Z"}
{"index":{"_index":"city-assets","_id":"core-firewall-01"}}
{"asset_id":"core-firewall-01","asset_type":"firewall","asset_class":"network_device","name":"Core Firewall Primary","criticality":"critical","location":{"zone":"zone-c","subnet":"10.20.1.0/24"},"network":{"ip_address":"10.20.1.1"},"detection_rules":["ddos","net_scan","brute_force"],"tags":["production","critical-path","network","security"],"@timestamp":"2026-02-10T12:00:00Z"}
{"index":{"_index":"city-assets","_id":"dist-switch-01"}}
{"asset_id":"dist-switch-01","asset_type":"network_switch","asset_class":"network_device","name":"Distribution Switch Alpha","criticality":"high","location":{"zone":"zone-c","subnet":"10.20.1.0/24"},"network":{"ip_address":"10.20.1.10"},"tags":["production","network"],"@timestamp":"2026-02-10T12:00:00Z"}
{"index":{"_index":"city-assets","_id":"ids-ips-cluster-01"}}
{"asset_id":"ids-ips-cluster-01","asset_type":"ids_ips","asset_class":"security_device","name":"IDS/IPS Cluster Primary","criticality":"critical","location":{"zone":"zone-c","subnet":"10.20.1.0/24"},"network":{"ip_address":"10.20.1.20"},"tags":["production","critical-path","security"],"@timestamp":"2026-02-10T12:00:00Z"}
{"index":{"_index":"city-assets","_id":"vpn-concentrator-01"}}
{"asset_id":"vpn-concentrator-01","asset_type":"vpn_gateway","asset_class":"network_device","name":"VPN Concentrator Primary","criticality":"high","location":{"zone":"zone-c","subnet":"10.20.1.0/24"},"network":{"ip_address":"10.20.1.30"},"tags":["production","vpn","security"],"@timestamp":"2026-02-10T12:00:00Z"}
{"index":{"_index":"city-assets","_id":"dns-resolver-01"}}
{"asset_id":"dns-resolver-01","asset_type":"dns_server","asset_class":"network_service","name":"Primary DNS Resolver","criticality":"high","location":{"zone":"zone-c","subnet":"10.20.1.0/24"},"network":{"ip_address":"10.20.1.53"},"tags":["production","dns","network"],"@timestamp":"2026-02-10T12:00:00Z"}
{"index":{"_index":"city-assets","_id":"siem-collector-01"}}
{"asset_id":"siem-collector-01","asset_type":"siem","asset_class":"security_device","name":"SIEM Collector Primary","criticality":"critical","location":{"zone":"zone-d","subnet":"10.20.9.0/24"},"network":{"ip_address":"10.20.9.10"},"tags":["production","critical-path","security","siem"],"@timestamp":"2026-02-10T12:00:00Z"}
{"index":{"_index":"city-assets","_id":"edr-platform-01"}}
{"asset_id":"edr-platform-01","asset_type":"edr","asset_class":"security_device","name":"EDR Platform Controller","criticality":"high","location":{"zone":"zone-d","subnet":"10.20.9.0/24"},"network":{"ip_address":"10.20.9.20"},"tags":["production","edr","security"],"@timestamp":"2026-02-10T12:00:00Z"}
{"index":{"_index":"city-assets","_id":"vuln-scanner-01"}}
{"asset_id":"vuln-scanner-01","asset_type":"vulnerability_scanner","asset_class":"security_device","name":"Vulnerability Scanner","criticality":"medium","location":{"zone":"zone-d","subnet":"10.20.9.0/24"},"network":{"ip_address":"10.20.9.30"},"tags":["production","scanning","security"],"@timestamp":"2026-02-10T12:00:00Z"}
{"index":{"_index":"city-assets","_id":"auth-gateway-01"}}
{"asset_id":"auth-gateway-01","asset_type":"authentication_server","asset_class":"security_device","name":"Authentication Gateway","criticality":"critical","location":{"zone":"zone-d","subnet":"10.20.9.0/24"},"network":{"ip_address":"10.20.9.40"},"tags":["production","critical-path","authentication","security"],"@timestamp":"2026-02-10T12:00:00Z"}
{"index":{"_index":"city-assets","_id":"power-plant-scada-01"}}
{"asset_id":"power-plant-scada-01","asset_type":"scada_master","asset_class":"industrial_control","name":"Power Plant SCADA Master","criticality":"critical","location":{"zone":"zone-e","subnet":"10.20.12.0/24"},"network":{"ip_address":"10.20.12.1"},"tags":["production","critical-path","scada","industrial"],"@timestamp":"2026-02-10T12:00:00Z"}
{"index":{"_index":"city-assets","_id":"water-treatment-scada-01"}}
{"asset_id":"water-treatment-scada-01","asset_type":"scada_hmi","asset_class":"industrial_control","name":"Water Treatment SCADA HMI","criticality":"critical","location":{"zone":"zone-e","subnet":"10.20.12.0/24"},"network":{"ip_address":"10.20.12.10"},"tags":["production","critical-path","scada","water"],"@timestamp":"2026-02-10T12:00:00Z"}
{"index":{"_index":"city-assets","_id":"manufacturing-plc-01"}}
{"asset_id":"manufacturing-plc-01","asset_type":"plc","asset_class":"industrial_control","name":"Manufacturing PLC Controller","criticality":"high","location":{"zone":"zone-e","subnet":"10.20.12.0/24"},"network":{"ip_address":"10.20.12.20"},"tags":["production","plc","industrial"],"@timestamp":"2026-02-10T12:00:00Z"}
{"index":{"_index":"city-assets","_id":"wind-farm-controller-01"}}
{"asset_id":"wind-farm-controller-01","asset_type":"turbine_controller","asset_class":"industrial_control","name":"Wind Farm Controller East","criticality":"medium","location":{"zone":"zone-e","subnet":"10.20.12.0/24"},"network":{"ip_address":"10.20.12.30"},"tags":["production","renewable","industrial"],"@timestamp":"2026-02-10T12:00:00Z"}
{"index":{"_index":"city-assets","_id":"grid-substation-01"}}
{"asset_id":"grid-substation-01","asset_type":"grid_controller","asset_class":"industrial_control","name":"Grid Substation Controller","criticality":"critical","location":{"zone":"zone-e","subnet":"10.20.12.0/24"},"network":{"ip_address":"10.20.12.40"},"tags":["production","critical-path","grid","industrial"],"@timestamp":"2026-02-10T12:00:00Z"}
{"index":{"_index":"city-assets","_id":"city-rail-system-01"}}
{"asset_id":"city-rail-system-01","asset_type":"rail_controller","asset_class":"industrial_control","name":"City Rail System Controller","criticality":"critical","location":{"zone":"zone-e","subnet":"10.20.12.0/24"},"network":{"ip_address":"10.20.12.50"},"tags":["production","critical-path","rail","industrial"],"@timestamp":"2026-02-10T12:00:00Z"}
BULKDATA

echo "✓ Assets loaded"
echo ""
echo "Step 3: Verifying..."

# Verify count (wait a moment for indexing to complete)
sleep 2
ASSET_COUNT=$(curl -s 'http://localhost:9200/city-assets/_count' | grep -o '"count":[0-9]*' | cut -d: -f2)

if [ ! -z "$ASSET_COUNT" ] && [ "$ASSET_COUNT" -gt "0" ]; then
    echo "✓ Successfully indexed $ASSET_COUNT assets"
    echo ""
    echo "=========================================="
    echo "✓ Asset index setup complete!"
    echo "=========================================="
    echo ""
    echo "Next steps:"
    echo "  1. Restart backend: docker compose restart backend"
    echo "  2. Open UI: http://localhost:3000"
    echo "  3. Verify 3D city shows real assets"
else
    echo "✗ Failed to index assets"
    exit 1
fi
