"""WebSocket routes for real-time telemetry streaming."""
import logging
import asyncio
import json
from typing import Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from ..db.opensearch_client import opensearch_client

logger = logging.getLogger(__name__)
router = APIRouter()


class ConnectionManager:
    """Manages WebSocket connections for real-time telemetry."""

    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        """Accept and register a new WebSocket connection."""
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection."""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        """Broadcast message to all connected clients."""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting to client: {e}")
                disconnected.append(connection)

        # Clean up disconnected clients
        for conn in disconnected:
            if conn in self.active_connections:
                self.active_connections.remove(conn)


manager = ConnectionManager()


# Map asset types to categories for frontend
ASSET_TYPE_CATEGORY_MAP = {
    "traffic_controller": "traffic",
    "traffic_camera": "traffic",
    "traffic_signal": "traffic",
    "parking_sensor": "traffic",
    "iot_gateway": "iot",
    "environmental_sensor": "iot",
    "water_sensor": "iot",
    "air_quality_sensor": "iot",
    "energy_monitor": "iot",
    "firewall": "network",
    "network_switch": "network",
    "ids_ips": "security",
    "vpn_gateway": "network",
    "dns_server": "network",
    "siem": "security",
    "edr": "security",
    "vulnerability_scanner": "security",
    "authentication_server": "security",
    "scada_master": "industrial",
    "scada_hmi": "industrial",
    "plc": "industrial",
    "turbine_controller": "industrial",
    "grid_controller": "industrial",
    "rail_controller": "industrial",
}

# Map criticality to status
CRITICALITY_STATUS_MAP = {
    "low": "ok",
    "medium": "ok",
    "high": "warning",
    "critical": "warning",
}


async def fetch_asset_telemetry():
    """
    Fetch current asset telemetry from city-assets index.
    Returns assets formatted for frontend consumption.
    """
    try:
        client = opensearch_client.client
        now = datetime.utcnow()
        one_hour_ago = (now - timedelta(hours=1)).isoformat() + "Z"

        # Step 1: Get all assets from city-assets index
        assets_query = {
            "query": {"match_all": {}},
            "size": 1000,
            "sort": [{"asset_id": "asc"}]
        }

        assets_result = client.search(index="city-assets", body=assets_query)

        if not assets_result.get("hits", {}).get("hits"):
            logger.warning("No assets found in city-assets index")
            return []

        # Step 2: Get event counts per asset in last hour
        try:
            events_agg_query = {
                "query": {
                    "bool": {
                        "must": [
                            {"range": {"@timestamp": {"gte": one_hour_ago}}},
                            {"exists": {"field": "asset_id"}}
                        ]
                    }
                },
                "size": 0,
                "aggs": {
                    "assets": {
                        "terms": {"field": "asset_id.keyword", "size": 1000}
                    }
                }
            }
            events_result = client.search(index="logs-*", body=events_agg_query)
            event_counts = {}
            for bucket in events_result.get("aggregations", {}).get("assets", {}).get("buckets", []):
                event_counts[bucket["key"]] = bucket["doc_count"]
        except Exception as e:
            logger.warning(f"Could not fetch event counts: {e}")
            event_counts = {}

        # Step 3: Get alert counts per asset
        try:
            alerts_agg_query = {
                "query": {
                    "bool": {
                        "must": [
                            {"term": {"status": "open"}},
                            {"exists": {"field": "asset_id"}}
                        ]
                    }
                },
                "size": 0,
                "aggs": {
                    "assets": {
                        "terms": {"field": "asset_id.keyword", "size": 1000}
                    }
                }
            }
            alerts_result = client.search(index="alerts", body=alerts_agg_query)
            alert_counts = {}
            for bucket in alerts_result.get("aggregations", {}).get("assets", {}).get("buckets", []):
                alert_counts[bucket["key"]] = bucket["doc_count"]
        except Exception as e:
            logger.warning(f"Could not fetch alert counts: {e}")
            alert_counts = {}

        # Step 4: Build enriched asset list
        assets = []
        for hit in assets_result["hits"]["hits"]:
            asset = hit["_source"]
            asset_id = asset.get("asset_id")

            # Determine status based on alert count and criticality
            alerts_count = alert_counts.get(asset_id, 0)
            if alerts_count > 5:
                status = "critical"
            elif alerts_count > 0:
                status = "warning"
            else:
                status = CRITICALITY_STATUS_MAP.get(asset.get("criticality", "medium"), "ok")

            # Calculate risk score
            risk_score = min(100, alerts_count * 15)

            formatted_asset = {
                "asset_id": asset_id,
                "id": asset_id,  # Frontend uses 'id'
                "name": asset.get("name", asset_id),
                "category": ASSET_TYPE_CATEGORY_MAP.get(asset.get("asset_type", ""), "other"),
                "status": status,
                "zone": asset.get("location", {}).get("zone", "unknown"),
                "asset_type": asset.get("asset_type", ""),
                "asset_class": asset.get("asset_class", ""),
                "criticality": asset.get("criticality", "medium"),

                "metrics": {
                    "events_1h": event_counts.get(asset_id, 0),
                    "alerts_open": alerts_count,
                    "risk_score": risk_score,
                    "last_seen": asset.get("@timestamp", now.isoformat() + "Z")
                },

                "network": {
                    "ip_address": asset.get("network", {}).get("ip_address"),
                    "subnet": asset.get("location", {}).get("subnet"),
                    "mac_address": asset.get("network", {}).get("mac_address")
                },

                "location": asset.get("location", {}),
                "tags": asset.get("tags", []),
                "@timestamp": asset.get("@timestamp", now.isoformat() + "Z")
            }

            assets.append(formatted_asset)

        logger.info(f"Built {len(assets)} assets from city-assets index for WebSocket broadcast")
        return assets

    except Exception as e:
        logger.error(f"Error fetching asset telemetry: {e}", exc_info=True)
        return []


async def broadcast_telemetry_loop():
    """Background task that periodically fetches and broadcasts asset telemetry."""
    logger.info("Starting asset telemetry broadcast loop...")

    while True:
        try:
            if len(manager.active_connections) > 0:
                assets = await fetch_asset_telemetry()

                if assets:
                    message = {
                        "type": "asset_update",
                        "assets": assets,
                        "timestamp": datetime.utcnow().isoformat() + "Z",
                        "count": len(assets)
                    }
                    await manager.broadcast(message)
                    logger.debug(f"Broadcasted {len(assets)} assets to {len(manager.active_connections)} clients")
                else:
                    logger.warning("No assets to broadcast")

            await asyncio.sleep(2)  # Broadcast every 2 seconds

        except Exception as e:
            logger.error(f"Error in telemetry broadcast loop: {e}", exc_info=True)
            await asyncio.sleep(5)


@router.websocket("/ws/city-telemetry")
async def websocket_city_telemetry(websocket: WebSocket):
    """
    WebSocket endpoint for real-time city asset telemetry.
    Streams asset updates every 2 seconds.
    """
    await manager.connect(websocket)

    try:
        # Send initial data immediately
        assets = await fetch_asset_telemetry()
        await websocket.send_json({
            "type": "asset_update",
            "assets": assets,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "count": len(assets)
        })

        # Keep connection alive and listen for client messages
        while True:
            try:
                # Wait for client ping/pong or commands
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                # Echo back to keep connection alive
                await websocket.send_json({"type": "pong", "timestamp": datetime.utcnow().isoformat() + "Z"})
            except asyncio.TimeoutError:
                # Send keep-alive ping
                await websocket.send_json({"type": "ping", "timestamp": datetime.utcnow().isoformat() + "Z"})

    except WebSocketDisconnect:
        manager.disconnect(websocket)
        logger.info("Client disconnected normally")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)


# Start broadcast loop when module loads
@router.on_event("startup")
async def startup_event():
    """Start the telemetry broadcast loop on startup."""
    asyncio.create_task(broadcast_telemetry_loop())
    logger.info("Asset telemetry broadcast task started")
