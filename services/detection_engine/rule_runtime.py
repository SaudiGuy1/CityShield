"""Rule runtime engine for evaluating detection rules."""
import logging
from typing import Dict, Any, List
from datetime import datetime, timedelta
from opensearchpy import OpenSearch

logger = logging.getLogger(__name__)


class RuleRuntime:
    """Runtime engine for evaluating detection rules."""

    def __init__(self, opensearch_client: OpenSearch):
        self.client = opensearch_client

    def evaluate_rule(self, rule: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Evaluate a detection rule and return alerts if matches are found.

        Args:
            rule: Rule definition dictionary

        Returns:
            List of alert dictionaries
        """
        match_logic = rule.get("match_logic", {})
        logic_type = match_logic.get("type")

        if logic_type == "net_scan":
            return self._evaluate_net_scan(rule)
        elif logic_type == "iot_anomaly":
            return self._evaluate_iot_anomaly(rule)
        else:
            logger.warning(f"Unknown rule type: {logic_type}")
            return []

    def _evaluate_net_scan(self, rule: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Evaluate network scan detection rule."""
        params = rule["match_logic"]["parameters"]
        threshold = params.get("threshold", 10)
        field = params.get("field", "dst_port")
        group_by = params.get("group_by", "src_ip")
        event_types = params.get("event_types", [])
        window_seconds = rule.get("query_window_seconds", 300)

        # Build query
        now = datetime.utcnow()
        past = now - timedelta(seconds=window_seconds)

        query = {
            "query": {
                "bool": {
                    "must": [
                        {
                            "range": {
                                "@timestamp": {
                                    "gte": past.isoformat() + "Z",
                                    "lte": now.isoformat() + "Z"
                                }
                            }
                        },
                        {
                            "terms": {"event_type": event_types}
                        }
                    ]
                }
            },
            "size": 0,
            "aggs": {
                "by_source": {
                    "terms": {
                        "field": group_by,
                        "size": 100
                    },
                    "aggs": {
                        "distinct_ports": {
                            "cardinality": {
                                "field": field
                            }
                        }
                    }
                }
            }
        }

        try:
            result = self.client.search(index="logs-*", body=query)
            alerts = []

            for bucket in result["aggregations"]["by_source"]["buckets"]:
                src_ip = bucket["key"]
                distinct_count = bucket["distinct_ports"]["value"]

                if distinct_count >= threshold:
                    alert = {
                        "rule_id": rule["rule_id"],
                        "rule_name": rule["name"],
                        "severity": rule["severity"],
                        "component": "network",
                        "city_zone": None,  # Will be populated from evidence
                        "technique_id": rule["technique_id"],
                        "technique_name": rule["technique_name"],
                        "evidence": {
                            "src_ip": src_ip,
                            "distinct_port_count": int(distinct_count),
                            "threshold": threshold,
                            "time_window_seconds": window_seconds,
                            "query": str(query)
                        },
                        "related_query": f"src_ip:{src_ip} AND event_type:({' OR '.join(event_types)})"
                    }
                    alerts.append(alert)
                    logger.info(f"Rule {rule['rule_id']} matched: {src_ip} scanned {distinct_count} ports")

            return alerts

        except Exception as e:
            logger.error(f"Error evaluating net_scan rule: {e}")
            return []

    def _evaluate_iot_anomaly(self, rule: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Evaluate IoT anomaly detection rule."""
        params = rule["match_logic"]["parameters"]
        threshold = params.get("threshold", 5)
        field = params.get("field", "actor_id")
        event_types = params.get("event_types", [])
        window_seconds = rule.get("query_window_seconds", 300)

        # Build query
        now = datetime.utcnow()
        past = now - timedelta(seconds=window_seconds)

        query = {
            "query": {
                "bool": {
                    "must": [
                        {
                            "range": {
                                "@timestamp": {
                                    "gte": past.isoformat() + "Z",
                                    "lte": now.isoformat() + "Z"
                                }
                            }
                        },
                        {
                            "terms": {"event_type": event_types}
                        },
                        {
                            "term": {"component": "iot_sensors"}
                        }
                    ]
                }
            },
            "size": 0,
            "aggs": {
                "by_sensor": {
                    "terms": {
                        "field": field,
                        "size": 100
                    }
                }
            }
        }

        try:
            result = self.client.search(index="logs-*", body=query)
            alerts = []

            for bucket in result["aggregations"]["by_sensor"]["buckets"]:
                sensor_id = bucket["key"]
                event_count = bucket["doc_count"]

                if event_count >= threshold:
                    alert = {
                        "rule_id": rule["rule_id"],
                        "rule_name": rule["name"],
                        "severity": rule["severity"],
                        "component": "iot_sensors",
                        "city_zone": None,
                        "technique_id": rule["technique_id"],
                        "technique_name": rule["technique_name"],
                        "evidence": {
                            "sensor_id": sensor_id,
                            "anomaly_event_count": event_count,
                            "threshold": threshold,
                            "time_window_seconds": window_seconds,
                            "query": str(query)
                        },
                        "related_query": f"actor_id:{sensor_id} AND event_type:({' OR '.join(event_types)})"
                    }
                    alerts.append(alert)
                    logger.info(f"Rule {rule['rule_id']} matched: {sensor_id} had {event_count} anomaly events")

            return alerts

        except Exception as e:
            logger.error(f"Error evaluating iot_anomaly rule: {e}")
            return []
