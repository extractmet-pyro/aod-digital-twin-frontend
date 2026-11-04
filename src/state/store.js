// Minimal observable store
const listeners = new Set();
export const state = {
  view: 'overview', backend: { online: false, checked: false, ready: null, lastOk: null },
  meta: null, grades: [], demoHeats: {}, scenarios: {},
  run: null, runOrigin: null, runAlt: null, compare: null, rec: null, recon: null, ml: null, mlCard: null, design: null, thermo: null, audit: null,
  frameIdx: null, busy: {}, settings: { mode: 'SIMULATION', role: 'shift_supervisor', operator: 'operator-1', temp: 'C', comp: 'wt', theme: 'dark', reducedMotion: false },
  draft: null,
};
export function set(patch) { Object.assign(state, patch); listeners.forEach((f) => f(state, patch)); }
export function subscribe(f) { listeners.add(f); return () => listeners.delete(f); }
export function busy(key, v) { state.busy = { ...state.busy, [key]: v }; listeners.forEach((f) => f(state, { busy: state.busy })); }
