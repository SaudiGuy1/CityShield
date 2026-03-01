"""Shared test fixtures.

The ``client`` fixture wraps FastAPI's ``TestClient`` in a context
manager so that the ASGI lifespan fires (indices are created, default
users are seeded, etc.).

The ``auth_headers`` fixture mints a JWT **directly** via
``create_access_token`` instead of calling ``/api/auth/login``.
This is deliberate: ``get_current_user`` only decodes the JWT — it
never queries OpenSearch for the user record — so a locally minted
token is indistinguishable from one returned by the login endpoint.
Minting directly avoids the fragile chain
  (OpenSearch up → lifespan seeds user → login succeeds → token obtained)
and makes CI deterministic.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.config import settings
from app.core.security import create_access_token


@pytest.fixture(scope="module")
def client():
    """Yield a TestClient with the ASGI lifespan started."""
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="module")
def auth_headers():
    """Admin JWT auth headers — minted directly, no HTTP login needed.

    The JWT contains the same claims that ``/api/auth/login`` would
    produce for the default admin user.  Every RBAC guard in the app
    accepts the ``Administrator`` role.
    """
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
