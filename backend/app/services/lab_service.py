"""Researcher lab container lifecycle management."""
import logging
import docker
from docker.errors import NotFound, APIError

logger = logging.getLogger(__name__)

IMAGE_NAME = "cityshield-lab:latest"
NETWORK_SUFFIX = "cityshield_network"
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
    def _container_name(username: str) -> str:
        return f"{CONTAINER_PREFIX}{username}"

    @staticmethod
    def _volume_name(username: str) -> str:
        return f"{VOLUME_PREFIX}{username}-data"

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
            }
        except NotFound:
            return {
                "status": "not_provisioned",
                "container_id": None,
                "name": name,
                "provisioned": False,
            }

    @staticmethod
    def provision(username: str) -> dict:
        """Create and start a lab container for the user."""
        client = LabService._client()
        name = LabService._container_name(username)
        vol_name = LabService._volume_name(username)

        # If container already exists, just start it
        try:
            container = client.containers.get(name)
            if container.status != "running":
                container.start()
            return LabService.get_status(username)
        except NotFound:
            pass

        # Ensure volume exists
        try:
            client.volumes.get(vol_name)
        except NotFound:
            client.volumes.create(name=vol_name)
            logger.info(f"Created volume {vol_name}")

        # Create and start container
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
            volumes={vol_name: {"bind": "/home/researcher", "mode": "rw"}},
            restart_policy={"Name": "unless-stopped"},
        )
        logger.info(f"Provisioned lab container {name} (id={container.short_id})")
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
