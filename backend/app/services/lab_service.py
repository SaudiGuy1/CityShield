"""Researcher lab container lifecycle management."""
import logging
import docker
from docker.errors import NotFound

logger = logging.getLogger(__name__)

IMAGE_NAME = "cityshield-lab:latest"
NETWORK_SUFFIX = "cityshield_network"
CYBER_RANGE_NETWORK_SUFFIX = "cyber_range_net"
CONTAINER_PREFIX = "cityshield-lab-"
VOLUME_PREFIX = "cityshield-lab-"


class LabService:
    """Manages per-researcher Docker lab containers."""

    @staticmethod
    def _client():
        return docker.from_env()

    @staticmethod
    def _find_network() -> str:
        """Find the actual cityshield network name (Docker Compose adds a project prefix)."""
        client = docker.from_env()
        for net in client.networks.list():
            if net.name.endswith(NETWORK_SUFFIX):
                return net.name
        raise RuntimeError(
            f"No Docker network ending with '{NETWORK_SUFFIX}' found. "
            "Is docker compose up?"
        )

    @staticmethod
    def _find_cyber_range_network() -> str | None:
        """Find the cyber_range_net network (Docker Compose adds a project prefix).

        Returns None instead of raising if the network doesn't exist,
        since the cyber range components are optional.
        """
        client = docker.from_env()
        for net in client.networks.list():
            if net.name.endswith(CYBER_RANGE_NETWORK_SUFFIX):
                return net.name
        return None

    @staticmethod
    def _container_name(username: str) -> str:
        return f"{CONTAINER_PREFIX}{username}"

    @staticmethod
    def _volume_name(username: str) -> str:
        return f"{VOLUME_PREFIX}{username}-data"

    @staticmethod
    def _ensure_cyber_range_connected(container) -> None:
        """Ensure a container is connected to cyber_range_net. No-op if already connected."""
        cr_net_name = LabService._find_cyber_range_network()
        if not cr_net_name:
            return
        # Check if already connected
        container.reload()
        connected_nets = container.attrs.get("NetworkSettings", {}).get("Networks", {})
        if cr_net_name in connected_nets:
            return
        try:
            client = docker.from_env()
            cr_net = client.networks.get(cr_net_name)
            cr_net.connect(container)
            logger.info(f"Connected {container.name} to {cr_net_name}")
        except Exception as e:
            logger.warning(f"Could not connect {container.name} to {cr_net_name}: {e}")

    @staticmethod
    def _is_metasploitable_running() -> bool:
        """Check if the metasploitable container is running."""
        try:
            client = docker.from_env()
            container = client.containers.get("metasploitable")
            return container.status == "running"
        except Exception:
            return False

    @staticmethod
    def get_status(username: str) -> dict:
        """Get the lab container status for a user."""
        client = LabService._client()
        name = LabService._container_name(username)
        try:
            container = client.containers.get(name)
            return {
                "status": container.status,  # running, exited, created, etc.
                "container_id": container.short_id,
                "name": name,
                "provisioned": True,
                "targets": {"metasploitable": LabService._is_metasploitable_running()},
            }
        except NotFound:
            return {
                "status": "not_provisioned",
                "container_id": None,
                "name": name,
                "provisioned": False,
                "targets": {"metasploitable": LabService._is_metasploitable_running()},
            }

    @staticmethod
    def provision(username: str) -> dict:
        """Create and start a lab container for the user.

        Always tears down any existing container and recreates from the
        latest image so that image rebuilds (welcome banner, new tools)
        take effect without manual cleanup.  The user's home-directory
        volume is preserved across re-provisions.
        """
        client = LabService._client()
        name = LabService._container_name(username)
        vol_name = LabService._volume_name(username)

        # Remove any existing container so we always use the latest image.
        try:
            old = client.containers.get(name)
            old.remove(force=True)
            logger.info(f"Removed old lab container {name} (was {old.short_id})")
        except NotFound:
            pass

        # Ensure volume exists (home dir survives re-provision)
        try:
            client.volumes.get(vol_name)
        except NotFound:
            client.volumes.create(name=vol_name)
            logger.info(f"Created volume {vol_name}")

        # Create and start container from the latest image
        network = LabService._find_network()
        container = client.containers.run(
            IMAGE_NAME,
            name=name,
            detach=True,
            stdin_open=True,
            tty=True,
            network=network,
            mem_limit="512m",
            nano_cpus=500_000_000,  # 0.5 CPU
            cap_add=["NET_RAW", "NET_ADMIN"],
            volumes={vol_name: {"bind": "/home/researcher", "mode": "rw"}},
            restart_policy={"Name": "unless-stopped"},
        )
        logger.info(f"Provisioned lab container {name} (id={container.short_id})")

        # Also connect to cyber_range_net so the lab can reach Metasploitable
        LabService._ensure_cyber_range_connected(container)

        return LabService.get_status(username)

    @staticmethod
    def start(username: str) -> dict:
        """Start a stopped lab container."""
        client = LabService._client()
        name = LabService._container_name(username)
        try:
            container = client.containers.get(name)
            if container.status != "running":
                container.start()
            LabService._ensure_cyber_range_connected(container)
            return LabService.get_status(username)
        except NotFound:
            raise ValueError(f"Lab container {name} not found. Provision it first.")

    @staticmethod
    def stop(username: str) -> dict:
        """Stop a running lab container."""
        client = LabService._client()
        name = LabService._container_name(username)
        try:
            container = client.containers.get(name)
            if container.status == "running":
                container.stop(timeout=5)
            return LabService.get_status(username)
        except NotFound:
            raise ValueError(f"Lab container {name} not found.")

    @staticmethod
    def remove(username: str, remove_volume: bool = False) -> dict:
        """Remove a lab container and optionally its volume."""
        client = LabService._client()
        name = LabService._container_name(username)
        try:
            container = client.containers.get(name)
            container.remove(force=True)
            logger.info(f"Removed container {name}")
        except NotFound:
            pass

        if remove_volume:
            vol_name = LabService._volume_name(username)
            try:
                vol = client.volumes.get(vol_name)
                vol.remove()
                logger.info(f"Removed volume {vol_name}")
            except NotFound:
                pass

        return {"status": "removed", "provisioned": False}

    @staticmethod
    def create_exec_session(username: str):
        """Create a docker exec session with PTY for terminal relay.

        Returns (exec_id, raw_socket) for bidirectional communication.
        """
        client = LabService._client()
        api = client.api
        name = LabService._container_name(username)

        # Verify container is running
        container = client.containers.get(name)
        if container.status != "running":
            raise ValueError("Lab container is not running.")

        exec_id = api.exec_create(
            name,
            cmd="/bin/bash",
            stdin=True,
            tty=True,
            stdout=True,
            stderr=True,
            user="researcher",
            workdir="/home/researcher",
        )["Id"]

        raw_socket = api.exec_start(exec_id, socket=True, tty=True)
        return exec_id, raw_socket

    @staticmethod
    def resize_exec(exec_id: str, rows: int, cols: int):
        """Resize the PTY of an exec session."""
        client = LabService._client()
        client.api.exec_resize(exec_id, height=rows, width=cols)
