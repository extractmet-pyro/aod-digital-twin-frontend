# AOD Stainless-Steel Refining Digital Twin — Operator Desk (Frontend)

**Extractmet Private Limited** · HTML5 / CSS3 / JavaScript ES modules · Three.js · Chart.js · Vite

The operator desk has 17 views:
- Overview
- 3D Vessel (interactive AOD with lining layers, bath and slag levels, tuyeres and gas-mix plume, lance, hood, additions, tilt, cutaway, X-ray, labels and time scrubber)
- Process Schematic (big-picture SVG with all regions, gas skid, bunkers, instruments and live values)
- Furnace Design (capacity presets 20–180 t, AOD/AOD-L, dimensions, tuyeres, lining editor, to-scale section and thermal profile)
- Charge & Recipe
- Trends
- Mass Balance
- Heat Balance
- Slag & Recovery
- Off-Gas
- Thermo Explorer
- ML & Confidence
- MPC Advisor
- Scenario Lab
- Economics & CO₂
- Reports
- Settings & Audit

Every panel shows data from the FastAPI backend. Without a backend, the desk shows a clearly labelled bundled synthetic fixture (`src/fixtures/demo-run.json`, produced by the backend).

## Run
```bash
npm ci
echo "VITE_API_BASE_URL=http://localhost:8000" > .env.local
npm run dev          # http://localhost:5173
npm test             # vitest
npm run build        # dist/
```

## Render (Static Site)
Build with `npm ci && npm run build`, publish `dist`, and set the env `VITE_API_BASE_URL=https://YOUR-BACKEND.onrender.com`. See `render.yaml` and `docs/DEPLOYMENT.md`. Add the site's origin to the backend `CORS_ALLOWED_ORIGINS`.

## Structure
```
index.html
src/main.js, app.js            entry, hash router
src/styles/                    tokens.css, layout.css, components.css, three.css (dark industrial theme, Okabe–Ito palette)
src/api/                       client.js (retry/backoff for GETs, timeouts, X-API-Key), contracts.js, websocket.js (wss + polling fallback)
src/state/                     store.js, actions.js
src/components/                header, nav, charts, tables, alerts, mpcCard, schematic (SVG), ui helpers
src/views/                     one module per screen
src/three/                     scene, vesselGeometry, bath, slag, tuyeres, lance/hood, plume/additions, controls
src/utils/                     units, format, validators, export, colors
tests/unit, tests/e2e          vitest + Playwright smoke (screenshots)
docs/                          FRONTEND_GUIDE, SCREEN_MAP, API_BINDINGS, DEPLOYMENT
```
The gas plume and bubbles are a schematic animation, not CFD. The frame rate never drives simulation time.
