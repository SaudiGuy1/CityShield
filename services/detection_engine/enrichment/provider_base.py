"""Base provider interface for threat intelligence enrichment."""
from abc import ABC, abstractmethod
from typing import Dict, Any


class ThreatIntelProvider(ABC):
    """Base class for threat intelligence providers."""

    @abstractmethod
    def enrich_ip(self, ip_address: str) -> Dict[str, Any]:
        """
        Enrich IP address with threat intelligence.

        Args:
            ip_address: IP address to enrich

        Returns:
            Dictionary with enrichment data:
            {
                "ip_address": str,
                "reputation": str (malicious/suspicious/clean),
                "confidence": float (0-1),
                "categories": List[str],
                "last_seen": str (ISO timestamp),
                "provider": str
            }
        """
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """Check if provider is available."""
        pass
