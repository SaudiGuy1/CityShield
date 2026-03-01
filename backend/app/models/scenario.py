"""Scenario data models."""
from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel


class ScenarioBase(BaseModel):
    """Base scenario model."""
    scenario_id: str
    name: str
    description: str
    components: List[str]  # List of simulator components involved
    duration_seconds: int
    attack_pattern: str  # Type of attack pattern
    parameters: Dict[str, Any] = {}
    category: Optional[str] = None  # e.g., "owasp", "mitre", "custom"
    mitre_technique_ids: List[str] = []


class ScenarioCreate(ScenarioBase):
    """Scenario creation model."""
    pass


class ScenarioUpdate(BaseModel):
    """Scenario update model."""
    name: Optional[str] = None
    description: Optional[str] = None
    components: Optional[List[str]] = None
    duration_seconds: Optional[int] = None
    attack_pattern: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None
    category: Optional[str] = None
    mitre_technique_ids: Optional[List[str]] = None


class Scenario(ScenarioBase):
    """Scenario model."""
    created_at: datetime
    created_by: str

    class Config:
        from_attributes = True


class ScenarioRunBase(BaseModel):
    """Base scenario run model."""
    run_id: str
    scenario_id: str
    status: str  # pending, running, completed, failed


class ScenarioRunCreate(BaseModel):
    """Scenario run creation model."""
    scenario_id: str
    target_device_id: Optional[str] = None
    custom_parameters: Optional[Dict[str, Any]] = None  # Custom attack parameters


class ScenarioRun(ScenarioRunBase):
    """Scenario run model."""
    started_at: datetime
    completed_at: Optional[datetime] = None
    started_by: str
    results: Optional[Dict[str, Any]] = None
    target_device_id: Optional[str] = None
    target_component_id: Optional[str] = None
    stages: Optional[List[Dict[str, Any]]] = None
    custom_parameters: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class AttackConfiguration(BaseModel):
    """Attack configuration for custom scenarios."""
    technique: str  # brute_force, port_scan, c2_beacon, data_exfiltration
    parameters: Dict[str, Any]  # Technique-specific parameters


class CustomScenarioCreate(BaseModel):
    """Create a fully custom scenario."""
    name: str
    description: str
    target_component: str
    target_device_id: Optional[str] = None
    attack_chain: List[AttackConfiguration]
    duration_seconds: Optional[int] = None  # Optional, calculated from chain if not provided
    mitre_technique_ids: List[str] = []
