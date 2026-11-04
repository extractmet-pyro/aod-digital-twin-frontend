import { api } from '../api/client.js';
import { apiErrorText, toast } from '../components/alerts.js';
import demoRun from '../fixtures/demo-run.json';
import metaFix from '../fixtures/meta.json';
import { busy, set, state } from './store.js';

export function loadSettings() {
  try { const s = JSON.parse(localStorage.getItem('aod.settings') || '{}'); set({ settings: { ...state.settings, ...s } }); } catch { /* storage blocked */ }
  document.documentElement.dataset.theme = state.settings.theme;
}
export function saveSettings(patch) {
  const s = { ...state.settings, ...patch };
  set({ settings: s });
  try { localStorage.setItem('aod.settings', JSON.stringify(s)); } catch { /* ignore */ }
  document.documentElement.dataset.theme = s.theme;
}

export function draftFromDemo(id) {
  const d = (state.demoHeats[id] || metaFix.demo_heats[id]);
  return { grade_id: d.grade_id, mode: state.settings.mode, charge: structuredClone(d.charge), design: structuredClone(d.design), recipe: null,
    params: {}, dt_s: 2, output_interval_s: 10, uncertainty_samples: 4, extra_additions: [], prices: {}, label: d.title, demo_id: id };
}

export function requestFromDraft(dr = state.draft) {
  const { demo_id, ...req } = dr;
  req.mode = state.settings.mode;
  if (!req.recipe) delete req.recipe;
  return req;
}

export async function checkBackend() {
  try {
    await api.health();
    const first = !state.backend.online;
    set({ backend: { ...state.backend, online: true, checked: true, lastOk: Date.now() } });
    if (first) {
      api.ready().then((r) => set({ backend: { ...state.backend, ready: r } })).catch(() => {});
      api.grades().then((g) => set({ grades: g.grades })).catch(() => {});
      api.demoHeats().then((d) => set({ demoHeats: d.heats, scenarios: d.scenarios })).catch(() => {});
      api.meta().then((m) => set({ meta: m })).catch(() => {});
    }
  } catch {
    set({ backend: { ...state.backend, online: false, checked: true } });
  }
}

export function initOffline() {
  set({ grades: metaFix.grades, demoHeats: metaFix.demo_heats, scenarios: metaFix.scenarios, run: demoRun, runOrigin: 'OFFLINE FIXTURE', draft: draftFromDemo('DEMO-A-304L') });
}

async function guarded(key, fn, okMsg) {
  if (!state.backend.online) { toast('Backend offline – showing bundled synthetic fixture. Start the API or set its URL in Settings.', 'warn'); return null; }
  busy(key, true);
  try { const r = await fn(); if (okMsg) toast(okMsg, 'ok'); return r; }
  catch (e) { toast(apiErrorText(e), 'bad'); return null; }
  finally { busy(key, false); }
}

export async function runDraft(label) {
  const req = requestFromDraft();
  if (label) req.label = label;
  const r = await guarded('run', () => api.run(req), 'Simulation complete');
  if (r) set({ run: r, runOrigin: 'BACKEND', frameIdx: null });
  return r;
}

export async function loadDemo(id) {
  set({ draft: draftFromDemo(id) });
  const r = await guarded('run', () => api.runDemo(id, 4), `Demo heat ${id} simulated`);
  if (r) set({ run: r, runOrigin: 'BACKEND', frameIdx: null });
}

export async function fetchDefaultRecipe() {
  const d = state.draft;
  const r = await guarded('recipe', () => api.recipe(d.grade_id, d.charge.metal_mass_kg / 1000, d.design.vessel_type || 'AOD'));
  if (r) set({ draft: { ...d, recipe: r.recipe } });
}

export async function runMPC(opts) {
  const base = { ...requestFromDraft(), uncertainty_samples: 0 };
  const r = await guarded('mpc', () => api.mpc({ base, ...opts }), 'Advisor finished (advisory only – no actuation)');
  if (r) set({ rec: r });
}

export async function review(action, extra = {}) {
  const rid = state.rec?.recommendation_id;
  if (!rid) return;
  const r = await guarded('review', () => api.review(rid, { action, operator: state.settings.operator, role: state.settings.role, ...extra }), `Recommendation ${action}: logged to audit trail`);
  if (r) {
    set({ rec: { ...state.rec, approval_status: r.approval_status, last_review: r } });
    loadAudit(state.rec.heat_id);
  }
}

export async function loadAudit(heat) { const a = await guarded('audit', () => api.audit(heat)); if (a) set({ audit: a }); }
export async function reconcile(faults) { const r = await guarded('recon', () => api.reconcile({ demo_heat: state.draft?.demo_id || 'DEMO-A-304L', faults }), 'State estimation complete'); if (r) set({ recon: r }); }
export async function mlPredict() { const r = await guarded('ml', () => api.mlPredict({ demo_heat: state.draft?.demo_id || 'DEMO-A-304L' })); if (r) set({ ml: r }); }
export async function mlCard() { const r = await guarded('mlcard', () => api.mlCard()); if (r) set({ mlCard: r }); }
export async function compare(variants) {
  const base = { ...requestFromDraft(), uncertainty_samples: 0 };
  const r = await guarded('compare', () => api.compare({ base, variants }), 'Scenario comparison complete');
  if (r) set({ compare: r });
}
export async function runScenario(id) { const r = await guarded('scenario', () => api.runScenario(id), `Scenario ${id} complete`); if (r) set({ run: r, runOrigin: 'BACKEND (scenario)' }); }
export async function previewDesign(d) { const r = await guarded('design', () => api.design(d, state.draft?.charge?.metal_mass_kg)); if (r) set({ design: r }); }
export async function loadThermo(Cr, Ni, T) { const r = await guarded('thermo', () => api.thermo(Cr, Ni, T)); if (r) set({ thermo: r }); }
