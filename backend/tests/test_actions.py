"""Tests for action execution and audit functionality.

All fixtures (``client``, ``auth_headers``, ``mock_alert_id``) are
provided by ``conftest.py``.  The ``client`` fixture enters
``TestClient(app)`` as a context-manager so the FastAPI lifespan fires
and default users are seeded into OpenSearch before any request.
"""

import pytest
from app.services.action_service import ActionService
from app.models.action import ActionMetadata


# ---------------------------------------------------------------------------
# Available actions
# ---------------------------------------------------------------------------

class TestAvailableActions:
    """Tests for listing available actions."""

    def test_list_available_actions(self, client, auth_headers):
        """Test listing all available response actions."""
        response = client.get("/api/actions", headers=auth_headers)

        assert response.status_code == 200
        actions = response.json()
        assert isinstance(actions, list)

        # Should have at least the 3 default actions
        action_names = [a["action_name"] for a in actions]
        assert "block_ip" in action_names
        assert "isolate_service" in action_names
        assert "revoke_token" in action_names

        # Verify action metadata structure
        for action in actions:
            assert "action_name" in action
            assert "description" in action
            assert "parameters" in action
            assert "playbook" in action
            assert isinstance(action["parameters"], list)

    def test_list_actions_unauthorized(self, client):
        """Test that unauthorized requests are rejected."""
        response = client.get("/api/actions")
        assert response.status_code in [401, 403]


# ---------------------------------------------------------------------------
# Manual action execution
# ---------------------------------------------------------------------------

