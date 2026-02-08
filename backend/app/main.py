"""Main FastAPI application."""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

from .core.config import settings
from .core.security import get_password_hash
from .core.rbac import Role
from .db.opensearch_client import opensearch_client
from .utils.logging import setup_logging
from .api import (
    routes_auth,
    routes_health,
    routes_users,
    routes_rules,
    routes_scenarios,
    routes_alerts,
    routes_metrics,
    routes_logs
)

# Setup logging
setup_logging()
logger = logging.getLogger(__name__)


def create_default_admin():
    """Create default admin user if it doesn't exist."""
    try:
        # Check if admin user exists
        query = {
            "query": {"term": {"username": settings.default_admin_user}},
            "size": 1
        }
        existing = opensearch_client.search("users", query)

        if not existing:
            logger.info("Creating default admin user...")
            admin_doc = {
                "username": settings.default_admin_user,
                "email": settings.default_admin_email,
                "role": Role.ADMINISTRATOR,
                "hashed_password": get_password_hash(settings.default_admin_pass),
                "created_at": datetime.utcnow().isoformat(),
                "is_active": True
            }
            opensearch_client.index_document("users", admin_doc, doc_id=settings.default_admin_user)
            logger.info(f"Default admin user created: {settings.default_admin_user}")
            logger.warning("IMPORTANT: Change the default admin password after first login!")
        else:
            logger.info("Default admin user already exists")

    except Exception as e:
        logger.error(f"Error creating default admin user: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    logger.info("Starting CityShield Backend API...")
    logger.info(f"Connecting to OpenSearch at {settings.opensearch_url}")

    # Create default admin user
    create_default_admin()

    logger.info("Application startup complete")

    yield

    # Shutdown
    logger.info("Shutting down CityShield Backend API...")


# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="CityShield Platform Backend API",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(routes_health.router)
app.include_router(routes_auth.router)
app.include_router(routes_users.router)
app.include_router(routes_rules.router)
app.include_router(routes_scenarios.router)
app.include_router(routes_alerts.router)
app.include_router(routes_metrics.router)
app.include_router(routes_logs.router)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "app": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs",
        "health": "/api/health"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
