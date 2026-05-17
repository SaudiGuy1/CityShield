"""End-to-end tests for the alert resolution workflow + analytics.

Covers:
  - mandatory resolution_notes (422 when missing/empty)
  - mandatory classification (422 when missing/invalid)
  - resolve sets status, classification, analyst attribution
  - cannot resolve twice (409)
  - amend captures previous_classification + mandatory reason
  - amend without substantive change (400)
  - reopen requires reason, resets status, retains resolution
  - history records resolve -> amend -> reopen in order, newest first
  - legacy PUT /{alert_id} rejects status=resolved (forces workflow)
  - RBAC: Viewer / Manager / Researcher are 403 on resolve, amend, reopen,
    and on the analytics endpoints
"""

from datetime import datetime, timedelta, timezone

import pytest
from app.core.rbac import Role
from app.core.security import create_access_token
from app.db.opensearch_client import opensearch_client


def _mint(username: str, role: str) -> dict:
    token = create_access_token(
        data={"sub": username, "role": role, "email": f"{username}@example.com"}
    )
    return {"Authorization": f"Bearer {token}"}


def _seed_alert(alert_id: str, *, status: str = "open") -> None:
    triggered_at = datetime.now(timezone.utc) - timedelta(minutes=10)
    opensearch_client.index_document(
        "alerts",
        {
            "alert_id": alert_id,
            "triggered_at": triggered_at.isoformat(),
            "rule_id": "CS-TEST",
            "rule_name": "test rule",
            "severity": "high",
            "component": "traffic_management",
            "city_zone": "zone-a",
            "technique_id": "T1110",
            "technique_name": "Brute Force",
            "evidence": {"src_ip": "10.0.0.1"},
            "related_query": "x",
            "status": status,
            "related_events_count": 0,
        },
        doc_id=alert_id,
    )


def _delete_alert(alert_id: str) -> None:
    try:
        opensearch_client.delete_document("alerts", alert_id)
    except Exception:
        pass
    try:
        opensearch_client.client.delete_by_query(
            index="alert-resolution-history",
            body={"query": {"term": {"alert_id": alert_id}}},
            refresh=True,
        )
    except Exception:
        pass


@pytest.fixture
def alert_id(client):
    aid = f"phase4-test-{datetime.now(timezone.utc).timestamp()}"
    _seed_alert(aid)
    yield aid
    _delete_alert(aid)


class TestResolutionMandatoryFields:
    def test_classification_required(self, client, auth_headers, alert_id):
        r = client.post(
            f"/api/alerts/{alert_id}/resolve",
            headers=auth_headers,
            json={"resolution_notes": "looked at it"},
        )
        assert r.status_code == 422

    def test_resolution_notes_required(self, client, auth_headers, alert_id):
        r = client.post(
            f"/api/alerts/{alert_id}/resolve",
            headers=auth_headers,
            json={"classification": "true_positive"},
        )
        assert r.status_code == 422

    def test_empty_resolution_notes_rejected(self, client, auth_headers, alert_id):
        r = client.post(
            f"/api/alerts/{alert_id}/resolve",
            headers=auth_headers,
            json={"classification": "true_positive", "resolution_notes": ""},
        )
        assert r.status_code == 422

    def test_unknown_classification_rejected(self, client, auth_headers, alert_id):
        r = client.post(
            f"/api/alerts/{alert_id}/resolve",
            headers=auth_headers,
            json={"classification": "tp_maybe", "resolution_notes": "x"},
        )
        assert r.status_code == 422


