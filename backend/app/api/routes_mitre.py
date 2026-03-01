"""MITRE ATT&CK technique routes."""
import json
import logging
from pathlib import Path
from fastapi import APIRouter, Depends, Query
from typing import List, Optional

from ..core.security import get_current_user

router = APIRouter(prefix="/api/mitre", tags=["mitre"])
logger = logging.getLogger(__name__)

_TECHNIQUES_CACHE: list = []


def _load_techniques() -> list:
    """Load MITRE techniques from the JSON data file (cached)."""
    global _TECHNIQUES_CACHE
    if _TECHNIQUES_CACHE:
        return _TECHNIQUES_CACHE
    data_path = Path(__file__).parent.parent / "data" / "mitre_techniques.json"
    with open(data_path, "r") as f:
        _TECHNIQUES_CACHE = json.load(f)
    return _TECHNIQUES_CACHE


@router.get("/techniques")
async def list_techniques(
    search: Optional[str] = Query(None, description="Search by ID or name"),
    tactic: Optional[str] = Query(None, description="Filter by tactic"),
    current_user: dict = Depends(get_current_user),
) -> List[dict]:
    """Get curated list of MITRE ATT&CK techniques."""
    techniques = list(_load_techniques())
    if tactic:
        techniques = [t for t in techniques if t["tactic"].lower() == tactic.lower()]
    if search:
        q = search.lower()
        techniques = [
            t for t in techniques if q in t["id"].lower() or q in t["name"].lower()
        ]
    return techniques
