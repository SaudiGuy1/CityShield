"""Device models for asset management."""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List


class DeviceLocation(BaseModel):
    """Device location information."""
    zone: Optional[str] = None
    subnet: Optional[str] = None
    building: Optional[str] = None
    floor: Optional[str] = None
    coordinates: Optional[Dict[str, float]] = None


class DeviceNetwork(BaseModel):
    """Device network configuration."""
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    vlan: Optional[str] = None
    gateway: Optional[str] = None


class Device(BaseModel):
    """Base device model."""
    asset_id: str
    name: str
    asset_type: str
    asset_class: Optional[str] = None
    criticality: Optional[str] = "medium"
    location: Optional[DeviceLocation] = None
    network: Optional[DeviceNetwork] = None
    status: str = "active"
    last_seen: Optional[str] = None
    events_1h: int = 0
    alerts_open: int = 0
    risk_score: int = 0
    tags: List[str] = Field(default_factory=list)
    device_type: str = "simulated"  # simulated, physical, virtual
    last_heartbeat: Optional[str] = None
    lifecycle_state: Optional[str] = "operational"


class DeviceMetrics(BaseModel):
    """Device operational metrics."""
    events_24h: int = 0
    events_7d: int = 0
    alerts_24h: int = 0
    alerts_7d: int = 0
    uptime_percentage: float = 100.0
    last_incident: Optional[str] = None


class RecentEvent(BaseModel):
    """Recent event summary."""
    timestamp: str
    event_type: str
    severity: Optional[str] = None
    message: Optional[str] = None


class RecentAlert(BaseModel):
    """Recent alert summary."""
    alert_id: str
    triggered_at: str
    rule_name: str
    severity: str
    status: str


class DeviceDetail(Device):
    """Detailed device information with metrics."""
    metrics: Optional[DeviceMetrics] = None
    recent_events: List[RecentEvent] = Field(default_factory=list)
    recent_alerts: List[RecentAlert] = Field(default_factory=list)
    metadata: Optional[Dict[str, Any]] = None


class DeviceUpdate(BaseModel):
    """Device update payload (admin-only)."""
    status: Optional[str] = None
    tags: Optional[List[str]] = None
    criticality: Optional[str] = None
    lifecycle_state: Optional[str] = None


class DeviceAction(BaseModel):
    """Device action payload."""
    action: str  # enable, disable, restart, etc.
    reason: Optional[str] = None


class DeviceListFilters(BaseModel):
    """Filters for device list endpoint."""
    zone: Optional[str] = None
    asset_type: Optional[str] = None
    status: Optional[str] = None
    criticality: Optional[str] = None
    search: Optional[str] = None
    has_alerts: Optional[bool] = None
