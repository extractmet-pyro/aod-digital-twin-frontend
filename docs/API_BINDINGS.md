# API bindings

All calls go through `src/api/client.js`:
- The base URL comes from `localStorage['aod.api']`, else `VITE_API_BASE_URL`, else `http://localhost:8000`.
- GET calls are retried with exponential backoff (2 retries).
- POST calls are not retried.
- Every call has a timeout (MPC 300 s).

A 4xx response is shown verbatim as a toast, including field-level validation details. `contracts.js#checkRun` checks the required run fields. `websocket.js` replays stored runs over `ws(s)://…/v1/stream/{heat}`, reconnects up to 3 times, then falls back to polling. Data-origin encoding: measured samples are drawn as markers, simulated values as solid lines, estimates as dashed lines and equilibrium or forecast values as dotted lines. Synthetic and fixture data are labelled in banners and in the header.
