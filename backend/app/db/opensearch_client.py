"""OpenSearch client and index management."""
import logging
import os
import time
from typing import Optional, Dict, Any, List
from opensearchpy import OpenSearch, RequestsHttpConnection
from opensearchpy.exceptions import NotFoundError
from ..core.config import settings

logger = logging.getLogger(__name__)


class OpenSearchClient:
    """OpenSearch client wrapper."""

    def __init__(self):
        """Initialize OpenSearch client."""
        # Derive TLS settings from the URL scheme so the same code works against a
        # plain-HTTP local/Railway node and an https managed cluster (e.g. Bonsai).
        use_ssl = settings.opensearch_url.lower().startswith("https")
        self.client = OpenSearch(
            hosts=[settings.opensearch_url],
            http_auth=(settings.opensearch_user, settings.opensearch_pass),
            use_ssl=use_ssl,
            verify_certs=use_ssl,
            connection_class=RequestsHttpConnection,
            timeout=30
        )
        # On Railway (and any orchestrator that starts services in parallel) the
        # backend can boot before OpenSearch is reachable. Wait for it rather than
        # crash-looping. Locally OpenSearch is gated by a healthcheck, so this
        # succeeds on the first attempt and adds no delay.
        self._wait_for_connection()
        self._ensure_indices()

    def _wait_for_connection(self):
        """Block until OpenSearch answers a ping, up to a bounded number of tries."""
        retries = int(os.getenv("OPENSEARCH_STARTUP_RETRIES", "30"))
        delay = float(os.getenv("OPENSEARCH_STARTUP_DELAY_SECONDS", "2"))
        for attempt in range(1, retries + 1):
            try:
                if self.client.ping():
                    if attempt > 1:
                        logger.info(f"Connected to OpenSearch after {attempt} attempts")
                    return
            except Exception as e:
                logger.warning(
                    f"OpenSearch not ready (attempt {attempt}/{retries}): {e}"
                )
            time.sleep(delay)
        logger.error(
            "OpenSearch did not become reachable in time; continuing anyway. "
            "Index creation and seeding may fail until it is available."
        )

    def _ensure_indices(self):
        """Create required indices if they don't exist."""
        indices = {
            "users": {
                "mappings": {
                    "properties": {
                        "username": {"type": "keyword"},
                        "email": {"type": "keyword"},
                        "role": {"type": "keyword"},
                        "manager_username": {"type": "keyword"},
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
                        "created_by": {"type": "keyword"},
                        "category": {"type": "keyword"},
                        "mitre_technique_ids": {"type": "keyword"},
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
                        "target_device_id": {"type": "keyword"},
                        "target_component_id": {"type": "keyword"},
                        "stages": {"type": "object"},
                        "custom_parameters": {"type": "object"},
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
                        "response": {"type": "object"},
                        "asset_id": {"type": "keyword"},
                        "correlation_id": {"type": "keyword"},
                        "related_events_count": {"type": "integer"},
                        "resolution": {
                            "properties": {
                                "classification": {"type": "keyword"},
                                "resolution_notes": {"type": "text"},
                                "investigation_notes": {"type": "text"},
                                "remediation_notes": {"type": "text"},
                                "resolved_by": {"type": "keyword"},
                                "resolved_at": {"type": "date"},
                                "last_amended_by": {"type": "keyword"},
                                "last_amended_at": {"type": "date"}
                            }
                        }
                    }
                }
            },
            "alert-resolution-history": {
                "mappings": {
                    "properties": {
                        "history_id": {"type": "keyword"},
                        "alert_id": {"type": "keyword"},
                        "action": {"type": "keyword"},
                        "classification": {"type": "keyword"},
                        "previous_classification": {"type": "keyword"},
                        "resolution_notes": {"type": "text"},
                        "investigation_notes": {"type": "text"},
                        "remediation_notes": {"type": "text"},
                        "reason": {"type": "text"},
                        "performed_by": {"type": "keyword"},
                        "performed_at": {"type": "date"}
                    }
                }
            },
            "city-assets": {
                "mappings": {
                    "properties": {
                        "asset_id": {"type": "keyword"},
                        "name": {"type": "text"},
                        "asset_type": {"type": "keyword"},
                        "asset_class": {"type": "keyword"},
                        "criticality": {"type": "keyword"},
                        "status": {"type": "keyword"},
                        "device_type": {"type": "keyword"},
                        "lifecycle_state": {"type": "keyword"},
                        "last_seen": {"type": "date"},
                        "last_heartbeat": {"type": "date"},
                        "events_1h": {"type": "integer"},
                        "alerts_open": {"type": "integer"},
                        "risk_score": {"type": "integer"},
                        "tags": {"type": "keyword"},
                        "location": {
                            "properties": {
                                "zone": {"type": "keyword"},
                                "subnet": {"type": "keyword"},
                                "building": {"type": "keyword"},
                                "floor": {"type": "keyword"},
                                "coordinates": {"type": "object"}
                            }
                        },
                        "network": {
                            "properties": {
                                "ip_address": {"type": "ip"},
                                "mac_address": {"type": "keyword"},
                                "vlan": {"type": "keyword"},
                                "gateway": {"type": "ip"}
                            }
                        },
                        "metadata": {"type": "object"}
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
                        "asset_id": {"type": "keyword"},
                        "correlation_id": {"type": "keyword"},
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
            },
            "attack-proposals": {
                "mappings": {
                    "properties": {
                        "proposal_id": {"type": "keyword"},
                        "title": {"type": "text"},
                        "description": {"type": "text"},
                        "technique_ids": {"type": "keyword"},
                        "target_component": {"type": "keyword"},
                        "attack_pattern": {"type": "keyword"},
                        "duration_seconds": {"type": "integer"},
                        "parameters": {"type": "object"},
                        "submitted_by": {"type": "keyword"},
                        "submitted_at": {"type": "date"},
                        "status": {"type": "keyword"},
                        "reviewed_by": {"type": "keyword"},
                        "reviewed_at": {"type": "date"},
                        "review_comment": {"type": "text"},
                        "scenario_id": {"type": "keyword"},
                    }
                }
            },
            "action-audit-log": {
                "mappings": {
                    "properties": {
                        "audit_id": {"type": "keyword"},
                        "alert_id": {"type": "keyword"},
                        "rule_id": {"type": "keyword"},
                        "action_name": {"type": "keyword"},
                        "execution_type": {"type": "keyword"},
                        "triggered_by": {"type": "keyword"},
                        "status": {"type": "keyword"},
                        "parameters": {"type": "object"},
                        "playbook_path": {"type": "keyword"},
                        "stdout": {"type": "text"},
                        "stderr": {"type": "text"},
                        "started_at": {"type": "date"},
                        "completed_at": {"type": "date"},
                        "error": {"type": "text"}
                    }
                }
            },
            "awareness-progress": {
                "mappings": {
                    "properties": {
                        "event_id": {"type": "keyword"},
                        "username": {"type": "keyword"},
                        "category_id": {"type": "keyword"},
                        "event_type": {"type": "keyword"},
                        "module_id": {"type": "keyword"},
                        "concept_id": {"type": "keyword"},
                        "scenario_id": {"type": "keyword"},
                        "video_key": {"type": "keyword"},
                        "quiz_score": {"type": "integer"},
                        "quiz_total": {"type": "integer"},
                        "passed": {"type": "boolean"},
                        "pre_assessment_weak_categories": {"type": "keyword"},
                        "lang": {"type": "keyword"},
                        "metadata": {"type": "object"},
                        "created_at": {"type": "date"}
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

        # Migrate existing indices: add new fields via put_mapping (safe, additive only)
        self._migrate_mappings()

    def _migrate_mappings(self):
        """Add new fields to existing indices via put_mapping (safe, additive)."""
        migrations = {
            "scenarios": {
                "mitre_technique_ids": {"type": "keyword"},
            },
            "scenario_runs": {
                "target_device_id": {"type": "keyword"},
                "target_component_id": {"type": "keyword"},
                "stages": {"type": "object"},
                "custom_parameters": {"type": "object"},
            },
            "users": {
                "manager_username": {"type": "keyword"},
            },
            "alerts": {
                "resolution": {
                    "properties": {
                        "classification": {"type": "keyword"},
                        "resolution_notes": {"type": "text"},
                        "investigation_notes": {"type": "text"},
                        "remediation_notes": {"type": "text"},
                        "resolved_by": {"type": "keyword"},
                        "resolved_at": {"type": "date"},
                        "last_amended_by": {"type": "keyword"},
                        "last_amended_at": {"type": "date"},
                    }
                },
            },
        }
        for index_name, new_fields in migrations.items():
            try:
                if not self.client.indices.exists(index=index_name):
                    continue
                current = self.client.indices.get_mapping(index=index_name)
                props = current[index_name]["mappings"].get("properties", {})
                missing = {k: v for k, v in new_fields.items() if k not in props}
                if missing:
                    self.client.indices.put_mapping(
                        index=index_name,
                        body={"properties": missing},
                    )
                    logger.info(f"Migrated index {index_name}: added {list(missing.keys())}")
            except Exception as e:
                logger.warning(f"Mapping migration for {index_name} skipped: {e}")

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
