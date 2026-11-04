import { state } from '../state/store.js';
import { banner, empty } from '../components/ui.js';
export const S = () => state.run.series;
export const X = () => state.run.series.t_min;
export function originBanner() {
  const r = state.run;
  if (!r) return '';
  const off = state.runOrigin === 'OFFLINE FIXTURE';
  return banner(`<b>${off ? 'OFFLINE DEMO FIXTURE' : 'SYNTHETIC SIMULATION'}</b> · ${r.quality} · run ${r.run_id} · ${r.label || ''} ${off ? '· Backend not reachable: start the API (see Settings) to run new heats.' : ''}`, off ? '' : 'blue');
}
export const noRun = () => empty('No run loaded. Load a demo heat from Overview or Charge & Recipe.');
export function targetBand(el) {
  const g = state.grades.find((x) => x.grade_id === state.run.grade_id);
  if (!g) return null;
  const lim = g.limits_wt[el]; const n = X().length;
  if (!lim) return null;
  return { lo: lim[0] ?? 0, hi: lim[1], target: g.targets_wt[el], n };
}

/** Screenshot-friendly default frame: ~12 min into the blow (decarb), else the last frame. */
export function defaultFrame(r) {
  const S = r.series; const i = S.t_min.findIndex((t, k) => t >= 12 && S.stage_kind[k] === 'decarb');
  return i >= 0 ? i : S.t_s.length - 1;
}
