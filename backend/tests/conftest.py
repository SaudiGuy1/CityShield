"""Shared test fixtures.

The ``client`` fixture wraps FastAPI's ``TestClient`` in a context
manager so that the ASGI lifespan fires (indices are created, default
users are seeded, etc.).

The ``auth_headers`` fixture mints a JWT directly via
``create_access_token`` instead of calling ``/api/auth/login``.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.config import settings
from app.core.security import create_access_token


@pytest.fixture(scope="module")
def client():
    """Yield a TestClient whose lifespan has been started."""
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="module")
def auth_headers():
    """Admin JWT auth headers — minted directly."""
    token = create_access_token(
        data={
            "sub": settings.default_admin_user,
            "role": "Administrator",
            "email": settings.default_admin_email,
        }
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def mock_alert_id():
    """A deterministic mock alert ID for tests that don't need a real alert."""
    return "mock-alert-001"