"""Metrics routes."""
from fastapi import APIRouter, Depends
from typing import Dict, Any
from ..core.security import get_current_user
from ..services.metrics_service import MetricsService

router = APIRouter(prefix="/api/metrics", tags=["metrics"])


@router.get("")
async def get_metrics(current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    """Get all evaluation metrics."""
    return MetricsService.get_all_metrics()


@router.get("/mttd")
async def get_mttd(current_user: dict = Depends(get_current_user)) -> Dict[str, float]:
    """Get Mean Time To Detect."""
    mttd = MetricsService.compute_mttd()
    return {"mttd_seconds": mttd}


@router.get("/mttr")
async def get_mttr(current_user: dict = Depends(get_current_user)) -> Dict[str, float]:
    """Get Mean Time To Respond."""
    mttr = MetricsService.compute_mttr()
    return {"mttr_seconds": mttr}


@router.get("/accuracy")
async def get_accuracy(current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    """Get detection accuracy metrics."""
    return MetricsService.compute_detection_accuracy()


@router.get("/resources")
async def get_resources(current_user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    """Get resource utilization metrics."""
    return MetricsService.get_resource_utilization()


@router.get("/ingestion")
async def get_ingestion(
    minutes: int = 5,
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get log ingestion rate."""
    return MetricsService.get_ingestion_rate(minutes=minutes)
