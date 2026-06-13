# Deploy CityShield on Render — demo mode (no database)

This publishes a working demo with **two free Render web services and nothing
else**. The backend runs in **in-memory demo mode** (`USE_IN_MEMORY_STORE=true`),
so there is **no OpenSearch / database to host** — the #1 thing that made the
other platforms painful is gone.

On startup the backend seeds the same demo data as a full stack:
- admin + researcher users,
- 10 OWASP Top-10 scenarios, 75 detection rules,
- training assets, and sample **alerts + log events** so dashboards look alive.

> Demo-mode caveat: data lives in memory and **resets when the service
> restarts/sleeps** (it re-seeds on next boot). Live simulator traffic isn't
> generated, but the seeded demo data is always there. For a persistent,
> fully-live deployment use `VPS_DEPLOYMENT.md`.

Your local docker-compose is unaffected (in-memory mode is off by default).

---

## Architecture

```
 users ─► cityshield-frontend (Render web, nginx)  ──proxy /api,/ws──►  cityshield-backend (Render web, FastAPI)
              public URL (your link)                                       in-memory store (no DB)
```

---

## Steps (click-by-click)

**1. Push the branch** (it contains `render.yaml`):
```bash
git push
```

**2. Create the Blueprint**
- Render → **New + → Blueprint**.
- **Connect** your `CityShield` repo, select the **`railway-deployment`** branch.
- Render reads `render.yaml` and shows **cityshield-backend** + **cityshield-frontend**. Click **Apply**.

**3. Set one secret**
- Open **cityshield-backend → Environment** → set **`DEFAULT_ADMIN_PASS`** to a
  password you choose → **Save Changes**.
- (`BACKEND_JWT_SECRET` is auto-generated; `BACKEND_URL` on the frontend is
  auto-wired. Nothing else to set.)

**4. Get your link**
- Wait for both services to go **Live** (first build ~3–5 min).
- Open **cityshield-frontend** → `https://cityshield-frontend.onrender.com` —
  **this is your demo link**.
- Log in: `admin` / the `DEFAULT_ADMIN_PASS` you set.

---

## Required environment variables

You set **one**: `DEFAULT_ADMIN_PASS`. Everything else is pre-filled by
`render.yaml`:

| Variable | Value | Who sets it |
|---|---|---|
| `DEFAULT_ADMIN_PASS` | your admin password | **you** (dashboard) |
| `USE_IN_MEMORY_STORE` | `true` | render.yaml |
| `BACKEND_JWT_SECRET` | auto-generated | Render |
| `DEFAULT_ADMIN_USER` / `DEFAULT_ADMIN_EMAIL` | `admin` / `admin@cityshield.example.com` | render.yaml |
| `USE_MOCK_CITY_COMPONENTS`, `CORS_ALLOWED_ORIGINS`, `LOG_LEVEL`, JWT settings | sane defaults | render.yaml |
| `BACKEND_URL` (frontend) | injected from backend | render.yaml |

---

## What works in the demo

Login, RBAC, the 3D smart-city dashboard, alerts (seeded), alert resolution,
75 detection rules, 10 OWASP scenarios, MITRE technique browser, devices,
metrics, security-awareness, team analytics, theming, and English/Arabic.

**Not in this demo:** live simulator traffic, the cyber range, and the
researcher lab (they need extra services / a Docker socket). Use a VM
(`VPS_DEPLOYMENT.md`) for the fully-live stack.

---

## Notes

- **Free Render services sleep** after ~15 min idle (~30–60 s cold start, and
  the in-memory data re-seeds). Fine for a demo; use the Starter plan for
  always-on.
- This same flag works on **any** host (Railway, Fly, a tiny box): set
  `USE_IN_MEMORY_STORE=true` and you need only the backend + frontend.
