#!/usr/bin/env python3
"""Create OpenSearch indices for CityShield."""
import os
import sys
from opensearchpy import OpenSearch, RequestsHttpConnection

# Configuration
OPENSEARCH_URL = os.getenv("OPENSEARCH_URL", "http://localhost:9200")
OPENSEARCH_USER = os.getenv("OPENSEARCH_USER", "admin")
OPENSEARCH_PASS = os.getenv("OPENSEARCH_PASS", "Admin@123!Change")

# Index definitions
INDICES = {
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
                "enabled": {"type": "boolean"},
                "severity": {"type": "keyword"},
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
                "components": {"type": "keyword"},
                "created_at": {"type": "date"}
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
                "completed_at": {"type": "date"}
            }
        }
    },
    "alerts": {
        "mappings": {
            "properties": {
                "alert_id": {"type": "keyword"},
                "triggered_at": {"type": "date"},
                "rule_id": {"type": "keyword"},
                "severity": {"type": "keyword"},
                "component": {"type": "keyword"},
                "status": {"type": "keyword"}
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
                "src_ip": {"type": "ip"},
                "dst_ip": {"type": "ip"}
            }
        }
    }
}


def main():
    """Create indices in OpenSearch."""
    print("CityShield - Create Indices")
    print("=" * 50)
    print(f"Connecting to OpenSearch at {OPENSEARCH_URL}")
    print()

    try:
        client = OpenSearch(
            hosts=[OPENSEARCH_URL],
            http_auth=(OPENSEARCH_USER, OPENSEARCH_PASS),
            use_ssl=False,
            verify_certs=False,
            connection_class=RequestsHttpConnection
        )

        # Test connection
        health = client.cluster.health()
        print(f"✓ Connected to OpenSearch (status: {health['status']})")
        print()

        # Create indices
        for index_name, index_body in INDICES.items():
            try:
                if client.indices.exists(index=index_name):
                    print(f"  {index_name}: already exists")
                else:
                    client.indices.create(index=index_name, body=index_body)
                    print(f"  {index_name}: created")
            except Exception as e:
                print(f"  {index_name}: error - {e}")

        print()
        print("✓ Index creation complete")

    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