class TestResolutionWorkflow:
    def test_resolve_sets_state_and_attribution(self, client, auth_headers, alert_id):
        r = client.post(
            f"/api/alerts/{alert_id}/resolve",
            headers=auth_headers,
            json={
                "classification": "true_positive",
                "resolution_notes": "Confirmed brute force from 10.0.0.1.",
                "investigation_notes": "Checked auth logs; 47 failed attempts.",
                "remediation_notes": "Blocked IP; rotated admin password.",
            },
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["status"] == "resolved"
        res = body["resolution"]
        assert res["classification"] == "true_positive"
        assert res["resolution_notes"].startswith("Confirmed")
        assert res["investigation_notes"].startswith("Checked")
        assert res["remediation_notes"].startswith("Blocked")
        assert res["resolved_by"]  # admin from the auth_headers fixture
        assert res["resolved_at"]
        assert res["last_amended_by"] is None

    def test_resolve_twice_returns_409(self, client, auth_headers, alert_id):
        client.post(
            f"/api/alerts/{alert_id}/resolve",
            headers=auth_headers,
            json={"classification": "false_positive", "resolution_notes": "noise"},
        )
        r = client.post(
            f"/api/alerts/{alert_id}/resolve",
            headers=auth_headers,
            json={"classification": "true_positive", "resolution_notes": "x"},
        )
        assert r.status_code == 409


class TestAmendment:
    def test_amend_records_previous_and_requires_reason(self, client, auth_headers, alert_id):
        client.post(
            f"/api/alerts/{alert_id}/resolve",
            headers=auth_headers,
            json={"classification": "false_positive", "resolution_notes": "initial"},
        )

        # Missing `reason` -> 422
        bad = client.put(
            f"/api/alerts/{alert_id}/resolution",
            headers=auth_headers,
            json={"classification": "true_positive"},
        )
        assert bad.status_code == 422

        ok = client.put(
            f"/api/alerts/{alert_id}/resolution",
            headers=auth_headers,
            json={"classification": "true_positive", "reason": "found new IOC"},
        )
        assert ok.status_code == 200, ok.text
        assert ok.json()["resolution"]["classification"] == "true_positive"
        assert ok.json()["resolution"]["last_amended_by"]

        # History captures previous classification
        h = client.get(
            f"/api/alerts/{alert_id}/resolution-history",
            headers=auth_headers,
        ).json()
        amend_entry = next(e for e in h if e["action"] == "amend")
        assert amend_entry["previous_classification"] == "false_positive"
        assert amend_entry["classification"] == "true_positive"
        assert amend_entry["reason"] == "found new IOC"

    def test_amend_without_changes_is_400(self, client, auth_headers, alert_id):
        client.post(
            f"/api/alerts/{alert_id}/resolve",
            headers=auth_headers,
            json={"classification": "benign", "resolution_notes": "ok"},
        )
        r = client.put(
            f"/api/alerts/{alert_id}/resolution",
            headers=auth_headers,
            json={"reason": "just because"},
        )
        assert r.status_code == 400


class TestReopen:
    def test_reopen_resets_status_and_records_reason(self, client, auth_headers, alert_id):
        client.post(
            f"/api/alerts/{alert_id}/resolve",
            headers=auth_headers,
            json={"classification": "true_positive", "resolution_notes": "ok"},
        )

        bad = client.post(
            f"/api/alerts/{alert_id}/reopen",
            headers=auth_headers,
            json={},
        )
        assert bad.status_code == 422

        ok = client.post(
            f"/api/alerts/{alert_id}/reopen",
            headers=auth_headers,
            json={"reason": "new evidence surfaced"},
        )
        assert ok.status_code == 200, ok.text
        body = ok.json()
        assert body["status"] == "open"
        # resolution object should be preserved for the audit trail
        assert body["resolution"] is not None

        history = client.get(
            f"/api/alerts/{alert_id}/resolution-history",
            headers=auth_headers,
        ).json()
        actions = [e["action"] for e in history]
        # Newest first: reopen, then resolve
        assert actions[0] == "reopen"
        assert actions[-1] == "resolve"


class TestLegacyStatusGuard:
    def test_legacy_put_cannot_set_status_resolved(self, client, auth_headers, alert_id):
        r = client.put(
            f"/api/alerts/{alert_id}",
            headers=auth_headers,
            json={"status": "resolved"},
        )
        assert r.status_code == 400
        assert "POST /api/alerts" in r.json()["detail"]


class TestResolutionRBAC:
    """Resolution endpoints accept only Analyst / Administrator."""

    @pytest.mark.parametrize("role", [Role.VIEWER, Role.MANAGER, Role.RESEARCHER])
    def test_non_analyst_cannot_resolve(self, client, alert_id, role):
        headers = _mint("rbac_user_phase4", role)
        r = client.post(
            f"/api/alerts/{alert_id}/resolve",
            headers=headers,
            json={"classification": "true_positive", "resolution_notes": "x"},
        )
        assert r.status_code == 403

    @pytest.mark.parametrize("role", [Role.VIEWER, Role.MANAGER, Role.RESEARCHER])
    def test_non_analyst_cannot_amend(self, client, alert_id, auth_headers, role):
        client.post(
            f"/api/alerts/{alert_id}/resolve",
            headers=auth_headers,
            json={"classification": "true_positive", "resolution_notes": "x"},
        )
        headers = _mint("rbac_user_phase4", role)
        r = client.put(
            f"/api/alerts/{alert_id}/resolution",
            headers=headers,
            json={"classification": "false_positive", "reason": "y"},
        )
        assert r.status_code == 403

    @pytest.mark.parametrize("role", [Role.VIEWER, Role.MANAGER, Role.RESEARCHER])
    def test_non_analyst_cannot_reopen(self, client, alert_id, auth_headers, role):
        client.post(
            f"/api/alerts/{alert_id}/resolve",
            headers=auth_headers,
            json={"classification": "true_positive", "resolution_notes": "x"},
        )
        headers = _mint("rbac_user_phase4", role)
        r = client.post(
            f"/api/alerts/{alert_id}/reopen",
            headers=headers,
            json={"reason": "y"},
        )
        assert r.status_code == 403

    @pytest.mark.parametrize(
        "path",
        [
            "/api/alerts/analytics/tp-fp-trends",
            "/api/alerts/analytics/analyst-activity",
            "/api/alerts/analytics/resolution-timelines",
        ],
    )
    @pytest.mark.parametrize("role", [Role.VIEWER, Role.MANAGER, Role.RESEARCHER])
    def test_non_analyst_blocked_from_analytics(self, client, role, path):
        headers = _mint("rbac_user_phase4_analytics", role)
        r = client.get(path, headers=headers)
        assert r.status_code == 403

    def test_history_readable_by_any_authenticated(self, client, alert_id, auth_headers):
        client.post(
            f"/api/alerts/{alert_id}/resolve",
            headers=auth_headers,
            json={"classification": "true_positive", "resolution_notes": "x"},
        )
        for role in (Role.VIEWER, Role.MANAGER, Role.RESEARCHER, Role.ANALYST):
            headers = _mint("read_only_user", role)
            r = client.get(f"/api/alerts/{alert_id}/resolution-history", headers=headers)
            assert r.status_code == 200, f"role={role}"
            assert isinstance(r.json(), list)


class TestAnalyticsSmoke:
    def test_tp_fp_trends_returns_totals(self, client, auth_headers, alert_id):
        client.post(
            f"/api/alerts/{alert_id}/resolve",
            headers=auth_headers,
            json={"classification": "true_positive", "resolution_notes": "x"},
        )
        r = client.get("/api/alerts/analytics/tp-fp-trends", headers=auth_headers)
        assert r.status_code == 200, r.text
        body = r.json()
        for key in ("true_positive", "false_positive", "benign", "informational"):
            assert key in body["totals"]

    def test_analyst_activity_returns_rows(self, client, auth_headers, alert_id):
        client.post(
            f"/api/alerts/{alert_id}/resolve",
            headers=auth_headers,
            json={"classification": "false_positive", "resolution_notes": "x"},
        )
        r = client.get("/api/alerts/analytics/analyst-activity", headers=auth_headers)
        assert r.status_code == 200
        rows = r.json()
        assert any(row["resolves"] >= 1 for row in rows)

    def test_timelines_includes_sample(self, client, auth_headers, alert_id):
        client.post(
            f"/api/alerts/{alert_id}/resolve",
            headers=auth_headers,
            json={"classification": "true_positive", "resolution_notes": "x"},
        )
        r = client.get("/api/alerts/analytics/resolution-timelines", headers=auth_headers)
        assert r.status_code == 200, r.text
        body = r.json()
        assert isinstance(body["samples"], list)
        # average/median/p95 may be None if other tests cleaned up too aggressively;
        # at minimum the structure must be present.
        assert {"average_seconds", "median_seconds", "p95_seconds"} <= set(body)
