"""Device abstraction layer for future extensibility.

This module provides an abstraction layer that allows the system to work
with both simulated and physical IoT devices without changing the API or UI.

Design Pattern: Abstract Factory + Strategy
- DeviceInterface: Abstract base class defining device operations
- SimulatedDevice: Implementation for simulated devices (queries OpenSearch)
- PhysicalDevice: Future implementation for real IoT devices (MQTT/CoAP/etc)
- DeviceFactory: Creates appropriate device instance based on device_type
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
import logging
import httpx
from ..db.opensearch_client import opensearch_client

logger = logging.getLogger(__name__)


class DeviceInterface(ABC):
    """Abstract interface for all device types."""

    def __init__(self, asset_id: str, config: Dict[str, Any]):
        """Initialize device with asset_id and configuration."""
        self.asset_id = asset_id
        self.config = config

    @abstractmethod
    async def get_status(self) -> Dict[str, Any]:
        """Get current device status.

        Returns:
            Dict containing:
                - status: 'active' | 'inactive' | 'maintenance' | 'error'
                - last_seen: ISO timestamp
                - additional device-specific fields
        """
        pass

    @abstractmethod
    async def send_command(self, command: str, params: Optional[Dict] = None) -> Dict[str, Any]:
        """Send a command to the device.

        Args:
            command: Command name (e.g., 'restart', 'enable', 'disable')
            params: Optional parameters for the command

        Returns:
            Dict containing:
                - success: bool
                - message: str
                - result: optional command result
        """
        pass

    @abstractmethod
    async def get_telemetry(self, duration_hours: int = 1) -> Dict[str, Any]:
        """Get telemetry data from the device.

        Args:
            duration_hours: How many hours of data to retrieve

        Returns:
            Dict containing:
                - events: list of recent events
                - metrics: aggregated metrics
                - last_update: ISO timestamp
        """
        pass

    @abstractmethod
    async def get_health(self) -> Dict[str, Any]:
        """Get device health information.

        Returns:
            Dict containing:
                - healthy: bool
                - issues: list of issues
                - uptime_percentage: float
                - last_heartbeat: ISO timestamp
        """
        pass


class SimulatedDevice(DeviceInterface):
    """Implementation for simulated devices.

    Queries OpenSearch indices (city-assets, logs-*) to simulate device behavior.
    This is the current implementation for all devices in CityShield.
    """

    async def get_status(self) -> Dict[str, Any]:
        """Get device status from OpenSearch."""
        try:
            doc = opensearch_client.get_document("city-assets", self.asset_id)
            if not doc:
                return {
                    "status": "unknown",
                    "last_seen": None,
                    "error": "Device not found in index"
                }

            return {
                "status": doc.get("status", "active"),
                "last_seen": doc.get("last_seen"),
                "device_type": "simulated",
                "lifecycle_state": doc.get("lifecycle_state", "operational"),
                "location": doc.get("location", {}),
                "network": doc.get("network", {})
            }
        except Exception as e:
            logger.error(f"Failed to get status for simulated device {self.asset_id}: {e}")
            return {
                "status": "error",
                "last_seen": None,
                "error": str(e)
            }

    async def send_command(self, command: str, params: Optional[Dict] = None) -> Dict[str, Any]:
        """Send command to simulated device (updates OpenSearch)."""
        try:
            if command == "enable":
                opensearch_client.update_document("city-assets", self.asset_id, {"status": "active"})
                return {
                    "success": True,
                    "message": f"Simulated device {self.asset_id} enabled",
                    "command": command
                }
            elif command == "disable":
                opensearch_client.update_document("city-assets", self.asset_id, {"status": "inactive"})
                return {
                    "success": True,
                    "message": f"Simulated device {self.asset_id} disabled",
                    "command": command
                }
            elif command == "restart":
                # For simulated devices, this is a no-op but we log it
                logger.info(f"Restart requested for simulated device {self.asset_id}")
                return {
                    "success": True,
                    "message": f"Restart signal sent to simulated device {self.asset_id}",
                    "command": command,
                    "note": "Simulated - no actual restart performed"
                }
            else:
                return {
                    "success": False,
                    "message": f"Unknown command: {command}",
                    "command": command
                }
        except Exception as e:
            logger.error(f"Failed to send command to simulated device {self.asset_id}: {e}")
            return {
                "success": False,
                "message": str(e),
                "command": command
            }

    async def get_telemetry(self, duration_hours: int = 1) -> Dict[str, Any]:
        """Get telemetry from logs-* indices."""
        try:
            now = datetime.utcnow()
            start_time = (now - timedelta(hours=duration_hours)).isoformat() + "Z"

            query = {
                "query": {
                    "bool": {
                        "must": [
                            {"term": {"asset_id": self.asset_id}},
                            {"range": {"@timestamp": {"gte": start_time}}}
                        ]
                    }
                },
                "size": 100,
                "sort": [{"@timestamp": {"order": "desc"}}]
            }

            events = opensearch_client.search("logs-*", query)

            # Aggregate metrics
            event_types = {}
            severities = {}
            for event in events:
                event_type = event.get("event_type", "unknown")
                event_types[event_type] = event_types.get(event_type, 0) + 1

                severity = event.get("severity", "info")
                severities[severity] = severities.get(severity, 0) + 1

            return {
                "events": events[:20],  # Return top 20 most recent
                "metrics": {
                    "total_events": len(events),
                    "event_types": event_types,
                    "severities": severities,
                    "duration_hours": duration_hours
                },
                "last_update": now.isoformat() + "Z"
            }
        except Exception as e:
            logger.error(f"Failed to get telemetry for simulated device {self.asset_id}: {e}")
            return {
                "events": [],
                "metrics": {},
                "last_update": None,
                "error": str(e)
            }

    async def get_health(self) -> Dict[str, Any]:
        """Get device health (based on recent events and alerts)."""
        try:
            now = datetime.utcnow()

            # Check for recent events (indicates device is active)
            events_query = {
                "query": {
                    "bool": {
                        "must": [
                            {"term": {"asset_id": self.asset_id}},
                            {"range": {"@timestamp": {"gte": (now - timedelta(hours=1)).isoformat() + "Z"}}}
                        ]
                    }
                },
                "size": 0
            }
            event_count = opensearch_client.count("logs-*", events_query)

            # Check for open alerts
            alerts_query = {
                "query": {
                    "bool": {
                        "must": [
                            {"term": {"asset_id": self.asset_id}},
                            {"term": {"status": "open"}}
                        ]
                    }
                },
                "size": 5
            }
            alerts = opensearch_client.search("alerts", alerts_query)

            # Determine health status
            issues = []
            if len(alerts) > 0:
                issues.append(f"{len(alerts)} open alert(s)")
            if event_count == 0:
                issues.append("No recent events (device may be offline)")

            healthy = len(alerts) == 0 and event_count > 0

            return {
                "healthy": healthy,
                "issues": issues,
                "uptime_percentage": 100.0 if event_count > 0 else 0.0,
                "last_heartbeat": now.isoformat() + "Z",
                "event_count_1h": event_count,
                "open_alerts": len(alerts)
            }
        except Exception as e:
            logger.error(f"Failed to get health for simulated device {self.asset_id}: {e}")
            return {
                "healthy": False,
                "issues": [f"Error checking health: {str(e)}"],
                "uptime_percentage": 0.0,
                "last_heartbeat": None
            }


class PhysicalDevice(DeviceInterface):
    """Implementation for physical IoT devices via HTTP REST API.

    Communicates with ESP32 and similar devices that expose an HTTP server
    with /status and /command endpoints.
    """

    def _get_device_url(self) -> Optional[str]:
        """Get the device HTTP base URL from config or OpenSearch."""
        ip = self.config.get("ip_address")
        if not ip:
            doc = opensearch_client.get_document("city-assets", self.asset_id)
            if doc:
                ip = (doc.get("network") or {}).get("ip_address")
        return f"http://{ip}" if ip else None

    async def get_status(self) -> Dict[str, Any]:
        """Get status from physical device via HTTP GET /status."""
        base_url = self._get_device_url()
        if not base_url:
            return {"status": "error", "last_seen": None, "error": "No IP configured"}
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{base_url}/status")
                data = resp.json()
                # Also update OpenSearch with latest status
                opensearch_client.update_document("city-assets", self.asset_id, {
                    "status": data.get("state", "active"),
                    "last_seen": datetime.utcnow().isoformat() + "Z"
                })
                return {
                    "status": data.get("state", "active"),
                    "last_seen": datetime.utcnow().isoformat() + "Z",
                    "device_type": "physical",
                    "signal_state": data.get("signal_state"),
                    "uptime_ms": data.get("uptime_ms"),
                    "wifi_rssi": data.get("wifi_rssi"),
                    "free_heap": data.get("free_heap")
                }
        except Exception as e:
            logger.error(f"Failed to reach physical device {self.asset_id}: {e}")
            return {"status": "offline", "last_seen": None, "error": str(e)}

    async def send_command(self, command: str, params: Optional[Dict] = None) -> Dict[str, Any]:
        """Send command to physical device via HTTP POST /command."""
        base_url = self._get_device_url()
        if not base_url:
            return {"success": False, "message": "No IP configured for device"}
        try:
            payload = {"action": command}
            if params:
                payload.update(params)
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.post(f"{base_url}/command", json=payload)
                return resp.json()
        except Exception as e:
            logger.error(f"Failed to send command to {self.asset_id}: {e}")
            return {"success": False, "message": f"Device unreachable: {str(e)}"}

    async def get_telemetry(self, duration_hours: int = 1) -> Dict[str, Any]:
        """Get telemetry — combines live device status with OpenSearch logs."""
        # Get live status from device
        live_status = await self.get_status()
        # Get historical events from OpenSearch (same as simulated)
        try:
            now = datetime.utcnow()
            start_time = (now - timedelta(hours=duration_hours)).isoformat() + "Z"
            query = {
                "query": {
                    "bool": {
                        "must": [
                            {"term": {"asset_id": self.asset_id}},
                            {"range": {"@timestamp": {"gte": start_time}}}
                        ]
                    }
                },
                "size": 100,
                "sort": [{"@timestamp": {"order": "desc"}}]
            }
            events = opensearch_client.search("logs-*", query)
            return {
                "events": events[:20],
                "metrics": {"total_events": len(events), "duration_hours": duration_hours},
                "live_status": live_status,
                "last_update": now.isoformat() + "Z"
            }
        except Exception as e:
            return {"events": [], "metrics": {}, "live_status": live_status, "error": str(e)}

    async def get_health(self) -> Dict[str, Any]:
        """Get health by pinging the physical device."""
        live = await self.get_status()
        healthy = live.get("status") not in ("offline", "error", "crashed")
        issues = []
        if not healthy:
            issues.append(f"Device status: {live.get('status')} - {live.get('error', 'unreachable')}")
        return {
            "healthy": healthy,
            "issues": issues,
            "uptime_percentage": 100.0 if healthy else 0.0,
            "last_heartbeat": live.get("last_seen"),
            "live_status": live
        }


class DeviceFactory:
    """Factory for creating appropriate device instances."""

    @staticmethod
    def create_device(asset_id: str, device_type: str = "simulated", config: Optional[Dict] = None) -> DeviceInterface:
        """Create a device instance based on device_type.

        Args:
            asset_id: Unique device identifier
            device_type: Type of device ('simulated', 'physical', 'virtual')
            config: Optional configuration dict

        Returns:
            DeviceInterface implementation

        Raises:
            ValueError: If device_type is unknown
        """
        if config is None:
            config = {}

        if device_type == "simulated":
            return SimulatedDevice(asset_id, config)
        elif device_type == "physical":
            return PhysicalDevice(asset_id, config)
        elif device_type == "virtual":
            # Virtual devices are like simulated but represent virtualized infrastructure
            return SimulatedDevice(asset_id, config)
        else:
            raise ValueError(f"Unknown device type: {device_type}")


# Example usage in routes:
"""
from app.services.device_service import DeviceFactory

@router.post("/{asset_id}/action")
async def perform_device_action(asset_id: str, action: DeviceAction):
    # Get device info from OpenSearch
    doc = opensearch_client.get_document("city-assets", asset_id)
    device_type = doc.get("device_type", "simulated")

    # Create appropriate device instance
    device = DeviceFactory.create_device(asset_id, device_type)

    # Send command (works for both simulated and physical!)
    result = await device.send_command(action.action)

    return result
"""
