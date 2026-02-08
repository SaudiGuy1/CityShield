"""Rule management service."""
from typing import List, Optional
from datetime import datetime
from ..db.opensearch_client import opensearch_client
from ..models.rule import Rule, RuleCreate, RuleUpdate


class RuleService:
    """Service for managing detection rules."""

    INDEX = "rules"

    @staticmethod
    def create_rule(rule: RuleCreate) -> Rule:
        """Create a new rule."""
        now = datetime.utcnow()
        rule_doc = {
            **rule.dict(),
            "created_at": now.isoformat(),
            "updated_at": now.isoformat()
        }
        opensearch_client.index_document(RuleService.INDEX, rule_doc, doc_id=rule.rule_id)
        return Rule(**rule_doc)

    @staticmethod
    def get_rule(rule_id: str) -> Optional[Rule]:
        """Get a rule by ID."""
        doc = opensearch_client.get_document(RuleService.INDEX, rule_id)
        if doc:
            return Rule(**doc)
        return None

    @staticmethod
    def list_rules(enabled_only: bool = False) -> List[Rule]:
        """List all rules."""
        query = {
            "query": {
                "match_all": {}
            },
            "size": 1000
        }
        if enabled_only:
            query["query"] = {
                "term": {"enabled": True}
            }
        docs = opensearch_client.search(RuleService.INDEX, query)
        return [Rule(**doc) for doc in docs]

    @staticmethod
    def update_rule(rule_id: str, updates: RuleUpdate) -> Optional[Rule]:
        """Update a rule."""
        update_data = {k: v for k, v in updates.dict().items() if v is not None}
        if update_data:
            update_data["updated_at"] = datetime.utcnow().isoformat()
            opensearch_client.update_document(RuleService.INDEX, rule_id, update_data)
        return RuleService.get_rule(rule_id)

    @staticmethod
    def delete_rule(rule_id: str) -> bool:
        """Delete a rule."""
        try:
            opensearch_client.delete_document(RuleService.INDEX, rule_id)
            return True
        except Exception:
            return False
