#!/bin/bash
# Clean stale welcome/banner lines from the volume-mounted .bashrc.
# Runs once at container start, before handing off to CMD.
BASHRC="/home/researcher/.bashrc"
if [ -f "$BASHRC" ] && grep -qE 'welcome\.sh|CityShield|Available targets|Installed tools|Quick start|metasploitable|opensearch.*9200|traffic_sim|iot_sim|network_emulator|cityshield_backend' "$BASHRC" 2>/dev/null; then
    # Remove any line that is part of an old inline banner or sources the old welcome script
    sed -i '/welcome\.sh/d; /CityShield/d; /Available targets/d; /Installed tools/d; /Quick start/d; /metasploitable/d; /opensearch/d; /traffic_sim/d; /iot_sim/d; /network_emulator/d; /cityshield_backend/d; /Vulnerable/d; /Cyber Range/d' "$BASHRC"
    # Remove bare echo "" lines (banner spacers) and collapse blank lines
    sed -i '/^echo ""$/d; /^echo '\'''\''$/d' "$BASHRC"
    sed -i '/^[[:space:]]*$/N;/^\n[[:space:]]*$/d' "$BASHRC"
fi

exec "$@"
