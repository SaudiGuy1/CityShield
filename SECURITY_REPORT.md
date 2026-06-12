# CityShield — Security Review Report

**Date:** 2026-06-11
**Scope:** Full repository — backend, frontend, microservices, Docker, infrastructure, scripts.
**Posture:** CityShield is a **local training/research cyber range**. Several "findings" are
deliberate design choices for that context (disabled OpenSearch security, intentionally vulnerable
range targets, simulated attack credentials). They are documented here so that anyone deploying the
platform beyond a trusted local machine knows exactly what to harden.

Severity legend: 🔴 Critical · 🟠 High · 🟡 Medium · 🟢 Low / Informational · ✅ Fixed in this audit.

---

## Summary

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | CORS allowed any origin (`*`) **with credentials** | 🟠 High | ✅ Fixed |
| 2 | OpenSearch security plugin & TLS disabled | 🔴 Critical (prod) | By design (local); documented |
| 3 | Weak default `BACKEND_JWT_SECRET` | 🟠 High | Documented; env‑driven |
| 4 | Default credentials in `.env.example` | 🟡 Medium | Documented |
| 5 | No rate limiting on `/api/auth/login` | 🟠 High | Open (recommended) |
| 6 | `docker.sock` mounted into backend / response_manager / filebeat | 🟠 High | By design; documented |
| 7 | Ansible `become=True`, `become_ask_pass=False`, `host_key_checking=False` | 🟡 Medium | By design (local) |
| 8 | JWT tokens stored in `localStorage` (frontend) | 🟡 Medium | Open (recommended) |
| 9 | Simulated/attack credentials hardcoded in `traffic_sim/generator.py` | 🟢 Low | By design (synthetic) |
| 10 | Intentionally vulnerable range targets (Metasploitable, IoT) | 🟢 Info | By design (isolated networks) |
| 11 | No committed secrets; `.env` git‑ignored and untracked | 🟢 Good | Verified |
| 12 | No CPU/memory resource limits in compose | 🟢 Low | Open (recommended) |

---

## Detailed Findings

### 1. CORS: wildcard origin with credentials — ✅ FIXED
**Before:** `backend/app/main.py` configured `allow_origins=["*"]` together with
`allow_credentials=True`. This combination is both insecure (any site could drive authenticated
requests) and invalid per the CORS spec (browsers reject `*` when credentials are allowed).

**Fix applied:** origins are now an explicit, configurable allow‑list via the new
`CORS_ALLOWED_ORIGINS` environment variable (default `http://localhost:3000,http://127.0.0.1:3000`).
- `backend/app/core/config.py` — added `cors_allowed_origins` + `cors_origins_list` parser.
- `backend/app/main.py` — middleware now uses `settings.cors_origins_list`.
- `.env.example`, `.env`, and `docker-compose.yml` — documented and wired the variable.

**Verified live:** preflight from `http://localhost:3000` returns
`Access-Control-Allow-Origin: http://localhost:3000` (not `*`).

**Production action:** set `CORS_ALLOWED_ORIGINS` to your real frontend origin(s).

---

### 2. OpenSearch security plugin & TLS disabled — 🔴 Critical for production (by design locally)
`docker-compose.yml` sets `DISABLE_SECURITY_PLUGIN=true` /
`DISABLE_SECURITY_DASHBOARDS_PLUGIN=true`, and `backend/app/db/opensearch_client.py` uses
`use_ssl=False, verify_certs=False`. OpenSearch (`:9200`) is therefore unauthenticated and
unencrypted, and is published to the host.

This is acceptable on an isolated local machine. **Before any networked deployment:**
- Enable the OpenSearch security plugin and create scoped users.
- Enable TLS (`use_ssl=True, verify_certs=True`) and supply CA certs.
- Do **not** publish `9200`/`5601` to untrusted networks; front them with auth.

---

### 3. Weak default `BACKEND_JWT_SECRET` — 🟠 High
`config.py` falls back to `"change-this-secret-key"` and `.env.example` ships a placeholder. A
predictable secret lets an attacker forge tokens. The value is fully env‑driven, so the fix is
operational.

**Action:** set a ≥32‑char random `BACKEND_JWT_SECRET` (e.g. `openssl rand -base64 48`). Documented in
[SETUP_GUIDE.md](SETUP_GUIDE.md#configuring-env). _(Optional hardening: add a startup check that refuses
to boot with the placeholder secret when not in debug mode.)_

---

