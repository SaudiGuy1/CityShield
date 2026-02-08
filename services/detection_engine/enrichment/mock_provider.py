"""Mock threat intelligence provider."""
import logging
from datetime import datetime
from typing import Dict, Any
from .provider_base import ThreatIntelProvider

logger = logging.getLogger(__name__)


class MockThreatIntelProvider(ThreatIntelProvider):
    """Mock threat intelligence provider for testing."""

    # Known malicious IPs for testing
    MALICIOUS_IPS = [
        "192.168.100.50",
        "192.168.100.51",
        "203.0.113.10",
        "198.51.100.20"
    ]

    def enrich_ip(self, ip_address: str) -> Dict[str, Any]:
        """Enrich IP address with mock threat intelligence."""
        logger.debug(f"Enriching IP {ip_address} with mock provider")

        # Determine reputation based on IP
        if ip_address in self.MALICIOUS_IPS:
            reputation = "malicious"
            confidence = 0.9
            categories = ["scanner", "attacker", "malware"]
        elif ip_address.startswith("192.168.100."):
            reputation = "suspicious"
            confidence = 0.6
            categories = ["scanner"]
        else:
            reputation = "clean"
            confidence = 0.8
            categories = []

        return {
            "ip_address": ip_address,
            "reputation": reputation,
            "confidence": confidence,
            "categories": categories,
            "last_seen": datetime.utcnow().isoformat() + "Z",
            "provider": "mock"
        }

    def is_available(self) -> bool:
        """Mock provider is always available."""
        return True
