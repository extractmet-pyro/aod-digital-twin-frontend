import { checkRun } from './contracts.js';

const ENV_URL = (import.meta.env && import.meta.env.VITE_API_BASE_URL) || '';
let base = (localStorage.getItem('aod.api') || ENV_URL || 'http://localhost:8000').replace(/\/$/, '');
let apiKey = localStorage.getItem('aod.apikey') || '';

export function apiBase() { return base; }
export function setApiBase(u) { base = u.replace(/\/$/, ''); try { localStorage.setItem('aod.api', base); } catch { /* storage may be blocked */ } }
export function setApiKey(k) { apiKey = k; try { localStorage.setItem('aod.apikey', k); } catch { /* ignore */ } }

export class ApiError extends Error {
  constructor(status, body) { super(body?.message || `HTTP ${status}`); this.status = status; this.body = body; }
}

async function request(method, path, body, { retries = method === 'GET' ? 2 : 0, timeout = 240000 } = {}) {
  for (let attempt = 0; ; attempt++) {
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), timeout);
    try {
      const res = await fetch(base + path, {
        method, signal: ctl.signal,
        headers: { 'Content-Type': 'application/json', ...(apiKey ? { 'X-API-Key': apiKey } : {}) },
        body: body ? JSON.stringify(body) : undefined,
      });
      clearTimeout(to);
      const ct = res.headers.get('content-type') || '';
      const data = ct.includes('json') ? await res.json() : await res.text();
      if (!res.ok) throw new ApiError(res.status, typeof data === 'object' ? data : { message: data });
      return data;
    } catch (e) {
      clearTimeout(to);
      if (e instanceof ApiError || attempt >= retries) throw e;
      await new Promise((r) => setTimeout(r, 600 * 2 ** attempt)); // retry/backoff for safe GETs only
    }
  }
}

export const api = {
  health: () => request('GET', '/health', null, { timeout: 8000, retries: 0 }),
  ready: () => request('GET', '/ready', null, { timeout: 8000 }),
  meta: () => request('GET', '/v1/meta'),
  grades: () => request('GET', '/v1/grades'),
  recipe: (g, cap, vt) => request('GET', `/v1/recipes/${encodeURIComponent(g)}?capacity_t=${cap}&vessel_type=${vt}`),
  demoHeats: () => request('GET', '/v1/demo-heats'),
  run: (req) => request('POST', '/v1/simulations/run', req).then(checkRun),
  runDemo: (id, unc = 4) => request('POST', `/v1/simulations/demo/${id}?uncertainty_samples=${unc}`).then(checkRun),
  getRun: (id) => request('GET', `/v1/simulations/${id}`),
  createHeat: (b) => request('POST', '/v1/heats', b),
  step: (heat_id, advance_s) => request('POST', '/v1/simulations/step', { heat_id, advance_s }),
  state: (id) => request('GET', `/v1/heats/${id}/state`),
  compare: (b) => request('POST', '/v1/scenarios/compare', b),
  scenarios: () => request('GET', '/v1/scenarios'),
  runScenario: (id) => request('POST', `/v1/scenarios/${id}/run`),
  reconcile: (b) => request('POST', '/v1/estimation/reconcile', b),
  mlCard: () => request('GET', '/v1/ml/model-card'),
  mlPredict: (b) => request('POST', '/v1/ml/predict', b),
  mlFit: () => request('POST', '/v1/ml/fit'),
  mlDrift: () => request('GET', '/v1/ml/drift'),
  mpc: (b) => request('POST', '/v1/mpc/recommend', b, { timeout: 300000 }),
  review: (id, b) => request('POST', `/v1/advisory/${id}/review`, b),
  audit: (heat) => request('GET', `/v1/audit/${encodeURIComponent(heat)}`),
  reportUrl: (run, fmt) => `${base}/v1/reports/${run}?format=${fmt}`,
  dictionary: () => request('GET', '/v1/data-dictionary'),
  thermo: (Cr, Ni, T) => request('GET', `/v1/thermo/explorer?Cr=${Cr}&Ni=${Ni}&T_C=${T}`),
  design: (d, m) => request('POST', `/v1/design/preview${m ? `?metal_mass_kg=${m}` : ''}`, d),
  connectors: () => request('GET', '/v1/connectors'),
};
