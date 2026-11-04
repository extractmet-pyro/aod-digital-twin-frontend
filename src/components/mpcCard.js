import { esc, fmt } from '../utils/format.js';

export function recCard(rec) {
  if (!rec) return '<div class="empty">Run the advisor to obtain a recommendation.</div>';
  const status = rec.status;
  const head = `<div class="row" style="margin-bottom:8px"><span class="chip">Status <b>${esc(status)}</b></span><span class="chip">Approval <b>${esc(rec.approval_status || '—')}</b></span>
    <span class="chip">advisory_only <b>${rec.advisory_only}</b></span><span class="chip">Confidence <b>${fmt(rec.confidence, 2)}</b></span><span class="chip">Expires <b>${esc((rec.expires_utc || '').replace('T', ' '))}</b></span></div>`;
  if (status === 'WITHHELD' || status === 'INFEASIBLE' || status === 'HEAT_FINISHED') {
    return head + `<div class="banner red"><b>${esc(status)}</b> ${esc((rec.gate?.reasons || []).join('; '))} ${esc(rec.fallback || '')}</div>` +
      (rec.active_constraints ? `<pre class="mono">${esc(JSON.stringify(rec.active_constraints, null, 1))}</pre>` : '');
  }
  const acts = (rec.proposed_actions || []).map((a) => `<div class="rec-action"><span>${esc(a.variable)} <span class="tag">${esc(a.units)}</span>${a.at_bound ? ' <span class="tag demo">at bound</span>' : ''}</span><span>${typeof a.current === 'number' ? fmt(a.current, 3) : esc(a.current)}</span><span class="arrow">→</span><span><b>${typeof a.proposed === 'number' ? fmt(a.proposed, 3) : esc(a.proposed)}</b></span></div>`).join('') || '<div class="note">No change proposed.</div>';
  const b = rec.expected_benefit || {};
  const pair = (k, d = 2, u = '') => b[k] ? `<tr><td class="txt">${k}</td><td>${fmt(b[k][0], d)}${u}</td><td>${fmt(b[k][1], d)}${u}</td></tr>` : '';
  return head + `
    <div class="note" style="margin-bottom:6px">${esc(rec.actuation)}. Requires role <b>${esc(rec.required_approval_role)}</b>. Limits: ${esc(rec.limits_label || '')}</div>
    <div class="rec-action" style="color:var(--muted)"><span>Decision variable</span><span>current</span><span></span><span>proposed</span></div>${acts}
    <div class="grid g2" style="margin-top:10px">
      <div class="tbl-wrap"><table class="t"><thead><tr><th>Predicted endpoint</th><th>current plan</th><th>recommended</th></tr></thead><tbody>
        ${pair('tap_T_C', 1, ' °C')}${pair('C_wt', 4)}${pair('N_wt', 4)}${pair('Cr_recovery_pct', 2)}${pair('Cr_to_slag_kg', 0)}${pair('O2_Nm3', 0)}${pair('Ar_Nm3', 0)}${pair('N2_Nm3', 0)}${pair('FeSi_kg', 0)}${pair('duration_min', 1)}${pair('objective', 3)}
        <tr><td class="txt">Δ cost / t</td><td colspan="2">${fmt(b.cost_per_t_delta, 2)} (negative = saving)</td></tr></tbody></table></div>
      <div><div class="note"><b>Reason codes</b></div>${(rec.reason_codes || []).map((r) => `<div class="alarm"><span class="sev LOW">${esc(r.code)}</span><span>${esc(r.text)}</span></div>`).join('')}
        <div class="note" style="margin-top:6px"><b>Trade-offs</b>: ${esc((rec.tradeoffs || []).join(' · '))}</div>
        <div class="note" style="margin-top:6px"><b>Active constraints</b>: ${esc((rec.active_constraints || []).map((c) => c.variable || c.constraint).join(', ') || 'none')}</div>
        <div class="note" style="margin-top:6px"><b>Uncertainty (p10–p90, recommended)</b>: ${esc(Object.entries(rec.uncertainty?.recommended?.intervals_p10_p90 || {}).map(([k, v]) => `${k} ${fmt(v[0], 3)}–${fmt(v[1], 3)}`).join(' · '))}</div>
        <div class="note"><b>P(violation)</b>: ${esc(Object.entries(rec.uncertainty?.recommended?.violation_probability || {}).map(([k, v]) => `${k} ${fmt(100 * v, 0)}%`).join(' · '))}</div></div>
    </div>`;
}
