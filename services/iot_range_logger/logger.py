"""
IoT Range network logger.

Captures traffic on the iot_range_net interface using tcpdump,
parses packets, and writes CityShield-compatible JSON events to
/data/logs/iot_range.log for Filebeat to pick up.
"""
import subprocess
import json
import re
import os
import signal
import sys
from datetime import datetime, timezone

LOG_PATH = "/data/logs/iot_range.log"
CAPTURE_INTERFACE = os.getenv("CAPTURE_INTERFACE", "eth0")

# Regex to parse tcpdump verbose output
TCP_RE = re.compile(
    r"(?P<time>\S+)\s+IP\s+(?P<src>[0-9.]+)\.(?P<sport>\d+)\s+>\s+(?P<dst>[0-9.]+)\.(?P<dport>\d+):\s+(?P<rest>.*)"
)
ICMP_RE = re.compile(
    r"(?P<time>\S+)\s+IP\s+(?P<src>[0-9.]+)\s+>\s+(?P<dst>[0-9.]+):\s+ICMP\s+(?P<rest>.*)"
)


def classify_event(src_port: int, dst_port: int, flags: str) -> tuple:
    """Classify a TCP packet into an event type."""
    if "S" in flags and "A" not in flags:
        return "port_scan", True
    return "network_connection", False


def write_event(event: dict):
    """Append a JSON event line to the log file."""
    with open(LOG_PATH, "a") as f:
        f.write(json.dumps(event) + "\n")


def handle_tcp_line(match: re.Match):
    """Process a TCP packet line from tcpdump."""
    src_ip = match.group("src")
    dst_ip = match.group("dst")
    src_port = int(match.group("sport"))
    dst_port = int(match.group("dport"))
    rest = match.group("rest")

    flags = ""
    flag_match = re.search(r"Flags \[([^\]]+)\]", rest)
    if flag_match:
        flags = flag_match.group(1)

    event_type, is_attack = classify_event(src_port, dst_port, flags)

    event = {
        "@timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
        "source_ip": src_ip,
        "destination_ip": dst_ip,
        "src_ip": src_ip,
        "dst_ip": dst_ip,
        "src_port": src_port,
        "dst_port": dst_port,
        "event_type": event_type,
        "zone": "iot-range",
        "component": "iot_range",
        "asset_id": "iot-range-target",
        "is_attack": is_attack,
        "message": f"TCP {src_ip}:{src_port} -> {dst_ip}:{dst_port} [{flags}]",
        "metadata": {"flags": flags, "protocol": "tcp"},
    }
    write_event(event)


def handle_icmp_line(match: re.Match):
    """Process an ICMP packet line from tcpdump."""
    src_ip = match.group("src")
    dst_ip = match.group("dst")
    rest = match.group("rest")

    event = {
        "@timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
        "source_ip": src_ip,
        "destination_ip": dst_ip,
        "src_ip": src_ip,
        "dst_ip": dst_ip,
        "event_type": "icmp_probe",
        "zone": "iot-range",
        "component": "iot_range",
        "asset_id": "iot-range-target",
        "is_attack": "request" in rest.lower(),
        "message": f"ICMP {src_ip} -> {dst_ip}: {rest.strip()[:80]}",
        "metadata": {"protocol": "icmp"},
    }
    write_event(event)


def main():
    print(f"[iot_range_logger] Starting tcpdump on {CAPTURE_INTERFACE}")
    print(f"[iot_range_logger] Writing events to {LOG_PATH}")

    os.makedirs(os.path.dirname(LOG_PATH), exist_ok=True)

    proc = subprocess.Popen(
        [
            "tcpdump",
            "-i", CAPTURE_INTERFACE,
            "-n",
            "-l",
            "-tt",
            "--immediate-mode",
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        text=True,
        bufsize=1,
    )

    def shutdown(signum, frame):
        print("[iot_range_logger] Shutting down...")
        proc.terminate()
        sys.exit(0)

    signal.signal(signal.SIGTERM, shutdown)
    signal.signal(signal.SIGINT, shutdown)

    packet_count = 0
    for line in proc.stdout:
        line = line.strip()
        if not line:
            continue

        tcp_match = TCP_RE.match(line)
        if tcp_match:
            handle_tcp_line(tcp_match)
            packet_count += 1
            if packet_count % 100 == 0:
                print(f"[iot_range_logger] Processed {packet_count} packets")
            continue

        icmp_match = ICMP_RE.match(line)
        if icmp_match:
            handle_icmp_line(icmp_match)
            packet_count += 1
            continue


if __name__ == "__main__":
    main()
