"""Health check routes."""
from fastapi import APIRouter
from datetime import datetime
from ..core.config import settings
from ..db.opensearch_client import opensearch_client

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    opensearch_status = "unknown"
    try:
        cluster_health = opensearch_client.client.cluster.health()
        opensearch_status = cluster_health.get("status", "unknown")
    except Exception as e:
        opensearch_status = f"error: {str(e)}"

    return {
        "status": "healthy",
        "app_name": settings.app_name,
        "app_version": settings.app_version,
        "timestamp": datetime.utcnow().isoformat(),
        "opensearch_status": opensearch_status
    }


@router.get("/status")
async def system_status():
    """Get system status with component health."""
    components = {
        "backend": "healthy",
        "opensearch": "unknown"
    }

    try:
        cluster_health = opensearch_client.client.cluster.health()
        components["opensearch"] = cluster_health.get("status", "unknown")
    except Exception:
        components["opensearch"] = "unhealthy"

    # Check indices
    try:
        indices = ["users", "rules", "scenarios", "alerts", "logs"]
        indices_status = {}
        for index in indices:
            exists = opensearch_client.client.indices.exists(index=index)
            indices_status[index] = "exists" if exists else "missing"
    except Exception:
        indices_status = {"error": "Failed to check indices"}

    return {
        "status": "healthy" if components["opensearch"] != "unhealthy" else "degraded",
        "components": components,
        "indices": indices_status,
        "timestamp": datetime.utcnow().isoformat()
    }
