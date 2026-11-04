import { esc } from '../utils/format.js';

export function toast(msg, kind = '') {
  const el = document.createElement('div');
  el.className = `toast ${kind}`; el.innerHTML = esc(msg);
  document.getElementById('toasts').appendChild(el);
  setTimeout(() => el.remove(), kind === 'bad' ? 9000 : 4500);
}

export function apiErrorText(e) {
  if (e?.body?.details && Array.isArray(e.body.details)) return `${e.body.message} ${e.body.details.map((d) => `${(d.loc || []).slice(1).join('.')}: ${d.msg}`).join('; ')}`;
  if (e?.status) return `HTTP ${e.status}: ${e.body?.message || e.message}`;
  return `Backend unreachable (${e?.message || e}). Check API URL in Settings and CORS allow-list.`;
}

/** Derive operator alarms from a run (quality and severity). */
export function alarmsFromRun(run) {
  if (!run) return [];
  const out = [];
  const s = run.summary;
  for (const c of s.compliance) {
    if (c.status !== 'within') out.push({ sev: c.element === 'T_tap_C' ? 'MED' : 'HIGH', q: 'SIMULATED', text: `${c.element} ${c.status} (final ${Number(c.final_wt).toPrecision(4)}, limits ${c.min_wt ?? '–'}…${c.max_wt ?? '–'})` });
  }
  if (!run.balance_residual.pass) out.push({ sev: 'HIGH', q: 'MODEL', text: 'Mass/energy closure outside threshold – results not trustworthy' });
  for (const w of run.warnings) out.push({ sev: 'MED', q: 'MODEL', text: w });
  const fr = run.series;
  const maxT = Math.max(...fr.T_metal_C);
  if (maxT > 1735) out.push({ sev: 'MED', q: 'SIMULATED', text: `Peak bath temperature ${maxT.toFixed(0)} °C – lining wear risk (demo envelope 1745 °C)` });
  const maxCr2O3 = Math.max(...fr.s_Cr2O3);
  if (maxCr2O3 > 30) out.push({ sev: 'LOW', q: 'SIMULATED', text: `Slag Cr2O3 peaked at ${maxCr2O3.toFixed(1)} % – heterogeneous (crusty) slag likely before reduction` });
  const solid = Math.max(...fr.slag_solid_fraction);
  if (solid > 0.05) out.push({ sev: 'LOW', q: 'SIMULATED', text: `Solid Cr2O3 fraction up to ${(100 * solid).toFixed(0)} % – reduction kinetics slowed` });
  if (run.data_origin?.includes('SYNTHETIC')) out.push({ sev: 'INFO', q: 'DEMO', text: 'Synthetic demonstration data – not plant validated' });
  return out;
}

export function alarmList(items) {
  if (!items.length) return '<div class="empty">No alarms</div>';
  return items.map((a) => `<div class="alarm"><span class="sev ${a.sev}">${a.sev}</span><span class="tag">${esc(a.q)}</span><span>${esc(a.text)}</span></div>`).join('');
}
