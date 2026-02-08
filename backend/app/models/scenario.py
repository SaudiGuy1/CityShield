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


class ScenarioRun(ScenarioRunBase):
    """Scenario run model."""
    started_at: datetime
    completed_at: Optional[datetime] = None
    started_by: str
    results: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True
