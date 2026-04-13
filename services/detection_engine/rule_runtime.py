"""Rule runtime engine for evaluating detection rules."""
import logging
from typing import Dict, Any, List
from datetime import datetime, timedelta
from opensearchpy import OpenSearch

logger = logging.getLogger(__name__)

# String fields used in aggregations need .keyword suffix because
# the logs-* indices are auto-mapped (text + keyword sub-field).
# Numeric fields (dst_port, src_port) are auto-mapped as long and work directly.
KEYWORD_FIELDS = {"src_ip", "dst_ip", "actor_id", "event_type", "component", "city_zone", "asset_id", "sensor_id"}


def _agg_field(field: str) -> str:
    """Return the correct aggregation field name, appending .keyword for text fields."""
    if field in KEYWORD_FIELDS:
        return f"{field}.keyword"
    return field


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
        elif logic_type == "brute_force":
            return self._evaluate_brute_force(rule)
        elif logic_type == "c2_beacon":
            return self._evaluate_c2_beacon(rule)
        elif logic_type == "data_exfiltration":
            return self._evaluate_data_exfiltration(rule)
        elif logic_type == "ddos_attack":
            return self._evaluate_ddos_attack(rule)
        elif logic_type == "dos_endpoint":
            return self._evaluate_dos_endpoint(rule)
        elif logic_type == "ransomware":
            return self._evaluate_ransomware(rule)
        elif logic_type == "web_exploit":
            return self._evaluate_web_exploit(rule)
        elif logic_type == "lateral_movement":
            return self._evaluate_lateral_movement(rule)
        elif logic_type == "credential_dump":
            return self._evaluate_credential_dump(rule)
        elif logic_type == "log_clearing":
            return self._evaluate_generic_event(rule)
        elif logic_type == "cmd_execution":
            return self._evaluate_generic_event(rule)
        elif logic_type == "account_creation":
            return self._evaluate_generic_event(rule)
        elif logic_type == "data_archiving":
            return self._evaluate_generic_event(rule)
        elif logic_type == "defense_evasion":
            return self._evaluate_generic_event(rule)
        elif logic_type == "obfuscation_detection":
            return self._evaluate_generic_event(rule)
        elif logic_type == "powershell_execution":
            return self._evaluate_generic_event(rule)
        elif logic_type == "process_injection":
            return self._evaluate_generic_event(rule)
        elif logic_type == "registry_persistence":
            return self._evaluate_generic_event(rule)
        elif logic_type == "scheduled_task_creation":
            return self._evaluate_generic_event(rule)
        elif logic_type == "screen_capture":
            return self._evaluate_generic_event(rule)
        elif logic_type == "service_execution":
            return self._evaluate_generic_event(rule)
        elif logic_type == "service_persistence":
            return self._evaluate_generic_event(rule)
        elif logic_type == "token_manipulation":
            return self._evaluate_generic_event(rule)
        elif logic_type == "event_threshold":
            return self._evaluate_generic_event(rule)
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
                            "terms": {"event_type.keyword": event_types}
                        }
                    ]
                }
            },
            "size": 0,
            "aggs": {
                "by_source": {
                    "terms": {
                        "field": _agg_field(group_by),
                        "size": 100
                    },
                    "aggs": {
                        "distinct_ports": {
                            "cardinality": {
                                "field": _agg_field(field)
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
                        "city_zone": None,
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
                            "terms": {"event_type.keyword": event_types}
                        },
                        {
                            "term": {"component.keyword": "iot_sensors"}
                        }
                    ]
                }
            },
            "size": 0,
            "aggs": {
                "by_sensor": {
                    "terms": {
                        "field": _agg_field(field),
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

    def _evaluate_brute_force(self, rule: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Evaluate brute force detection rule."""
        params = rule["match_logic"]["parameters"]
        threshold = params.get("threshold", 5)
        group_by = params.get("group_by", "src_ip")
        event_types = params.get("event_types", [])
        window_seconds = rule.get("query_window_seconds", 300)

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
                            "terms": {"event_type.keyword": event_types}
                        }
                    ]
                }
            },
            "size": 0,
            "aggs": {
                "by_source": {
                    "terms": {
                        "field": _agg_field(group_by),
                        "size": 100
                    }
                }
            }
        }

        try:
            result = self.client.search(index="logs-*", body=query)
            alerts = []

            for bucket in result["aggregations"]["by_source"]["buckets"]:
                src_ip = bucket["key"]
                event_count = bucket["doc_count"]

                if event_count >= threshold:
                    alert = {
                        "rule_id": rule["rule_id"],
                        "rule_name": rule["name"],
                        "severity": rule["severity"],
                        "component": "network",
                        "city_zone": None,
                        "technique_id": rule["technique_id"],
                        "technique_name": rule["technique_name"],
                        "evidence": {
                            "src_ip": src_ip,
                            "failed_attempts": event_count,
                            "threshold": threshold,
                            "time_window_seconds": window_seconds,
                            "query": str(query)
                        },
                        "related_query": f"src_ip:{src_ip} AND event_type:({' OR '.join(event_types)})"
                    }
                    alerts.append(alert)
                    logger.info(f"Rule {rule['rule_id']} matched: {src_ip} had {event_count} failed auth attempts")

            return alerts

        except Exception as e:
            logger.error(f"Error evaluating brute_force rule: {e}")
            return []

    def _evaluate_c2_beacon(self, rule: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Evaluate C2 beaconing detection rule."""
        params = rule["match_logic"]["parameters"]
        threshold = params.get("threshold", 3)
        group_by = params.get("group_by", "src_ip")
        event_types = params.get("event_types", [])
        window_seconds = rule.get("query_window_seconds", 300)

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
                            "terms": {"event_type.keyword": event_types}
                        }
                    ]
                }
            },
            "size": 0,
            "aggs": {
                "by_source": {
                    "terms": {
                        "field": _agg_field(group_by),
                        "size": 100
                    },
                    "aggs": {
                        "destinations": {
                            "terms": {
                                "field": _agg_field("dst_ip"),
                                "size": 10
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
                beacon_count = bucket["doc_count"]
                dst_ips = [d["key"] for d in bucket["destinations"]["buckets"]]

                if beacon_count >= threshold:
                    alert = {
                        "rule_id": rule["rule_id"],
                        "rule_name": rule["name"],
                        "severity": rule["severity"],
                        "component": "network",
                        "city_zone": None,
                        "technique_id": rule["technique_id"],
                        "technique_name": rule["technique_name"],
                        "evidence": {
                            "src_ip": src_ip,
                            "beacon_count": beacon_count,
                            "c2_destinations": dst_ips,
                            "threshold": threshold,
                            "time_window_seconds": window_seconds,
                            "query": str(query)
                        },
                        "related_query": f"src_ip:{src_ip} AND event_type:({' OR '.join(event_types)})"
                    }
                    alerts.append(alert)
                    logger.info(f"Rule {rule['rule_id']} matched: {src_ip} sent {beacon_count} beacons to {dst_ips}")

            return alerts

        except Exception as e:
            logger.error(f"Error evaluating c2_beacon rule: {e}")
            return []

    def _evaluate_data_exfiltration(self, rule: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Evaluate data exfiltration detection rule."""
        params = rule["match_logic"]["parameters"]
        threshold = params.get("threshold", 3)
        group_by = params.get("group_by", "src_ip")
        event_types = params.get("event_types", [])
        window_seconds = rule.get("query_window_seconds", 300)

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
                            "terms": {"event_type.keyword": event_types}
                        }
                    ]
                }
            },
            "size": 0,
            "aggs": {
                "by_source": {
                    "terms": {
                        "field": _agg_field(group_by),
                        "size": 100
                    },
                    "aggs": {
                        "destinations": {
                            "terms": {
                                "field": _agg_field("dst_ip"),
                                "size": 10
                            }
                        },
                        "total_bytes": {
                            "sum": {
                                "field": "metadata.bytes_transferred"
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
                event_count = bucket["doc_count"]
                dst_ips = [d["key"] for d in bucket["destinations"]["buckets"]]
                total_bytes = bucket["total_bytes"]["value"]

                if event_count >= threshold:
                    alert = {
                        "rule_id": rule["rule_id"],
                        "rule_name": rule["name"],
                        "severity": rule["severity"],
                        "component": "network",
                        "city_zone": None,
                        "technique_id": rule["technique_id"],
                        "technique_name": rule["technique_name"],
                        "evidence": {
                            "src_ip": src_ip,
                            "exfil_event_count": event_count,
                            "exfil_destinations": dst_ips,
                            "total_bytes_transferred": total_bytes,
                            "threshold": threshold,
                            "time_window_seconds": window_seconds,
                            "query": str(query)
                        },
                        "related_query": f"src_ip:{src_ip} AND event_type:({' OR '.join(event_types)})"
                    }
                    alerts.append(alert)
                    logger.info(f"Rule {rule['rule_id']} matched: {src_ip} exfiltrated {event_count} events ({total_bytes} bytes) to {dst_ips}")

            return alerts

        except Exception as e:
            logger.error(f"Error evaluating data_exfiltration rule: {e}")
            return []

    def _evaluate_ddos_attack(self, rule: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Evaluate DDoS attack detection rule."""
        params = rule["match_logic"]["parameters"]
        threshold = params.get("threshold", 100)
        min_sources = params.get("min_sources", 5)
        group_by = params.get("group_by", "dst_ip")
        event_types = params.get("event_types", [])
        window_seconds = rule.get("query_window_seconds", 300)

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
                            "terms": {"event_type.keyword": event_types}
                        }
                    ]
                }
            },
            "size": 0,
            "aggs": {
                "by_target": {
                    "terms": {
                        "field": _agg_field(group_by),
                        "size": 100
                    },
                    "aggs": {
                        "distinct_sources": {
                            "cardinality": {
                                "field": _agg_field("src_ip")
                            }
                        }
                    }
                }
            }
        }

        try:
            result = self.client.search(index="logs-*", body=query)
            alerts = []

            for bucket in result["aggregations"]["by_target"]["buckets"]:
                dst_ip = bucket["key"]
                event_count = bucket["doc_count"]
                source_count = int(bucket["distinct_sources"]["value"])

                if event_count >= threshold and source_count >= min_sources:
                    alert = {
                        "rule_id": rule["rule_id"],
                        "rule_name": rule["name"],
                        "severity": rule["severity"],
                        "component": "network",
                        "city_zone": None,
                        "technique_id": rule["technique_id"],
                        "technique_name": rule["technique_name"],
                        "evidence": {
                            "dst_ip": dst_ip,
                            "event_count": event_count,
                            "distinct_source_count": source_count,
                            "threshold": threshold,
                            "min_sources": min_sources,
                            "time_window_seconds": window_seconds,
                            "query": str(query)
                        },
                        "related_query": f"dst_ip:{dst_ip} AND event_type:({' OR '.join(event_types)})"
                    }
                    alerts.append(alert)
                    logger.info(f"Rule {rule['rule_id']} matched: {dst_ip} received {event_count} events from {source_count} sources")

            return alerts

        except Exception as e:
            logger.error(f"Error evaluating ddos_attack rule: {e}")
            return []

    def _evaluate_dos_endpoint(self, rule: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Evaluate endpoint DoS detection rule."""
        params = rule["match_logic"]["parameters"]
        threshold = params.get("threshold", 50)
        group_by = params.get("group_by", "asset_id")
        event_types = params.get("event_types", [])
        window_seconds = rule.get("query_window_seconds", 300)

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
                            "terms": {"event_type.keyword": event_types}
                        }
                    ]
                }
            },
            "size": 0,
            "aggs": {
                "by_asset": {
                    "terms": {
                        "field": _agg_field(group_by),
                        "size": 100
                    }
                }
            }
        }

        try:
            result = self.client.search(index="logs-*", body=query)
            alerts = []

            for bucket in result["aggregations"]["by_asset"]["buckets"]:
                asset_id = bucket["key"]
                event_count = bucket["doc_count"]

                if event_count >= threshold:
                    alert = {
                        "rule_id": rule["rule_id"],
                        "rule_name": rule["name"],
                        "severity": rule["severity"],
                        "component": "network",
                        "city_zone": None,
                        "technique_id": rule["technique_id"],
                        "technique_name": rule["technique_name"],
                        "evidence": {
                            "asset_id": asset_id,
                            "dos_event_count": event_count,
                            "threshold": threshold,
                            "time_window_seconds": window_seconds,
                            "query": str(query)
                        },
                        "related_query": f"asset_id:{asset_id} AND event_type:({' OR '.join(event_types)})",
                        "asset_id": asset_id
                    }
                    alerts.append(alert)
                    logger.info(f"Rule {rule['rule_id']} matched: {asset_id} had {event_count} DoS events")

            return alerts

        except Exception as e:
            logger.error(f"Error evaluating dos_endpoint rule: {e}")
            return []

    def _evaluate_ransomware(self, rule: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Evaluate ransomware detection rule."""
        params = rule["match_logic"]["parameters"]
        threshold = params.get("threshold", 1)
        event_types = params.get("event_types", [])
        window_seconds = rule.get("query_window_seconds", 300)

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
                            "terms": {"event_type.keyword": event_types}
                        }
                    ]
                }
            },
            "size": 10
        }

        try:
            result = self.client.search(index="logs-*", body=query)
            alerts = []

            hits = result.get("hits", {}).get("hits", [])
            if len(hits) >= threshold:
                # Group by asset_id or src_ip
                for hit in hits[:threshold]:  # Create one alert per distinct incident
                    source = hit["_source"]
                    asset_id = source.get("asset_id") or source.get("actor_id")
                    src_ip = source.get("src_ip", "unknown")

                    alert = {
                        "rule_id": rule["rule_id"],
                        "rule_name": rule["name"],
                        "severity": rule["severity"],
                        "component": source.get("component", "network"),
                        "city_zone": source.get("city_zone"),
                        "technique_id": rule["technique_id"],
                        "technique_name": rule["technique_name"],
                        "evidence": {
                            "src_ip": src_ip,
                            "asset_id": asset_id,
                            "event_type": source.get("event_type"),
                            "ransomware_indicators": len(hits),
                            "threshold": threshold,
                            "time_window_seconds": window_seconds,
                            "query": str(query)
                        },
                        "related_query": f"event_type:({' OR '.join(event_types)})",
                        "asset_id": asset_id
                    }
                    alerts.append(alert)
                    logger.warning(f"Rule {rule['rule_id']} matched: Ransomware indicators detected on {asset_id or src_ip}")
                    break  # Only create one alert for ransomware detection

            return alerts

        except Exception as e:
            logger.error(f"Error evaluating ransomware rule: {e}")
            return []

    def _evaluate_web_exploit(self, rule: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Evaluate web exploitation detection rule."""
        params = rule["match_logic"]["parameters"]
        threshold = params.get("threshold", 3)
        group_by = params.get("group_by", "src_ip")
        event_types = params.get("event_types", [])
        window_seconds = rule.get("query_window_seconds", 300)

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
                            "terms": {"event_type.keyword": event_types}
                        }
                    ]
                }
            },
            "size": 0,
            "aggs": {
                "by_source": {
                    "terms": {
                        "field": _agg_field(group_by),
                        "size": 100
                    },
                    "aggs": {
                        "attack_types": {
                            "terms": {
                                "field": "event_type.keyword",
                                "size": 10
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
                exploit_count = bucket["doc_count"]
                attack_types = [t["key"] for t in bucket["attack_types"]["buckets"]]

                if exploit_count >= threshold:
                    alert = {
                        "rule_id": rule["rule_id"],
                        "rule_name": rule["name"],
                        "severity": rule["severity"],
                        "component": "network",
                        "city_zone": None,
                        "technique_id": rule["technique_id"],
                        "technique_name": rule["technique_name"],
                        "evidence": {
                            "src_ip": src_ip,
                            "exploit_attempt_count": exploit_count,
                            "attack_types": attack_types,
                            "threshold": threshold,
                            "time_window_seconds": window_seconds,
                            "query": str(query)
                        },
                        "related_query": f"src_ip:{src_ip} AND event_type:({' OR '.join(event_types)})"
                    }
                    alerts.append(alert)
                    logger.info(f"Rule {rule['rule_id']} matched: {src_ip} attempted {exploit_count} web exploits")

            return alerts

        except Exception as e:
            logger.error(f"Error evaluating web_exploit rule: {e}")
            return []

    def _evaluate_lateral_movement(self, rule: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Evaluate lateral movement detection rule."""
        params = rule["match_logic"]["parameters"]
        threshold = params.get("threshold", 3)
        group_by = params.get("group_by", "src_ip")
        event_types = params.get("event_types", [])
        window_seconds = rule.get("query_window_seconds", 300)

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
                            "terms": {"event_type.keyword": event_types}
                        }
                    ]
                }
            },
            "size": 0,
            "aggs": {
                "by_source": {
                    "terms": {
                        "field": _agg_field(group_by),
                        "size": 100
                    },
                    "aggs": {
                        "targets": {
                            "cardinality": {
                                "field": _agg_field("dst_ip")
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
                movement_count = bucket["doc_count"]
                target_count = int(bucket["targets"]["value"])

                if movement_count >= threshold:
                    alert = {
                        "rule_id": rule["rule_id"],
                        "rule_name": rule["name"],
                        "severity": rule["severity"],
                        "component": "network",
                        "city_zone": None,
                        "technique_id": rule["technique_id"],
                        "technique_name": rule["technique_name"],
                        "evidence": {
                            "src_ip": src_ip,
                            "lateral_movement_count": movement_count,
                            "distinct_targets": target_count,
                            "threshold": threshold,
                            "time_window_seconds": window_seconds,
                            "query": str(query)
                        },
                        "related_query": f"src_ip:{src_ip} AND event_type:({' OR '.join(event_types)})"
                    }
                    alerts.append(alert)
                    logger.info(f"Rule {rule['rule_id']} matched: {src_ip} performed {movement_count} lateral movements to {target_count} targets")

            return alerts

        except Exception as e:
            logger.error(f"Error evaluating lateral_movement rule: {e}")
            return []

    def _evaluate_credential_dump(self, rule: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Evaluate credential dumping detection rule."""
        params = rule["match_logic"]["parameters"]
        threshold = params.get("threshold", 2)
        group_by = params.get("group_by", "src_ip")
        event_types = params.get("event_types", [])
        window_seconds = rule.get("query_window_seconds", 300)

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
                            "terms": {"event_type.keyword": event_types}
                        }
                    ]
                }
            },
            "size": 0,
            "aggs": {
                "by_source": {
                    "terms": {
                        "field": _agg_field(group_by),
                        "size": 100
                    }
                }
            }
        }

        try:
            result = self.client.search(index="logs-*", body=query)
            alerts = []

            for bucket in result["aggregations"]["by_source"]["buckets"]:
                src_ip = bucket["key"]
                dump_count = bucket["doc_count"]

                if dump_count >= threshold:
                    alert = {
                        "rule_id": rule["rule_id"],
                        "rule_name": rule["name"],
                        "severity": rule["severity"],
                        "component": "network",
                        "city_zone": None,
                        "technique_id": rule["technique_id"],
                        "technique_name": rule["technique_name"],
                        "evidence": {
                            "src_ip": src_ip,
                            "credential_access_count": dump_count,
                            "threshold": threshold,
                            "time_window_seconds": window_seconds,
                            "query": str(query)
                        },
                        "related_query": f"src_ip:{src_ip} AND event_type:({' OR '.join(event_types)})"
                    }
                    alerts.append(alert)
                    logger.warning(f"Rule {rule['rule_id']} matched: {src_ip} attempted {dump_count} credential dumps")

            return alerts

        except Exception as e:
            logger.error(f"Error evaluating credential_dump rule: {e}")
            return []

    def _evaluate_generic_event(self, rule: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generic event-based evaluator for rules that match events by type and count threshold."""
        params = rule["match_logic"]["parameters"]
        threshold = params.get("threshold", 1)
        group_by = params.get("group_by", "src_ip")
        event_types = params.get("event_types", [])
        window_seconds = rule.get("query_window_seconds", 300)
        logic_type = rule["match_logic"]["type"]

        now = datetime.utcnow()
        past = now - timedelta(seconds=window_seconds)

        must_clauses = [
            {
                "range": {
                    "@timestamp": {
                        "gte": past.isoformat() + "Z",
                        "lte": now.isoformat() + "Z"
                    }
                }
            }
        ]

        if event_types:
            must_clauses.append({
                "terms": {"event_type.keyword": event_types}
            })

        query = {
            "query": {
                "bool": {
                    "must": must_clauses
                }
            },
            "size": 0,
            "aggs": {
                "by_group": {
                    "terms": {
                        "field": _agg_field(group_by),
                        "size": 100
                    }
                }
            }
        }

        try:
            result = self.client.search(index="logs-*", body=query)
            alerts = []

            for bucket in result["aggregations"]["by_group"]["buckets"]:
                key = bucket["key"]
                event_count = bucket["doc_count"]

                if event_count >= threshold:
                    alert = {
                        "rule_id": rule["rule_id"],
                        "rule_name": rule["name"],
                        "severity": rule["severity"],
                        "component": rule.get("component", "network"),
                        "city_zone": None,
                        "technique_id": rule["technique_id"],
                        "technique_name": rule["technique_name"],
                        "evidence": {
                            "src_ip": key if group_by in ("src_ip", "actor_id") else "unknown",
                            "group_key": key,
                            "group_field": group_by,
                            "event_count": event_count,
                            "event_types": event_types,
                            "threshold": threshold,
                            "time_window_seconds": window_seconds,
                            "logic_type": logic_type,
                            "query": str(query)
                        },
                        "related_query": f"{group_by}:{key} AND event_type:({' OR '.join(event_types)})"
                    }
                    alerts.append(alert)
                    logger.info(f"Rule {rule['rule_id']} ({logic_type}) matched: {group_by}={key} had {event_count} events (threshold={threshold})")

            return alerts

        except Exception as e:
            logger.error(f"Error evaluating {logic_type} rule {rule.get('rule_id', 'unknown')}: {e}")
            return []
