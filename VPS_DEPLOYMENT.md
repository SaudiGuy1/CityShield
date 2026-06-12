# Deploy CityShield on a VPS (most reliable)

CityShield is built for Docker Compose, so a single Linux server runs the **whole
stack exactly like your laptop** — this is the most reliable way to publish it.
No per-service platform quirks, and OpenSearch gets the RAM it needs.

You get a working link at **`http://<SERVER_IP>/`** in ~10 minutes.

---

## 1. Get a server

Any Ubuntu 22.04 / Debian 12 server with **≥ 4 GB RAM** (OpenSearch is memory
heavy), 2 vCPU, ~20 GB disk. Options:

| Provider | Notes |
|---|---|
| **Oracle Cloud — Always Free** | Free forever; Ampere ARM VM with up to 24 GB RAM. Plenty. (All core images are multi-arch.) |
| **Hetzner Cloud** | CX22: 2 vCPU / 4 GB, ~€4/mo (x86). Cheapest reliable option. |
| **DigitalOcean / Vultr / Linode** | Pick a 4 GB droplet. |

When creating the VM, **open inbound ports 22 (SSH) and 80 (HTTP)** in the cloud
firewall / security list. Leave everything else closed.

---

## 2. Deploy (copy‑paste)

SSH into the server, then:

```bash
# install git if needed
sudo apt-get update && sudo apt-get install -y git

# get the code (your repo + branch)
git clone -b railway-deployment https://github.com/SaudiGuy1/CityShield.git
cd CityShield

# one command does everything (Docker, env, secrets, start)
sudo bash deploy/vps-deploy.sh
```

The script:
- installs Docker if missing,
- sets `vm.max_map_count=262144` (OpenSearch requirement),
- creates `.env` and generates a strong `BACKEND_JWT_SECRET`,
- starts the core services with **only the frontend public on port 80**,
- prints your URL.

When it finishes, wait ~1–2 minutes for first boot, then open:

```
http://<SERVER_IP>/
```

Login with `admin` and the `DEFAULT_ADMIN_PASS` from `.env` (change it after login).

---

## 3. What runs (and what doesn't)

**Running (core demo):** OpenSearch, backend, frontend, the 3 simulators,
detection engine, response manager, scenario runner → login, dashboards, live
events, alerts, scenarios.

**Security:** only the frontend (port 80) is reachable from the internet. The
`docker-compose.vps.yml` override binds OpenSearch (no auth), the backend API,
and Dashboards to `127.0.0.1`, so they are not exposed publicly. The frontend's
nginx proxies `/api` and `/ws` to the backend over the internal network.

**Left out on purpose:** the cyber range (Metasploitable / Kali‑style attacker /
packet loggers) and the IoT range — heavy, privileged, and x86‑only. The app
degrades gracefully without them.

---

## 4. Manage it

```bash
cd CityShield
# all commands reuse both compose files:
COMPOSE="docker compose -f docker-compose.yml -f docker-compose.vps.yml"

$COMPOSE ps                         # status
$COMPOSE logs -f backend            # follow backend logs
$COMPOSE restart backend            # restart a service
$COMPOSE down                       # stop everything
$COMPOSE up -d                      # start again
```

To update after a `git pull`:
```bash
git pull
docker compose -f docker-compose.yml -f docker-compose.vps.yml up -d --build
```

---

## 5. Optional: clean domain + HTTPS

For `https://yourdomain.com` instead of `http://<IP>/`:

1. Point an A record at the server IP.
2. Put Caddy in front (auto HTTPS). Minimal `Caddyfile`:
   ```
   yourdomain.com {
       reverse_proxy 127.0.0.1:80
   }
   ```
   Run Caddy (e.g. `docker run -d --network host -v $PWD/Caddyfile:/etc/caddy/Caddyfile caddy`)
   and open port 443 in the firewall.

---

## 6. Troubleshooting

- **Site not loading:** confirm ports 22 + 80 are open in the **cloud firewall**
  (Docker bypasses `ufw`, so the cloud‑level firewall is what matters).
- **Backend unhealthy / 502 on /api:** `docker compose ... logs -f backend` —
  it waits for OpenSearch on first boot; give it 1–2 min.
- **OpenSearch keeps restarting:** not enough RAM. Use a ≥ 4 GB server, or lower
  the heap by adding `OPENSEARCH_JAVA_OPTS=-Xms512m -Xmx512m` to the opensearch
  service.
- **`vm.max_map_count` error:** rerun `sudo sysctl -w vm.max_map_count=262144`.
