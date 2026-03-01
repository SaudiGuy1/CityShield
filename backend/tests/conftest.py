"""Shared test fixtures.

The key fixture here is ``client``, which wraps FastAPI's ``TestClient``
in a context-manager so that the application **lifespan** fires.  The
lifespan seeds default users into OpenSearch, which means the
``auth_headers`` fixture can log in and obtain a real JWT.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.config import settings


@pytest.fixture(scope="module")
def client():
    """Yield a TestClient whose lifespan has been started.

    Using the context-manager is essential: ``TestClient(app)`` alone does
    **not** trigger the FastAPI lifespan, so ``create_default_admin()``
    would never run and every authenticated request would 401.
    """
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="module")
def auth_headers(client):
    """Admin JWT auth headers, created once per test module."""
    resp = client.post(
        "/api/auth/login",
        json={
            "username": settings.default_admin_user,
            "password": settings.default_admin_pass,
        },
    )
    assert resp.status_code == 200, (
        f"Admin login failed ({resp.status_code}): {resp.text}"
    )
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


@pytest.fixture
def mock_alert_id():
    """A deterministic mock alert ID for tests that don't need a real alert."""
    return "mock-alert-001"
