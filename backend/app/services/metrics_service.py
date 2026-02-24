"""Metrics computation service."""
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from ..db.opensearch_client import opensearch_client


class MetricsService:
    """Service for computing evaluation metrics."""

    @staticmethod
    def compute_mttd(start_time: Optional[datetime] = None, end_time: Optional[datetime] = None) -> float:
        """
        Compute Mean Time To Detect (MTTD).
        Requires labeled dataset with attack_start_time in metadata.
        """
        query = {
            "query": {
                "bool": {
                    "must": [
                        {"exists": {"field": "triggered_at"}},
                        {"exists": {"field": "evidence.attack_start_time"}}
                    ]
                }
            },
            "size": 1000,
            "_source": ["triggered_at", "evidence.attack_start_time"]
        }

        if start_time and end_time:
            query["query"]["bool"]["filter"] = [{
                "range": {
                    "triggered_at": {
                        "gte": start_time.isoformat(),
                        "lte": end_time.isoformat()
                    }
                }
            }]

        alerts = opensearch_client.search("alerts", query)

        if not alerts:
            return 0.0

        detection_times = []
        for alert in alerts:
            triggered = datetime.fromisoformat(alert["triggered_at"].replace('Z', '+00:00'))
            attack_start_str = alert.get("evidence", {}).get("attack_start_time")
            if attack_start_str:
                attack_start = datetime.fromisoformat(attack_start_str.replace('Z', '+00:00'))
                detection_time = (triggered - attack_start).total_seconds()
                if detection_time >= 0:
                    detection_times.append(detection_time)

        if detection_times:
            return sum(detection_times) / len(detection_times)
        return 0.0

    @staticmethod
    def compute_mttr(start_time: Optional[datetime] = None, end_time: Optional[datetime] = None) -> float:
        """
        Compute Mean Time To Respond (MTTR).
        Based on alerts with response actions completed.
        """
        query = {
            "query": {
                "bool": {
                    "must": [
                        {"exists": {"field": "triggered_at"}},
                        {"exists": {"field": "response.completed_at"}}
                    ]
                }
            },
            "size": 1000,
            "_source": ["triggered_at", "response.completed_at"]
        }

        if start_time and end_time:
            query["query"]["bool"]["filter"] = [{
                "range": {
                    "triggered_at": {
                        "gte": start_time.isoformat(),
                        "lte": end_time.isoformat()
                    }
                }
            }]

        alerts = opensearch_client.search("alerts", query)

        if not alerts:
            return 0.0

        response_times = []
        for alert in alerts:
            triggered = datetime.fromisoformat(alert["triggered_at"].replace('Z', '+00:00'))
            completed_str = alert.get("response", {}).get("completed_at")
            if completed_str:
                completed = datetime.fromisoformat(completed_str.replace('Z', '+00:00'))
                response_time = (completed - triggered).total_seconds()
                if response_time >= 0:
                    response_times.append(response_time)

        if response_times:
            return sum(response_times) / len(response_times)
        return 0.0

    @staticmethod
    def compute_detection_accuracy() -> Dict[str, float]:
        """
        Compute detection accuracy and false positive rate.
        Requires labeled dataset with is_attack field in logs.
        """
        # Count total attack events in logs
        attack_query = {
            "query": {"term": {"metadata.is_attack": True}},
            "size": 0
        }
        total_attacks = opensearch_client.count("logs-*", attack_query.get("query"))

        # Count total normal events
        normal_query = {
            "query": {"term": {"metadata.is_attack": False}},
            "size": 0
        }
        total_normal = opensearch_client.count("logs-*", normal_query.get("query"))

        # Count alerts triggered (true positives + false positives)
        total_alerts = opensearch_client.count("alerts", None)

        # Simplified metrics (requires proper correlation in production)
        # Assuming alerts are mostly correlated with attacks
        true_positives = min(total_alerts, total_attacks)
        false_positives = max(0, total_alerts - total_attacks)
        false_negatives = max(0, total_attacks - true_positives)

        detection_rate = true_positives / total_attacks if total_attacks > 0 else 0.0
        false_positive_rate = false_positives / total_normal if total_normal > 0 else 0.0
        accuracy = true_positives / (true_positives + false_positives + false_negatives) if (true_positives + false_positives + false_negatives) > 0 else 0.0

        return {
            "detection_rate": round(detection_rate, 4),
            "false_positive_rate": round(false_positive_rate, 4),
            "accuracy": round(accuracy, 4),
            "total_attacks": total_attacks,
            "total_normal": total_normal,
            "total_alerts": total_alerts,
            "true_positives": true_positives,
            "false_positives": false_positives,
            "false_negatives": false_negatives
        }

    @staticmethod
    def get_resource_utilization() -> Dict[str, Any]:
        """
        Get resource utilization metrics.
        Returns OpenSearch cluster stats as a proxy.
        """
        try:
            cluster_stats = opensearch_client.client.cluster.stats()

            return {
                "cluster_name": cluster_stats.get("cluster_name"),
                "status": cluster_stats.get("status"),
                "nodes_count": cluster_stats.get("nodes", {}).get("count", {}).get("total", 0),
                "indices_count": cluster_stats.get("indices", {}).get("count", 0),
                "docs_count": cluster_stats.get("indices", {}).get("docs", {}).get("count", 0),
                "store_size_bytes": cluster_stats.get("indices", {}).get("store", {}).get("size_in_bytes", 0),
                "memory_used_bytes": cluster_stats.get("nodes", {}).get("jvm", {}).get("mem", {}).get("heap_used_in_bytes", 0),
                "timestamp": datetime.utcnow().isoformat()
            }
        except Exception as e:
            return {
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }

    @staticmethod
    def get_ingestion_rate(minutes: int = 5) -> Dict[str, Any]:
        """Get log ingestion rate for the last N minutes."""
        now = datetime.utcnow()
        past = now - timedelta(minutes=minutes)

        query = {
            "query": {
                "range": {
                    "@timestamp": {
                        "gte": past.isoformat(),
                        "lte": now.isoformat()
                    }
                }
            },
            "size": 0,
            "aggs": {
                "by_component": {
                    "terms": {"field": "component", "size": 20}
                }
            }
        }

        try:
            result = opensearch_client.client.search(index="logs-*", body=query)
            total_events = result["hits"]["total"]["value"]
            by_component = {
                bucket["key"]: bucket["doc_count"]
                for bucket in result["aggregations"]["by_component"]["buckets"]
            }

            events_per_minute = total_events / minutes if minutes > 0 else 0

            return {
                "time_window_minutes": minutes,
                "total_events": total_events,
                "events_per_minute": round(events_per_minute, 2),
                "by_component": by_component,
                "timestamp": now.isoformat()
            }
        except Exception as e:
            return {
                "error": str(e),
                "timestamp": now.isoformat()
            }

    @staticmethod
    def get_all_metrics() -> Dict[str, Any]:
        """Get all metrics in one call."""
        return {
            "mttd_seconds": MetricsService.compute_mttd(),
            "mttr_seconds": MetricsService.compute_mttr(),
            "detection_accuracy": MetricsService.compute_detection_accuracy(),
            "resource_utilization": MetricsService.get_resource_utilization(),
            "ingestion_rate": MetricsService.get_ingestion_rate(5),
            "computed_at": datetime.utcnow().isoformat()
        }