### 4. Default credentials in `.env.example` — 🟡 Medium
`.env.example` contains working default passwords (`CityShield@Admin2026`,
`CityShield@Researcher2026`, `Admin@123!Change`). These seed the first accounts and must be changed
after first login. They are clearly labelled "CHANGE AFTER FIRST LOGIN".

**Action:** rotate all default passwords before exposing the platform; consider forcing a password
change on first admin login.

---

### 5. No rate limiting on authentication — 🟠 High
`POST /api/auth/login` has no brute‑force protection or lockout.

**Recommendation:** add per‑IP rate limiting (e.g. `slowapi`) or enforce it at a reverse proxy, plus
account lockout/backoff.

---

### 6. Docker socket mounted into containers — 🟠 High (by design)
`backend` and `response_manager` mount `/var/run/docker.sock` (research‑lab provisioning and
container actions); `filebeat` mounts it read‑only for log enrichment. Access to the Docker socket is
effectively host root.

**Mitigations / actions:** keep these services off untrusted networks; consider a brokered Docker API
proxy with a restricted command set; mount read‑only where write access isn't required.

---

### 7. Ansible privilege/host‑key settings — 🟡 Medium (by design)
`infrastructure/ansible/ansible.cfg` uses `become=True`, `become_ask_pass=False`,
`host_key_checking=False`, targeting `localhost`. Appropriate for the self‑contained lab; revisit if
playbooks ever target remote hosts (enable host‑key checking and scoped privilege escalation).

---

### 8. JWT in `localStorage` (frontend) — 🟡 Medium
The token is stored in `localStorage` (`frontend/src/pages/Login.tsx`), which is readable by any XSS.

**Recommendation:** for production, prefer `HttpOnly`, `Secure`, `SameSite` cookies and serve the app
over HTTPS. Add a Content‑Security‑Policy at the nginx layer.

---

### 9. Hardcoded simulated credentials — 🟢 Low (by design)
`services/simulators/traffic_sim/generator.py` contains credential pairs
(`admin/admin`, `root/root`, …) used to generate **synthetic** brute‑force telemetry. These are not
real secrets; they exist to exercise detection rules. No action required; documented for reviewers.

---

### 10. Intentionally vulnerable range targets — 🟢 Informational (by design)
`metasploitable` (Metasploitable 2) and `iot_target` are deliberately attackable. They live only on
`internal` Docker networks (`cyber_range_net`, `iot_range_net`) with no host‑published ports.

**Action:** never expose these networks/containers outside the local host.

---

### 11. No committed secrets — 🟢 Good (verified)
- `.env` is listed in `.gitignore` and is **not** tracked by git (`git ls-files` confirms).
- A full repository sweep for AI-assistant tool references and for hardcoded API
  keys/tokens found no real secrets in committed source.
- `ABUSEIPDB_API_KEY` is empty by default and read from the environment.

---

### 12. No resource limits — 🟢 Low
No `deploy.resources`/`mem_limit` in `docker-compose.yml`. On constrained hosts a single service
(notably OpenSearch) can starve others.

**Recommendation:** add CPU/memory limits per service for shared or production hosts.

---

## Positive Controls Already in Place

- Passwords hashed with **bcrypt** (`app/core/security.py`).
- **JWT** auth with expiry; protected routes return **403** without a valid token (verified live).
- **RBAC** enforced server‑side (`app/core/rbac.py`) and mirrored by frontend route guards.
- **Network isolation** of the attack ranges via `internal` networks.
- **Non‑root users** in application/simulator Dockerfiles.
- **Full audit trail** for response actions in `action-audit-log`.
- Auto‑response **guardrails**: min severity, enrichment requirement, rate limits, cooldowns, subnet
  whitelists, optional human confirmation.

---

## Recommended Hardening Checklist (before non‑local deployment)

- [ ] Set a strong random `BACKEND_JWT_SECRET`.
- [ ] Rotate all default account and OpenSearch passwords.
- [ ] Set `CORS_ALLOWED_ORIGINS` to the real frontend origin(s). _(mechanism already in place)_
- [ ] Enable OpenSearch security plugin + TLS; stop publishing `9200`/`5601`.
- [ ] Put the API/frontend behind a reverse proxy with TLS and rate limiting.
- [ ] Move tokens to `HttpOnly` cookies; add CSP headers.
- [ ] Restrict or broker Docker‑socket access.
- [ ] Add per‑service resource limits.
- [ ] Keep all range networks host‑local.
