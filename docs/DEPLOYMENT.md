# AOD Stainless-Steel Refining Digital Twin — Deployment Guide

Extractmet Private Limited · version 1.0.0

This guide covers two independent GitHub repositories and two Render services:

| Repository | Render service | Build | Start / publish |
|---|---|---|---|
| `aod-digital-twin-backend` (Python 3.11 / FastAPI) | **Web Service** | `pip install -r requirements.txt` | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| `aod-digital-twin-frontend` (Vite · HTML/CSS/JS · Three.js · Chart.js) | **Static Site** | `npm ci && npm run build` | publish directory `dist` |

> **Safety boundary.** The cloud deployment is for simulation, visualisation, analytics and advisory use only. It has no path to plant actuators and must never be connected to one. CLOSED_LOOP mode is disabled in code. Any real-plant integration needs an isolated on-prem OT gateway, a site-approved control architecture, independent PLC/DCS/SIS protections, operator authorisation, a cybersecurity review (ISA/IEC 62443, NIST SP 800-82) and controlled commissioning. Render free-tier uptime and latency are **not** suitable for real-time control.

---

## 1. Local setup

### 1.1 Prerequisites
- Python 3.11 or later (3.11–3.13 tested; 3.13 was used for the executed tests)
- Node.js 20 or later (22 tested) with npm 10
- git, and optionally Docker

### 1.2 Backend
```bash
unzip aod-digital-twin-backend.zip && cd aod-digital-twin-backend
python -m venv .venv && source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env                                     # optional; values are read from the environment
export CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:4173
uvicorn app.main:app --reload --port 8000                # or: scripts/run_local.sh
```
Check:
- http://localhost:8000/health → `{"status":"ok"}`
- http://localhost:8000/ready → `ml_model: ready` (the residual model trains from the bundled synthetic CSV within a few seconds of startup)
- http://localhost:8000/docs → interactive OpenAPI

Test and lint:
```bash
pytest -q            # 46 tests, ~85 s
ruff check app tests scripts
scripts/smoke_test.sh http://localhost:8000
python -m app.demo.seed_demo          # optional: store the three demo heats
python scripts/generate_openapi.py    # writes docs/AOD_API_OpenAPI.json
python scripts/generate_training_data.py --n 150   # regenerates the synthetic ML dataset (~3 min)
```

### 1.3 Frontend
```bash
unzip aod-digital-twin-frontend.zip && cd aod-digital-twin-frontend
npm ci
cp .env.example .env.local && echo "VITE_API_BASE_URL=http://localhost:8000" > .env.local
npm run dev            # http://localhost:5173
npm test               # vitest unit tests
npm run build && npm run preview   # production bundle on http://localhost:4173
```
The desk opens on a **bundled synthetic fixture**, so the 3D vessel and charts appear even before the API is reachable. The header shows `OFFLINE FIXTURE` and `API offline` until the backend answers. You can change the API URL at runtime under **Settings & Audit**.

Optional end-to-end test (Playwright, Chromium):
```bash
npm i -D playwright@1.49.1 && npx playwright install chromium
FRONTEND_URL=http://localhost:4173 API_URL=http://localhost:8000 node tests/e2e/smoke.mjs screenshots
```

### 1.4 Local checklist
- [ ] `/health` returns ok and `/ready` shows `ml_model: ready`
- [ ] `pytest` passes and `npm test` passes
- [ ] The frontend header shows **API online**
- [ ] Overview → **DEMO-A-304L** runs and Closure shows PASS
- [ ] MPC Advisor returns `advisory_only true`; approving with a `shift_supervisor` role is logged in Settings & Audit

---

## 2. Two GitHub repositories

Create two **empty** repositories on GitHub: `aod-digital-twin-backend` and `aod-digital-twin-frontend`. Do not tick "add README". Then push each one:

```bash
# backend
cd aod-digital-twin-backend
git init && git add . && git commit -m "AOD digital twin backend v1.0.0"
git branch -M main
git remote add origin https://github.com/<YOUR-ORG>/aod-digital-twin-backend.git
git push -u origin main

# frontend (separate folder, separate repository)
cd ../aod-digital-twin-frontend
git init && git add . && git commit -m "AOD digital twin frontend v1.0.0"
git branch -M main
git remote add origin https://github.com/<YOUR-ORG>/aod-digital-twin-frontend.git
git push -u origin main
```
`.gitignore` excludes `node_modules/`, `dist/`, `.venv/`, `.env` and `*.db`. Never commit secrets.

---

## 3. Render — backend Web Service

**Option A: Blueprint.** In Render, choose New → Blueprint, select the backend repository, and Render reads `render.yaml`.

**Option B: dashboard fields.**

| Field | Value |
|---|---|
| Type | Web Service |
| Runtime | Python 3 |
| Branch | main |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Health Check Path | `/health` |
| Instance | Free for demos; **Starter or higher** recommended (the MPC is CPU-bound) |

Environment variables:

