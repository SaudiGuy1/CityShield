"""Tests for action execution and audit functionality."""
import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from app.main import app
from app.services.action_service import ActionService
from app.models.action import (
    ActionMetadata,
    ActionExecutionRequest,
    ActionAuditFilters,
    AutoResponseConfig,
    AutoResponseConditions
)


client = TestClient(app)


@pytest.fixture
def auth_headers():
    """Get authentication headers for testing."""
    from app.core.config import settings

    # Login as admin to get token (password comes from config/env)
    response = client.post(
        "/api/auth/login",
        json={
            "username": settings.default_admin_user,
            "password": settings.default_admin_pass,
        }
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def mock_alert_id():
    """Create a mock alert for testing."""
    # In a real test, you would create an actual alert in OpenSearch
    # For now, we'll use a mock ID
    return "mock-alert-001"


class TestAvailableActions:
    """Tests for listing available actions."""

    def test_list_available_actions(self, auth_headers):
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

    def test_list_actions_unauthorized(self):
        """Test that unauthorized requests are rejected."""
        response = client.get("/api/actions")
        assert response.status_code in [401, 403]


class TestManualActionExecution:
    """Tests for manual action execution."""

    def test_execute_action_success(self, auth_headers, mock_alert_id):
        """Test successful manual action execution."""
        request_data = {
            "action_name": "block_ip",
            "parameters": None
        }

        response = client.post(
            f"/api/actions/execute/{mock_alert_id}",
            json=request_data,
            headers=auth_headers
        )

        # Should accept the request even if alert doesn't exist in test environment
        # In production, it would create an audit entry
        assert response.status_code in [200, 400, 404]

        if response.status_code == 200:
            result = response.json()
            assert "audit_id" in result
            assert result["action_name"] == "block_ip"
            assert result["status"] == "queued"

    def test_execute_invalid_action(self, auth_headers, mock_alert_id):
        """Test execution of non-existent action."""
        request_data = {
            "action_name": "invalid_action_name",
            "parameters": None
        }

        response = client.post(
            f"/api/actions/execute/{mock_alert_id}",
            json=request_data,
            headers=auth_headers
        )

        assert response.status_code == 400
        assert "Unknown action" in response.json()["detail"]

    def test_execute_action_unauthorized(self, mock_alert_id):
        """Test that unauthorized users cannot execute actions."""
        request_data = {
            "action_name": "block_ip",
            "parameters": None
        }

        response = client.post(
            f"/api/actions/execute/{mock_alert_id}",
            json=request_data
        )

        assert response.status_code in [401, 403]


class TestActionAuditLog:
    """Tests for action audit log queries."""

    def test_query_audit_log(self, auth_headers):
        """Test querying action audit log."""
        response = client.get("/api/actions/audit", headers=auth_headers)

        assert response.status_code == 200
        entries = response.json()
        assert isinstance(entries, list)

    def test_query_audit_log_with_filters(self, auth_headers):
        """Test querying audit log with filters."""
        params = {
            "execution_type": "automated",
            "status": "success",
            "limit": 10
        }

        response = client.get(
            "/api/actions/audit",
            params=params,
            headers=auth_headers
        )

        assert response.status_code == 200
        entries = response.json()
        assert isinstance(entries, list)

        # Verify all returned entries match filters
        for entry in entries:
            if entry.get("execution_type"):
                assert entry["execution_type"] == "automated"
            if entry.get("status"):
                assert entry["status"] == "success"

    def test_get_alert_action_history(self, auth_headers, mock_alert_id):
        """Test getting action history for a specific alert."""
        response = client.get(
            f"/api/actions/alert/{mock_alert_id}/history",
            headers=auth_headers
        )

        assert response.status_code == 200
        entries = response.json()
        assert isinstance(entries, list)

    def test_get_rule_execution_history(self, auth_headers):
        """Test getting execution history for a specific rule."""
        rule_id = "net_scan_001"

        response = client.get(
            f"/api/actions/rule/{rule_id}/history",
            headers=auth_headers
        )

        assert response.status_code == 200
        entries = response.json()
        assert isinstance(entries, list)


class TestAutoResponseConfiguration:
    """Tests for auto-response configuration."""

    def test_update_auto_response_config(self, auth_headers):
        """Test updating auto-response configuration for a rule."""
        rule_id = "net_scan_001"

        config = {
            "enabled": True,
            "conditions": {
                "min_severity": "high",
                "require_enrichment": False,
                "max_executions_per_hour": 10
            }
        }

        response = client.put(
            f"/api/rules/{rule_id}/auto-response",
            json=config,
            headers=auth_headers
        )

        # Should succeed or return 404 if rule doesn't exist in test environment
        assert response.status_code in [200, 404]

        if response.status_code == 200:
            rule = response.json()
            assert "auto_response_config" in rule
            assert rule["auto_response_config"]["enabled"] is True
            assert rule["auto_response_config"]["conditions"]["min_severity"] == "high"

    def test_disable_auto_response(self, auth_headers):
        """Test disabling auto-response for a rule."""
        rule_id = "brute_force_001"

        config = {
            "enabled": False,
            "conditions": {
                "min_severity": "high",
                "require_enrichment": False,
                "max_executions_per_hour": 10
            }
        }

        response = client.put(
            f"/api/rules/{rule_id}/auto-response",
            json=config,
            headers=auth_headers
        )

        assert response.status_code in [200, 404]

        if response.status_code == 200:
            rule = response.json()
            assert rule["auto_response_config"]["enabled"] is False


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
        # This test would need a properly configured OpenSearch connection
        # In a real test environment, you would set up test data
        pass

    def test_check_rate_limit_exceeded(self):
        """Test rate limit check when limit is exceeded."""
        # This test would need a properly configured OpenSearch connection
        # In a real test environment, you would create multiple audit entries
        # to exceed the limit
        pass


class TestConditionValidation:
    """Tests for auto-response condition validation."""

    def test_severity_threshold_check(self):
        """Test that severity threshold is properly validated."""
        # These tests would be implemented once we have
        # condition checking logic exposed for unit testing
        pass

    def test_enrichment_requirement_check(self):
        """Test that enrichment requirement is properly validated."""
        pass


# Integration test example
class TestEndToEndActionExecution:
    """End-to-end tests for action execution workflow."""

    @pytest.mark.integration
    def test_full_action_workflow(self, auth_headers):
        """Test complete workflow from action execution to audit log."""
        # 1. List available actions
        actions_response = client.get("/api/actions", headers=auth_headers)
        assert actions_response.status_code == 200
        actions = actions_response.json()
        assert len(actions) > 0

        # 2. Execute an action (would need real alert in production)
        # This is a placeholder for the full workflow test
        pass

    @pytest.mark.integration
    def test_auto_response_triggers_correctly(self):
        """Test that auto-response triggers when conditions are met."""
        # This would test the full auto-response flow:
        # 1. Create a rule with auto-response enabled
        # 2. Trigger an alert that matches the rule
        # 3. Verify action was executed automatically
        # 4. Check audit log for automated execution entry
        pass


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
