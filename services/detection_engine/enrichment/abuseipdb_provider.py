"""AbuseIPDB threat intelligence provider."""
import os
import logging
import requests
from datetime import datetime
from typing import Dict, Any
from .provider_base import ThreatIntelProvider

logger = logging.getLogger(__name__)


class AbuseIPDBProvider(ThreatIntelProvider):
    """AbuseIPDB threat intelligence provider."""

    def __init__(self):
        self.api_key = os.getenv("ABUSEIPDB_API_KEY", "")
        self.base_url = "https://api.abuseipdb.com/api/v2"

    def enrich_ip(self, ip_address: str) -> Dict[str, Any]:
        """Enrich IP address with AbuseIPDB threat intelligence."""
        if not self.is_available():
            logger.warning("AbuseIPDB provider not available, API key not set")
            return {
                "ip_address": ip_address,
                "reputation": "unknown",
                "confidence": 0.0,
                "categories": [],
                "last_seen": None,
                "provider": "abuseipdb",
                "error": "API key not configured"
            }

        try:
            headers = {
                "Key": self.api_key,
                "Accept": "application/json"
            }
            params = {
                "ipAddress": ip_address,
                "maxAgeInDays": "90",
                "verbose": ""
            }

            response = requests.get(
                f"{self.base_url}/check",
                headers=headers,
                params=params,
                timeout=10
            )

            if response.status_code == 200:
                data = response.json().get("data", {})
                abuse_score = data.get("abuseConfidenceScore", 0)

                # Determine reputation based on abuse score
                if abuse_score >= 75:
                    reputation = "malicious"
                elif abuse_score >= 25:
                    reputation = "suspicious"
                else:
                    reputation = "clean"

                return {
                    "ip_address": ip_address,
                    "reputation": reputation,
                    "confidence": abuse_score / 100.0,
                    "categories": data.get("usageType", "").split(",") if data.get("usageType") else [],
                    "last_seen": data.get("lastReportedAt"),
                    "provider": "abuseipdb",
                    "abuse_score": abuse_score,
                    "total_reports": data.get("totalReports", 0)
                }
            else:
                logger.error(f"AbuseIPDB API error: {response.status_code}")
                return {
                    "ip_address": ip_address,
                    "reputation": "unknown",
                    "confidence": 0.0,
                    "categories": [],
                    "last_seen": None,
                    "provider": "abuseipdb",
                    "error": f"API error: {response.status_code}"
                }

        except Exception as e:
            logger.error(f"Error enriching IP with AbuseIPDB: {e}")
            return {
                "ip_address": ip_address,
                "reputation": "unknown",
                "confidence": 0.0,
                "categories": [],
                "last_seen": None,
                "provider": "abuseipdb",
                "error": str(e)
            }

    def is_available(self) -> bool:
        """Check if AbuseIPDB provider is available."""
        return bool(self.api_key)