| Key | Example | Notes |
|---|---|---|
| `PYTHON_VERSION` | `3.11.9` | pins the runtime |
| `APP_ENV` | `demo` | |
| `APP_MODE` | `SIMULATION` | SHADOW/ADVISORY are selectable in the GUI; CLOSED_LOOP does not exist |
| `CORS_ALLOWED_ORIGINS` | `https://aod-digital-twin-frontend.onrender.com` | exact https origin(s), comma-separated |
| `DATABASE_URL` | `sqlite:////tmp/aod_demo.db` or a Render Postgres URL (`postgresql+psycopg://…`, add `psycopg[binary]` to requirements) | the local disk is **ephemeral** |
| `LOG_LEVEL` | `INFO` | structured JSON logs carrying request id |
| `MPC_MAX_EVALS` / `MPC_DT_S` / `JOB_TIMEOUT_S` | `24` / `6` / `150` | lower them on small instances |
| `API_KEY` | (secret) | optional; write endpoints then require `X-API-Key` |
| `MODEL_DIR` | `/var/data/models` | optional; needs a persistent disk |

After the deploy finishes, open `https://YOUR-BACKEND.onrender.com/health`, then `/ready`, then `/docs`.

## 4. Render — frontend Static Site

| Field | Value |
|---|---|
| Type | Static Site |
| Build Command | `npm ci && npm run build` |
| Publish Directory | `dist` |
| Env | `VITE_API_BASE_URL=https://YOUR-BACKEND.onrender.com` (public; never put secrets here) |
| Rewrite | `/*` → `/index.html` (already in `render.yaml`; the app uses hash routing, so deep links also work without it) |

The WebSocket URL is derived from the API URL: `https` becomes `wss`, giving `wss://YOUR-BACKEND.onrender.com/v1/stream/{heat_id}`. If the socket fails, replay falls back to polling.

## 5. Initial URL and CORS sequence

1. Deploy the backend and note its URL.
2. Deploy the frontend with `VITE_API_BASE_URL` set to the backend URL, and note the frontend URL.
3. Set the backend `CORS_ALLOWED_ORIGINS` to the frontend URL exactly (scheme + host, no trailing slash), then redeploy or restart the backend.
4. Open the frontend. The header should show **API online**.

## 6. Cloud smoke test
```bash
scripts/smoke_test.sh https://YOUR-BACKEND.onrender.com
```
Then, in the GUI:
1. Load DEMO-A-304L and check that Closure shows PASS.
2. Open the 3D Vessel view and drag the scrubber.
3. In ML & Confidence, run the analyzer-dropout case and confirm the mode becomes ADVISORY_HOLD.
4. Run the MPC Advisor and approve as `shift_supervisor`.
5. In Reports, open the HTML report and print it to PDF.

Screenshot instructions: the reference screenshots are in `screenshots/` (produced by the e2e script). Retake them with the same script against your deployment.

## 7. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| **HTTP 422** | The input failed validation, for example a negative mass, composition above 100 %, a missing C or Cr assay, O₂ in a reduction stage, or an unknown material. The response `details[]` names the field. Nothing is silently clamped. |
| **HTTP 409** on review | The role is not allowed to approve (requires `shift_supervisor`). |
| **HTTP 500** | See the Render logs (JSON, with `request_id`). The response carries the same `request_id`. |
| **CORS error** in the browser console | The frontend origin is missing from `CORS_ALLOWED_ORIGINS`, or there is a trailing slash, or http/https differ. |
| WebSocket fails | It must be `wss://` behind https. Replay falls back to polling the stored run. |
| First request slow (~1 min) | The free instance spun down. Upgrade the plan or ping `/health`. |
| MPC timeout | Lower `MPC_MAX_EVALS` or use `POST /v1/mpc/recommend?async_job=true` and poll `GET /v1/jobs/{id}`. Use a larger instance. |
| Runs "lost" after redeploy | SQLite on ephemeral disk. Use Render Postgres via `DATABASE_URL`. |
| Header shows OFFLINE FIXTURE | The frontend cannot reach the API. Check the URL in Settings and CORS. |

## 8. Operations

- **Resources:** a full heat takes about 1–1.5 s of CPU. An MPC run with 24 evaluations at Δt = 6 s takes about 8–15 s on 1 vCPU and is much slower on the free tier's 0.1 CPU. Memory is under 400 MB.
- **Logs and monitoring:** Render logs show JSON lines (`ts, level, msg, request_id`). Use `/health` for liveness and `/ready` for database and ML readiness. Add Render alerting or an external uptime monitor.
- **Persistence and backups:** use Render Postgres (daily backups on paid plans). The audit trail is hash-chained, and `GET /v1/audit/{heat}` reports `chain_intact`.
- **Dependency upgrades:** the dependencies are pinned. Upgrade on a branch, run `pytest` and `npm test`, then merge.
- **Rollback:** Render dashboard → Deploys → "Rollback to this deploy", or `git revert` and push.
- **Secrets rotation:** rotate `API_KEY` in Render env vars. The frontend never holds secrets.
- **Domain and TLS:** add a custom domain in Render (TLS is automatic), then update CORS and `VITE_API_BASE_URL`.

## 9. Cloud checklist
- [ ] Two repositories, two Render services, both on https
- [ ] `CORS_ALLOWED_ORIGINS` = exact frontend origin
- [ ] `/health`, `/ready` and `/docs` reachable
- [ ] Frontend shows API online; demo heat runs; MPC returns advisory-only output
- [ ] Persistent database configured if runs or audit must survive redeploys
- [ ] No plant connectivity configured (cloud demo); OT integration is a separate on-prem project

## 10. Future on-prem integration (not part of this deployment)

- Read-only OPC UA or historian ingestion through an isolated OT DMZ gateway, with site tag mapping, time synchronisation and buffering.
- SHADOW mode compares recommendations with historian and operator records.
- Any future write path requires its own approved design: deterministic latency, signed-off control authority, MOC, and an independently certified architecture. It is not implemented here.
