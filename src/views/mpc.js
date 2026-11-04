import { state } from '../state/store.js';
import { page, card, canvas, spinner, banner } from '../components/ui.js';
import { lineChart, scatter } from '../components/charts.js';
import { recCard } from '../components/mpcCard.js';
import { table } from '../components/tables.js';
import { review, runMPC } from '../state/actions.js';
import { esc } from '../utils/format.js';

const W = [['w_C', 1], ['w_Cr', 1], ['w_N', 0.6], ['w_S', 0.4], ['w_T', 1], ['w_Cr_loss', 0.5], ['w_cost', 0.6], ['w_time', 0.3], ['w_CO2', 0.05]];

export function render() {
  const rec = state.rec;
  const ctl = `<div class="form-grid">${W.map(([k, v]) => `<label class="f">${k}<input type="range" min="0" max="3" step="0.05" data-w="${k}" value="${state._w?.[k] ?? v}"><span class="mono" id="wv-${k}">${state._w?.[k] ?? v}</span></label>`).join('')}</div>
    <div class="form-grid" style="margin-top:8px"><label class="f">Decision time (min)<input type="number" id="mp-t" value="${state._mpt ?? 0}" step="1"></label><label class="f">Max evaluations<input type="number" id="mp-n" value="24"></label><label class="f">Robust samples<input type="number" id="mp-r" value="3"></label>
    <label class="f">Estimator σ_C (wt%, optional)<input type="number" id="mp-s" step="0.005" placeholder="from estimator"></label><label class="row"><input type="checkbox" id="mp-an" checked> analyzer OK</label><label class="row"><input type="checkbox" id="mp-fr" checked> data fresh</label></div>
    <div class="btns" style="margin-top:10px"><button class="btn primary" id="mp-go">Run MPC advisor</button>${spinner(state.busy.mpc, 'Optimising with the mechanistic model…')}</div>
    <div class="note" style="margin-top:6px">Shrinking-horizon MPC: the same physics model is branched at the decision time and optimised (SciPy Powell, bounded) over O₂ flow, dilution, stage-1 transition C, coolant threshold, FeSi sizing, reduction time and N₂/Ar choice (only if the grade permits N₂). Demonstration limits only.</div>`;
  const reviewUI = rec?.recommendation_id ? `<div class="btns" style="margin-top:10px"><span class="chip">You: <b>${esc(state.settings.operator)}</b> (${esc(state.settings.role)})</span>
     <button class="btn ok" id="rv-ap">Approve (simulation/advisory only)</button><button class="btn danger" id="rv-rj">Reject</button><button class="btn" id="rv-md">Modify & rerun…</button><input id="rv-c" placeholder="comment" style="min-width:200px"></div>
     ${rec.last_review?.rerun ? `<div class="note">Operator-modified rerun ${esc(rec.last_review.rerun.run_id)}: tap T ${rec.last_review.rerun.kpis.tap_T_C.toFixed(1)} °C, C ${rec.last_review.rerun.final_metal.wt.C.toFixed(4)} %.</div>` : ''}` : '';
  const html = page('MPC Advisor', 'bounded, explainable recommendations · human approval · no actuation path',
    banner('<b>ADVISORY ONLY.</b> Recommendations are never actuator commands. The public service has no write path to plant equipment; CLOSED_LOOP is disabled. All interlocks remain in the plant PLC/DCS/SIS.', 'red') +
    `<div class="grid g2">${card('Objective weights & constraints', ctl)}${card('Recommendation', recCard(rec) + reviewUI)}
      ${rec?.trajectories ? card('Current plan vs recommended: temperature & carbon', canvas('mp-tr', 'tall')) + card('Pareto front of evaluated candidates (cost vs quality penalty)', canvas('mp-par', 'tall')) : ''}
      ${rec?.alternatives?.length ? card('Alternative feasible options', table(rec.alternatives.map((a) => ({ ...a.u, gas: a.inert_gas_stages_2_3, J: a.objective, cost: a.cost_per_t, T: a.tap_T_C, C: a.C_wt, N: a.N_wt })),
        [{ key: 'O2_multiplier', label: 'O₂ ×' }, { key: 'inert_multiplier', label: 'inert ×' }, { key: 's1_transition_C_wt', label: 'S1→S2 C' }, { key: 'coolant_T_shift_K', label: 'coolant ΔT' }, { key: 'FeSi_factor', label: 'FeSi ×' }, { key: 'reduction_duration_s', label: 'red. s' }, { key: 'gas', label: 'S2/3 gas' }, { key: 'J', label: 'objective' }, { key: 'cost', label: 'cost/t' }, { key: 'T', label: 'tap T' }, { key: 'C' }, { key: 'N' }]), { cls: 'spanall' }) : ''}</div>`);
  return { html, mount(root) {
    state._w = state._w || Object.fromEntries(W);
    root.querySelectorAll('[data-w]').forEach((el) => { el.oninput = () => { state._w[el.dataset.w] = +el.value; root.querySelector(`#wv-${el.dataset.w}`).textContent = el.value; }; });
    root.querySelector('#mp-go').onclick = () => {
      state._mpt = +root.querySelector('#mp-t').value; const s = root.querySelector('#mp-s').value;
      runMPC({ weights: state._w, decision_time_s: 60 * state._mpt, max_evals: +root.querySelector('#mp-n').value, robust_samples: +root.querySelector('#mp-r').value,
        analyzer_ok: root.querySelector('#mp-an').checked, data_fresh: root.querySelector('#mp-fr').checked, ...(s ? { estimator_sigma_C_wt: +s } : {}) });
    };
    const c = () => root.querySelector('#rv-c')?.value || '';
    root.querySelector('#rv-ap')?.addEventListener('click', () => review('approve', { comment: c() }));
    root.querySelector('#rv-rj')?.addEventListener('click', () => review('reject', { comment: c() }));
    root.querySelector('#rv-md')?.addEventListener('click', () => {
      const v = prompt('Modified values as JSON, e.g. {"O2_multiplier":1.0,"coolant_T_shift_K":10}', '{"coolant_T_shift_K": 10}');
      if (!v) return; try { review('modify', { comment: c(), modified_values: JSON.parse(v) }); } catch { alert('invalid JSON'); }
    });
    if (rec?.trajectories) {
      const a = rec.trajectories.current_plan; const b = rec.trajectories.recommended;
      lineChart(root.querySelector('#mp-tr'), { y: { title: '°C' }, y2: { title: 'C wt%', log: true }, series: [{ label: 'T current plan', x: a.t_min, y: a.T, color: '#E69F00' }, { label: 'T recommended', x: b.t_min, y: b.T, color: '#E69F00', dash: [2, 2], width: 2.4 },
        { label: 'C current', x: a.t_min, y: a.C.map((v) => Math.max(v, 0.002)), color: '#56B4E9', axis: 'y2' }, { label: 'C recommended', x: b.t_min, y: b.C.map((v) => Math.max(v, 0.002)), color: '#56B4E9', axis: 'y2', dash: [2, 2], width: 2.4 }] });
      scatter(root.querySelector('#mp-par'), { xTitle: 'cost per t', yTitle: 'quality penalty', sets: [{ label: 'Pareto-optimal candidates', points: (rec.pareto || []).map((p) => ({ x: p.cost_per_t, y: p.quality_penalty })), color: '#E69F00', line: true, r: 5 }] });
    }
  } };
}
