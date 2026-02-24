#!/bin/bash
# Research Lab welcome banner — single source of truth.
# Sourced from /etc/bash.bashrc on every interactive session.

# Guard: only run for interactive shells.
[[ $- == *i* ]] || return 0

echo ""
echo "=== CityShield Research Lab ==="
echo ""
echo "You are connected to the CityShield network and the Cyber Range."
echo ""
echo "Available targets:"
echo "  metasploitable              - Vulnerable training target (cyber range)"
echo "  opensearch        :9200     - Data store"
echo "  cityshield_backend:8000     - Backend API"
echo "  traffic_sim       :8001     - Traffic simulator"
echo "  iot_sim           :8002     - IoT simulator"
echo "  network_emulator  :8003     - Network emulator"
echo ""
echo "Quick start:"
echo "  nmap -sT --top-ports 20 metasploitable"
echo "  hydra -l msfadmin -P /usr/share/nmap/nselib/data/passwords.lst metasploitable ssh"
echo "  ping -c 2 metasploitable"
echo ""
echo "Installed tools: nmap, hydra, nikto, netcat, tcpdump, curl, wget, python3, ping, dig"
echo ""
