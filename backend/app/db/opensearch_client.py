"""OpenSearch client and index management."""
import logging
from typing import Optional, Dict, Any, List
from opensearchpy import OpenSearch, RequestsHttpConnection
from opensearchpy.exceptions import NotFoundError
from ..core.config import settings

logger = logging.getLogger(__name__)


class OpenSearchClient:
    """OpenSearch client wrapper."""

    def __init__(self):
        """Initialize OpenSearch client."""
        self.client = OpenSearch(
            hosts=[settings.opensearch_url],
            http_auth=(settings.opensearch_user, settings.opensearch_pass),
            use_ssl=False,
            verify_certs=False,
            connection_class=RequestsHttpConnection,
            timeout=30
        )
        self._ensure_indices()

    def _ensure_indices(self):
        """Create required indices if they don't exist."""
        indices = {
            "users": {
                "mappings": {
                    "properties": {
                        "username": {"type": "keyword"},
                        "email": {"type": "keyword"},
                        "role": {"type": "keyword"},
                        "hashed_password": {"type": "keyword"},
                        "created_at": {"type": "date"},
                        "is_active": {"type": "boolean"}
                    }
                }
            },
            "rules": {
                "mappings": {
                    "properties": {
                        "rule_id": {"type": "keyword"},
                        "name": {"type": "text"},
                        "description": {"type": "text"},
                        "enabled": {"type": "boolean"},
                        "severity": {"type": "keyword"},
                        "match_logic": {"type": "object"},
                        "technique_id": {"type": "keyword"},
                        "technique_name": {"type": "text"},
                        "response_actions": {"type": "keyword"},
                        "created_at": {"type": "date"},
                        "updated_at": {"type": "date"}
                    }
                }
            },
            "scenarios": {
                "mappings": {
                    "properties": {
                        "scenario_id": {"type": "keyword"},
                        "name": {"type": "text"},
                        "description": {"type": "text"},
                        "components": {"type": "keyword"},
                        "duration_seconds": {"type": "integer"},
                        "attack_pattern": {"type": "keyword"},
                        "parameters": {"type": "object"},
                        "created_at": {"type": "date"},
                        "created_by": {"type": "keyword"}
                    }
                }
            },
            "scenario_runs": {
                "mappings": {
                    "properties": {
                        "run_id": {"type": "keyword"},
                        "scenario_id": {"type": "keyword"},
                        "status": {"type": "keyword"},
                        "started_at": {"type": "date"},
                        "completed_at": {"type": "date"},
                        "started_by": {"type": "keyword"},
                        "results": {"type": "object"}
                    }
                }
            },
            "alerts": {
                "mappings": {
                    "properties": {
                        "alert_id": {"type": "keyword"},
                        "triggered_at": {"type": "date"},
                        "rule_id": {"type": "keyword"},
                        "rule_name": {"type": "text"},
                        "severity": {"type": "keyword"},
                        "component": {"type": "keyword"},
                        "city_zone": {"type": "keyword"},
                        "technique_id": {"type": "keyword"},
                        "technique_name": {"type": "text"},
                        "evidence": {"type": "object"},
                        "related_query": {"type": "text"},
                        "status": {"type": "keyword"},
                        "enrichment": {"type": "object"},
                        "response": {"type": "object"}
                    }
                }
            },
            "logs": {
                "mappings": {
                    "properties": {
                        "@timestamp": {"type": "date"},
                        "component": {"type": "keyword"},
                        "event_type": {"type": "keyword"},
                        "severity": {"type": "keyword"},
                        "city_zone": {"type": "keyword"},
                        "src_ip": {"type": "ip"},
                        "dst_ip": {"type": "ip"},
                        "src_port": {"type": "integer"},
                        "dst_port": {"type": "integer"},
                        "actor_id": {"type": "keyword"},
                        "message": {"type": "text"},
                        "metadata": {"type": "object"}
                    }
                }
            },
            "blocked_ips": {
                "mappings": {
                    "properties": {
                        "ip_address": {"type": "ip"},
                        "blocked_at": {"type": "date"},
                        "alert_id": {"type": "keyword"},
                        "reason": {"type": "text"}
                    }
                }
            }
        }

        for index_name, index_body in indices.items():
            try:
                if not self.client.indices.exists(index=index_name):
                    self.client.indices.create(index=index_name, body=index_body)
                    logger.info(f"Created index: {index_name}")
            except Exception as e:
                logger.error(f"Error creating index {index_name}: {e}")

    def index_document(self, index: str, document: Dict[str, Any], doc_id: Optional[str] = None) -> Dict:
        """Index a document."""
        try:
            if doc_id:
                response = self.client.index(index=index, body=document, id=doc_id, refresh=True)
            else:
                response = self.client.index(index=index, body=document, refresh=True)
            return response
        except Exception as e:
            logger.error(f"Error indexing document: {e}")
            raise

    def get_document(self, index: str, doc_id: str) -> Optional[Dict]:
        """Get a document by ID."""
        try:
            response = self.client.get(index=index, id=doc_id)
            return response["_source"]
        except NotFoundError:
            return None
        except Exception as e:
            logger.error(f"Error getting document: {e}")
            raise

    def search(self, index: str, query: Dict[str, Any]) -> List[Dict]:
        """Search documents."""
        try:
            response = self.client.search(index=index, body=query)
            return [hit["_source"] for hit in response["hits"]["hits"]]
        except Exception as e:
            logger.error(f"Error searching: {e}")
            raise

    def search_with_aggregations(self, index: str, query: Dict[str, Any]) -> Dict[str, Any]:
        """Search documents and return full response including aggregations."""
        try:
            response = self.client.search(index=index, body=query)
            return response
        except Exception as e:
            logger.error(f"Error searching with aggregations: {e}")
            raise

    def update_document(self, index: str, doc_id: str, updates: Dict[str, Any]) -> Dict:
        """Update a document."""
        try:
            response = self.client.update(
                index=index,
                id=doc_id,
                body={"doc": updates},
                refresh=True
            )
            return response
        except Exception as e:
            logger.error(f"Error updating document: {e}")
            raise

    def delete_document(self, index: str, doc_id: str) -> Dict:
        """Delete a document."""
        try:
            response = self.client.delete(index=index, id=doc_id, refresh=True)
            return response
        except Exception as e:
            logger.error(f"Error deleting document: {e}")
            raise

    def count(self, index: str, query: Optional[Dict[str, Any]] = None) -> int:
        """Count documents matching a query."""
        try:
            body = {"query": query} if query else {}
            response = self.client.count(index=index, body=body)
            return response["count"]
        except Exception as e:
            logger.error(f"Error counting documents: {e}")
            raise


# Global client instance
opensearch_client = OpenSearchClient()