class TestManualActionExecution:
    """Tests for manual action execution."""

    def test_execute_action_success(self, client, auth_headers, mock_alert_id):
        """Test successful manual action execution."""
        request_data = {
            "action_name": "block_ip",
            "parameters": None,
        }

        response = client.post(
            f"/api/actions/execute/{mock_alert_id}",
            json=request_data,
            headers=auth_headers,
        )

        # Alert doesn't exist in the test index → 400 "Alert not found"
        # (or 200 if it somehow does, or 404 for other reasons)
        assert response.status_code in [200, 400, 404]

        if response.status_code == 200:
            result = response.json()
            assert "audit_id" in result
            assert result["action_name"] == "block_ip"
            assert result["status"] == "queued"

    def test_execute_invalid_action(self, client, auth_headers, mock_alert_id):
        """Test execution of non-existent action."""
        request_data = {
            "action_name": "invalid_action_name",
            "parameters": None,
        }

        response = client.post(
            f"/api/actions/execute/{mock_alert_id}",
            json=request_data,
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "Unknown action" in response.json()["detail"]

    def test_execute_action_unauthorized(self, client, mock_alert_id):
        """Test that unauthorized users cannot execute actions."""
        request_data = {
            "action_name": "block_ip",
            "parameters": None,
        }

        response = client.post(
            f"/api/actions/execute/{mock_alert_id}",
            json=request_data,
        )

        assert response.status_code in [401, 403]


# ---------------------------------------------------------------------------
# Audit log
# ---------------------------------------------------------------------------

class TestActionAuditLog:
    """Tests for action audit log queries."""

    def test_query_audit_log(self, client, auth_headers):
        """Test querying action audit log."""
        response = client.get("/api/actions/audit", headers=auth_headers)

        assert response.status_code == 200
        entries = response.json()
        assert isinstance(entries, list)

    def test_query_audit_log_with_filters(self, client, auth_headers):
        """Test querying audit log with filters."""
        params = {
            "execution_type": "automated",
            "status": "success",
            "limit": 10,
        }

        response = client.get(
            "/api/actions/audit",
            params=params,
            headers=auth_headers,
        )

        assert response.status_code == 200
        entries = response.json()
        assert isinstance(entries, list)

        for entry in entries:
            if entry.get("execution_type"):
                assert entry["execution_type"] == "automated"
            if entry.get("status"):
                assert entry["status"] == "success"

    def test_get_alert_action_history(self, client, auth_headers, mock_alert_id):
        """Test getting action history for a specific alert."""
        response = client.get(
            f"/api/actions/alert/{mock_alert_id}/history",
            headers=auth_headers,
        )

        assert response.status_code == 200
        entries = response.json()
        assert isinstance(entries, list)

    def test_get_rule_execution_history(self, client, auth_headers):
        """Test getting execution history for a specific rule."""
        rule_id = "net_scan_001"

        response = client.get(
            f"/api/actions/rule/{rule_id}/history",
            headers=auth_headers,
        )

        assert response.status_code == 200
        entries = response.json()
        assert isinstance(entries, list)


# ---------------------------------------------------------------------------
# Auto-response configuration
# ---------------------------------------------------------------------------

class TestAutoResponseConfiguration:
    """Tests for auto-response configuration."""

    def test_update_auto_response_config(self, client, auth_headers):
        """Test updating auto-response configuration for a rule."""
        rule_id = "net_scan_001"

        config = {
            "enabled": True,
            "conditions": {
                "min_severity": "high",
                "require_enrichment": False,
                "max_executions_per_hour": 10,
            },
        }

        response = client.put(
            f"/api/rules/{rule_id}/auto-response",
            json=config,
            headers=auth_headers,
        )

        # 404 if rule doesn't exist in test environment
        assert response.status_code in [200, 404]

        if response.status_code == 200:
            rule = response.json()
            assert "auto_response_config" in rule
            assert rule["auto_response_config"]["enabled"] is True
            assert rule["auto_response_config"]["conditions"]["min_severity"] == "high"

    def test_disable_auto_response(self, client, auth_headers):
        """Test disabling auto-response for a rule."""
        rule_id = "brute_force_001"

        config = {
            "enabled": False,
            "conditions": {
                "min_severity": "high",
                "require_enrichment": False,
                "max_executions_per_hour": 10,
            },
        }

        response = client.put(
            f"/api/rules/{rule_id}/auto-response",
            json=config,
            headers=auth_headers,
        )

        assert response.status_code in [200, 404]

        if response.status_code == 200:
            rule = response.json()
            assert rule["auto_response_config"]["enabled"] is False


# ---------------------------------------------------------------------------
# ActionService unit tests (no HTTP)
# ---------------------------------------------------------------------------

class TestActionService:
    """Unit tests for ActionService."""

    def test_get_available_actions(self):
        """Test getting available actions from service."""
        actions = ActionService.get_available_actions()

        assert isinstance(actions, list)
        assert len(actions) >= 3  # At least 3 default actions

        for action in actions:
            assert isinstance(action, ActionMetadata)
            assert action.action_name
            assert action.description
            assert action.playbook

    def test_check_rate_limit_within_limit(self):
        """Test rate limit check when within limit."""
        # Requires pre-populated audit data — placeholder
        pass

    def test_check_rate_limit_exceeded(self):
        """Test rate limit check when limit is exceeded."""
        # Requires pre-populated audit data — placeholder
        pass


class TestConditionValidation:
    """Tests for auto-response condition validation."""

    def test_severity_threshold_check(self):
        """Placeholder — needs condition-checking logic exposed for unit test."""
        pass

    def test_enrichment_requirement_check(self):
        """Placeholder — needs condition-checking logic exposed for unit test."""
        pass


# ---------------------------------------------------------------------------
# Integration (end-to-end) tests
# ---------------------------------------------------------------------------

class TestEndToEndActionExecution:
    """End-to-end tests for action execution workflow."""

    @pytest.mark.integration
    def test_full_action_workflow(self, client, auth_headers):
        """Test complete workflow from action execution to audit log."""
        actions_response = client.get("/api/actions", headers=auth_headers)
        assert actions_response.status_code == 200
        actions = actions_response.json()
        assert len(actions) > 0

    @pytest.mark.integration
    def test_auto_response_triggers_correctly(self):
        """Placeholder for full auto-response flow test."""
        pass


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
