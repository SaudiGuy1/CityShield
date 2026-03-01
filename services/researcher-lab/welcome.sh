#!/bin/bash
# Research Lab welcome banner — single source of truth.
# Sourced from /etc/bash.bashrc on every interactive session.

# Guard: only run for interactive shells.
[[ $- == *i* ]] || return 0

# Guard: never print more than once per shell session.
[[ -n "$_CITYSHIELD_WELCOME_SHOWN" ]] && return 0
export _CITYSHIELD_WELCOME_SHOWN=1

echo ""
echo "=== CityShield Research Lab ==="
echo ""
echo "You are connected to the CityShield network, the Cyber Range, and the IoT Range."
echo ""
echo "Available targets:"
echo "  metasploitable              - Vulnerable training target (cyber range)"
echo "  iot_target (172.21.0.2)     - IoT sensor hub (HTTP :8080, MQTT :1883)"
echo "  opensearch        :9200     - Data store"
echo "  cityshield_backend:8000     - Backend API"
echo "  traffic_sim       :8001     - Traffic simulator"
echo "  iot_sim           :8002     - IoT simulator"
echo "  network_emulator  :8003     - Network emulator"
echo ""
echo "Quick start:"
echo "  nmap -sT --top-ports 20 metasploitable"
echo "  curl http://iot_target:8080/sensors        # Query IoT sensor data"
echo "  nmap -sT -p 1883,8080 iot_target           # Scan IoT target ports"
echo "  ping -c 2 metasploitable"
echo ""
echo "Installed tools: nmap, hydra, nikto, netcat, tcpdump, curl, wget, python3, ping, dig"
echo ""
