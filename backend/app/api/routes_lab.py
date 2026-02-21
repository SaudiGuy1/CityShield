"""Lab container management routes and WebSocket terminal relay."""
import logging
import asyncio
import json
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends, HTTPException, status
from ..core.security import decode_token
from ..core.rbac import require_researcher_or_admin, Role
from ..services.lab_service import LabService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/lab", tags=["lab"])


@router.get("/status")
def lab_status(current_user: dict = Depends(require_researcher_or_admin)):
    """Get the lab container status for the current user."""
    return LabService.get_status(current_user["username"])


@router.post("/provision")
def lab_provision(current_user: dict = Depends(require_researcher_or_admin)):
    """Provision (create & start) a lab container for the current user."""
    try:
        return LabService.provision(current_user["username"])
    except Exception as e:
        logger.error(f"Lab provision error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/start")
def lab_start(current_user: dict = Depends(require_researcher_or_admin)):
    """Start a stopped lab container."""
    try:
        return LabService.start(current_user["username"])
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Lab start error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stop")
def lab_stop(current_user: dict = Depends(require_researcher_or_admin)):
    """Stop a running lab container."""
    try:
        return LabService.stop(current_user["username"])
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Lab stop error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/remove")
def lab_remove(current_user: dict = Depends(require_researcher_or_admin)):
    """Remove a lab container (volume preserved)."""
    try:
        return LabService.remove(current_user["username"], remove_volume=False)
    except Exception as e:
        logger.error(f"Lab remove error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.websocket("/ws/terminal")
async def lab_terminal(websocket: WebSocket, token: Optional[str] = Query(None)):
    """WebSocket endpoint that relays PTY I/O between browser and Docker exec session."""
    # Authenticate via JWT query param
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Missing auth token")
        return

    try:
        payload = decode_token(token)
        username = payload.get("sub")
        role = payload.get("role")
        if not username:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token")
            return
        if role not in (Role.RESEARCHER, Role.ADMINISTRATOR):
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Insufficient permissions")
            return
    except Exception:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Token validation failed")
        return

    await websocket.accept()
    logger.info(f"Lab terminal WebSocket connected: user={username}")

    # Create docker exec session
    try:
        exec_id, raw_socket = LabService.create_exec_session(username)
    except Exception as e:
        await websocket.send_json({"type": "error", "data": f"Failed to start terminal: {e}"})
        await websocket.close()
        return

    # Get the underlying socket for raw I/O
    sock = raw_socket._sock

    loop = asyncio.get_event_loop()

    async def docker_to_ws():
        """Read from Docker PTY socket and forward to WebSocket."""
        try:
            while True:
                data = await loop.run_in_executor(None, sock.recv, 4096)
                if not data:
                    break
                await websocket.send_json({
                    "type": "output",
                    "data": data.decode("utf-8", errors="replace"),
                })
        except Exception as e:
            logger.debug(f"docker_to_ws ended: {e}")

    async def ws_to_docker():
        """Read from WebSocket and forward to Docker PTY socket."""
        try:
            while True:
                raw = await websocket.receive_text()
                msg = json.loads(raw)
                if msg.get("type") == "input":
                    await loop.run_in_executor(None, sock.sendall, msg["data"].encode("utf-8"))
                elif msg.get("type") == "resize":
                    cols = msg.get("cols", 80)
                    rows = msg.get("rows", 24)
                    try:
                        LabService.resize_exec(exec_id, rows, cols)
                    except Exception as e:
                        logger.debug(f"Resize failed: {e}")
        except WebSocketDisconnect:
            logger.info(f"Lab terminal disconnected: user={username}")
        except Exception as e:
            logger.debug(f"ws_to_docker ended: {e}")

    # Run both relay tasks concurrently
    d2w = asyncio.create_task(docker_to_ws())
    w2d = asyncio.create_task(ws_to_docker())

    try:
        done, pending = await asyncio.wait(
            [d2w, w2d], return_when=asyncio.FIRST_COMPLETED
        )
        for task in pending:
            task.cancel()
    finally:
        try:
            sock.close()
        except Exception:
            pass
        try:
            await websocket.close()
        except Exception:
            pass
        logger.info(f"Lab terminal session ended: user={username}")
