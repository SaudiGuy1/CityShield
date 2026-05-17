"""End-to-end RBAC tests for awareness team analytics.

Verifies the four-way permission matrix on `GET /api/awareness/progress/user/{username}`:

    requester role         can view target.username?
    ───────────────        ─────────────────────────
    Administrator          always
    self (any role)        always (their own data)
    Manager (direct mgr)   yes
    Manager (other)        no  -> 403
    Analyst / Researcher   no  -> 403

Plus the manager_username validation rules on `PUT /api/users/{username}`.
"""

from datetime import datetime

import pytest
from app.core.rbac import Role
from app.core.security import create_access_token
from app.db.opensearch_client import opensearch_client


def _mint(username: str, role: str) -> dict:
    token = create_access_token(
        data={"sub": username, "role": role, "email": f"{username}@example.com"}
    )
    return {"Authorization": f"Bearer {token}"}


def _seed_user(username: str, role: str, manager_username: str | None = None) -> None:
    """Write a minimal user doc directly to OpenSearch (bypassing create
    endpoint so we can pre-seed managers without API ordering games)."""
    opensearch_client.index_document(
        "users",
        {
            "username": username,
            "email": f"{username}@example.com",
            "role": role,
            "manager_username": manager_username,
            "hashed_password": "x",
            "created_at": datetime.utcnow().isoformat(),
            "is_active": True,
        },
        doc_id=username,
    )


def _cleanup(*usernames: str) -> None:
    for u in usernames:
        try:
            opensearch_client.delete_document("users", u)
        except Exception:
            pass


@pytest.fixture
def team(client):
    """alice (Manager) manages bob (Viewer). carol (Manager) manages noone."""
    _seed_user("alice_mgr_test", Role.MANAGER)
    _seed_user("carol_mgr_test", Role.MANAGER)
    _seed_user("bob_emp_test", Role.VIEWER, manager_username="alice_mgr_test")
    _seed_user("dan_analyst_test", Role.ANALYST)
    yield
    _cleanup("alice_mgr_test", "carol_mgr_test", "bob_emp_test", "dan_analyst_test")


class TestAwarenessProgressUserRBAC:
    def test_self_can_view_own(self, client, team):
        headers = _mint("bob_emp_test", Role.VIEWER)
        r = client.get("/api/awareness/progress/user/bob_emp_test", headers=headers)
        assert r.status_code == 200, r.text

    def test_admin_can_view_any(self, client, team, auth_headers):
        r = client.get("/api/awareness/progress/user/bob_emp_test", headers=auth_headers)
        assert r.status_code == 200

    def test_direct_manager_can_view_report(self, client, team):
        headers = _mint("alice_mgr_test", Role.MANAGER)
        r = client.get("/api/awareness/progress/user/bob_emp_test", headers=headers)
        assert r.status_code == 200, r.text

    def test_other_manager_cannot_view(self, client, team):
        headers = _mint("carol_mgr_test", Role.MANAGER)
        r = client.get("/api/awareness/progress/user/bob_emp_test", headers=headers)
        assert r.status_code == 403

    def test_analyst_cannot_view_other_user(self, client, team):
        headers = _mint("dan_analyst_test", Role.ANALYST)
        r = client.get("/api/awareness/progress/user/bob_emp_test", headers=headers)
        assert r.status_code == 403


class TestAwarenessTeamEndpoint:
    def test_manager_sees_only_direct_reports(self, client, team):
        headers = _mint("alice_mgr_test", Role.MANAGER)
        r = client.get("/api/awareness/progress/team", headers=headers)
        assert r.status_code == 200, r.text
        rows = r.json()
        usernames = {row["user"]["username"] for row in rows}
        assert "bob_emp_test" in usernames
        # carol is a Manager whose manager_username is None; bob's manager is
        # alice, so carol must not appear in alice's team listing.
        assert "carol_mgr_test" not in usernames
        assert "dan_analyst_test" not in usernames

    def test_other_manager_sees_empty_team(self, client, team):
        headers = _mint("carol_mgr_test", Role.MANAGER)
        r = client.get("/api/awareness/progress/team", headers=headers)
        assert r.status_code == 200
        assert r.json() == []

    def test_analyst_blocked_from_team_endpoint(self, client, team):
        headers = _mint("dan_analyst_test", Role.ANALYST)
        r = client.get("/api/awareness/progress/team", headers=headers)
        assert r.status_code == 403


class TestManagerAssignmentValidation:
    def test_cannot_set_self_as_manager(self, client, team, auth_headers):
        r = client.put(
            "/api/users/alice_mgr_test/manager",
            headers=auth_headers,
            json={"manager_username": "alice_mgr_test"},
        )
        assert r.status_code == 400

    def test_cannot_set_nonexistent_manager(self, client, team, auth_headers):
        r = client.put(
            "/api/users/bob_emp_test/manager",
            headers=auth_headers,
            json={"manager_username": "ghost_user_xyz"},
        )
        assert r.status_code == 400

    def test_cannot_set_analyst_as_manager(self, client, team, auth_headers):
        r = client.put(
            "/api/users/bob_emp_test/manager",
            headers=auth_headers,
            json={"manager_username": "dan_analyst_test"},
        )
        assert r.status_code == 400

    def test_can_clear_manager(self, client, team, auth_headers):
        r = client.put(
            "/api/users/bob_emp_test/manager",
            headers=auth_headers,
            json={"manager_username": None},
        )
        assert r.status_code == 200
        assert r.json()["manager_username"] is None

    def test_non_admin_cannot_assign_manager(self, client, team):
        headers = _mint("alice_mgr_test", Role.MANAGER)
        r = client.put(
            "/api/users/bob_emp_test/manager",
            headers=headers,
            json={"manager_username": "alice_mgr_test"},
        )
        assert r.status_code == 403
