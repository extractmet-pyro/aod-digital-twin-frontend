import { state } from '../state/store.js';
import { page, card, canvas, spinner, empty, banner } from '../components/ui.js';
import { barChart, lineChart } from '../components/charts.js';
import { table } from '../components/tables.js';
import { mlCard, mlPredict, reconcile } from '../state/actions.js';
import { esc, fmt } from '../utils/format.js';

export function render() {
  const rc = state.recon; const ml = state.ml; const mc = state.mlCard;
  const faults = `<div class="row"><label class="row"><input type="checkbox" id="f-an"> analyzer dropout 12–30 min</label><label class="row"><input type="checkbox" id="f-T"> immersion T missing</label>
    <label class="row"><input type="checkbox" id="f-st"> stale flow tags 20–25 min</label><label class="f">CO bias (% abs)<input type="number" id="f-b" value="0" style="width:70px"></label><label class="f">FeSi weight error (%)<input type="number" id="f-fe" value="0" style="width:70px"></label>
    <label class="f">assay delay (s)<input type="number" id="f-d" value="240" style="width:80px"></label><button class="btn blue" id="f-go">Run state estimation</button>${spinner(state.busy.recon)}</div>`;
  const recon = rc ? `${banner(`<b>Estimator mode: ${esc(rc.summary.mode)}</b> · ${esc(rc.summary.reasons.join(' · ') || 'all sensors healthy')} · data: ${esc(rc.data_origin)}`, rc.summary.mode === 'ADVISORY' ? 'blue' : 'red')}
      <div class="row" style="margin-bottom:8px">${Object.entries(rc.metrics).map(([k, v]) => `<span class="chip">${k} <b>${fmt(v, 4)}</b></span>`).join('')}</div>
      <div class="grid g2">${card('Carbon: truth vs physics-only vs EKF estimate (±1.645σ)', canvas('e-c', 'tall'))}${card('Temperature: truth vs physics-only vs estimate', canvas('e-T', 'tall'))}
      ${card('Latent parameters: decarb-rate multiplier b_C, heat-loss bias q', canvas('e-b'))}${card('Confidence & MPC gate', canvas('e-g'))}</div>
      <div class="note">Hidden-truth multipliers (synthetic): ${esc(JSON.stringify(rc.hidden_truth_multipliers))}. Lab assays applied at sample time when they arrive (rewind/replay). Reconciliation example χ² = ${fmt(rc.reconciliation_example.chi2, 3)} (crit ${fmt(rc.reconciliation_example.chi2_crit, 2)}), gross error: ${rc.reconciliation_example.gross_error}.</div>` : empty('Choose faults and run the estimator (backend).');
  const mlv = ml ? `${banner(`<b>${esc(ml.hybrid.status)}</b> · ${esc(ml.hybrid.reason)} · ${esc(ml.label)}`, ml.hybrid.status === 'HYBRID' ? 'blue' : '')}
      <div class="grid g2">${card('Endpoint: truth vs physics-only vs hybrid', table(Object.entries(ml.endpoint).map(([k, v]) => ({ model: k, ...v })), [{ key: 'model' }, { key: 'T_C', label: 'T (°C)' }, { key: 'C_wt', label: 'C' }, { key: 'Cr_wt', label: 'Cr' }, { key: 'N_wt', label: 'N' }, { key: 'Cr_slag_kg', label: 'Cr→slag kg' }]))}
      ${card('Parameter corrections (projected into conserved model parameters)', table(Object.entries(ml.hybrid.prediction?.corrections || {}).map(([p, c]) => ({ p, ...c, iv: c.interval_90.map((v) => v.toFixed(3)).join('–') })), [{ key: 'p', label: 'parameter' }, { key: 'multiplier' }, { key: 'iv', label: '90 % interval' }, { key: 'model' }, { key: 'skill_vs_mean', label: 'skill' }, { key: 'used', fmt: (v) => (v ? 'yes' : 'no (fallback)') }]) +
        `<div class="note">Novelty distance ${fmt(ml.hybrid.prediction?.novelty_distance, 2)} (threshold ${fmt(ml.hybrid.prediction?.novelty_threshold, 2)}) → ${ml.hybrid.prediction?.in_domain ? 'in domain' : 'OUT OF DOMAIN → physics-only'}</div>`)}
      ${card('Temperature trajectories', canvas('m-T'))}${card('Carbon trajectories', canvas('m-C'))}</div>` : empty('Run hybrid prediction for the selected demo heat.');
  const card2 = mc ? `${table(Object.entries(mc.metrics_live?.targets || {}).map(([k, v]) => ({ k, model: v.chosen_model, mae: v.test.MAE, rmse: v.test.RMSE, cov: v.test.coverage_90, skill: v.skill_vs_mean })), [{ key: 'k', label: 'label' }, { key: 'model' }, { key: 'mae', label: 'test MAE (log)' }, { key: 'rmse', label: 'RMSE' }, { key: 'cov', label: '90% coverage' }, { key: 'skill', label: 'skill vs mean' }])}
      ${canvas('m-imp')}<div class="note"><b>${esc(mc.label)}</b> · split: ${esc(mc.split)} · fallback: ${esc(mc.fallback)}</div>
      ${mc.offline_hybrid_evaluation ? table(Object.entries(mc.offline_hybrid_evaluation.endpoint_errors_on_test_heats).flatMap(([m, d]) => Object.entries(d).map(([q, v]) => ({ m, q, ...v }))), [{ key: 'm', label: 'model' }, { key: 'q', label: 'quantity' }, { key: 'MAE' }, { key: 'RMSE' }, { key: 'bias' }, { key: 'worst' }]) : ''}` : empty('Load model card.');
  const html = page('ML & Confidence', 'state estimation · sensor faults · hybrid residual model · uncertainty & novelty', `
    ${card('State estimation & sensor-fault injection (synthetic historian)', faults + `<div style="margin-top:10px">${recon}</div>`)}
    <div style="height:12px"></div>
    ${card('Hybrid physics + ML prediction (decision point: stage-1 assay arrival)', `<div class="btns" style="margin-bottom:8px"><button class="btn blue" id="m-go">Run hybrid prediction</button><button class="btn" id="m-card">Load model card</button>${spinner(state.busy.ml || state.busy.mlcard)}</div>${mlv}`)}
    <div style="height:12px"></div>${card('Model card (DEMO — NOT PLANT VALIDATED)', card2)}`);
  return { html, mount(root) {
    root.querySelector('#f-go').onclick = () => reconcile({
      ...(root.querySelector('#f-an').checked ? { analyzer_dropout: [720, 1800] } : {}), temperature_missing: root.querySelector('#f-T').checked,
      ...(root.querySelector('#f-st').checked ? { stale_flow_tags: [1200, 1500] } : {}), analyzer_bias_CO_pct: +root.querySelector('#f-b').value, fesi_weight_error_pct: +root.querySelector('#f-fe').value, assay_delay_s: +root.querySelector('#f-d').value });
    root.querySelector('#m-go').onclick = mlPredict; root.querySelector('#m-card').onclick = mlCard;
    if (rc) {
      const s = rc.series; const x = s.t_min;
      lineChart(root.querySelector('#e-c'), { x, y: { title: 'wt%', log: true, min: 0.003 }, bands: [{ label: 'estimate ±1.645σ', lo: s.C_est.map((v, i) => Math.max(0.003, v - 1.645 * s.C_sigma[i])), hi: s.C_est.map((v, i) => v + 1.645 * s.C_sigma[i]), color: '#56B4E9' }],
        series: [{ label: 'truth (hidden)', y: s.C_true, color: '#fff', width: 1.4 }, { label: 'physics only', y: s.C_phys, color: '#E69F00', dash: [6, 3] }, { label: 'EKF estimate', y: s.C_est, color: '#56B4E9', dash: [2, 2], width: 2.2 }],
        marks: [{ label: 'lab assay (at sample time)', color: '#ff5f5f', points: rc.assays.map((a) => ({ x: a.t_sample_s / 60, y: a.C })) }] });
      lineChart(root.querySelector('#e-T'), { x, y: { title: '°C' }, bands: [{ label: 'estimate ±1.645σ', lo: s.T_est.map((v, i) => v - 1.645 * s.T_sigma[i]), hi: s.T_est.map((v, i) => v + 1.645 * s.T_sigma[i]), color: '#D55E00' }],
        series: [{ label: 'truth', y: s.T_true, color: '#fff', width: 1.4 }, { label: 'physics only', y: s.T_phys, color: '#E69F00', dash: [6, 3] }, { label: 'estimate', y: s.T_est, color: '#D55E00', dash: [2, 2], width: 2.2 }],
        marks: [{ label: 'immersion T', color: '#ff5f5f', points: rc.temperatures.map((a) => ({ x: a.t_sample_s / 60, y: a.T_C })) }] });
      lineChart(root.querySelector('#e-b'), { x, y: { title: 'b_C' }, y2: { title: 'q (MW)' }, series: [{ label: 'b_C', y: s.b_C, color: '#56B4E9' }, { label: 'q heat-loss bias', y: s.q_MW, color: '#D55E00', axis: 'y2' }] });
      lineChart(root.querySelector('#e-g'), { x, y: { title: 'confidence', min: 0, max: 1.05 }, series: [{ label: 'confidence', y: s.confidence, color: '#009E73' }, { label: 'MPC gate open', y: s.mpc_gate.map((g) => (g === 'OPEN' ? 1 : 0)), color: '#F0E442', stepped: true }, { label: 'analyzer good', y: s.an_quality.map((g) => (g === 'GOOD' ? 0.5 : 0)), color: '#ff5f5f', stepped: true }] });
    }
    if (ml) {
      const t = ml.trajectories;
      lineChart(root.querySelector('#m-T'), { y: { title: '°C' }, series: [{ label: 'truth', x: t.truth.t_min, y: t.truth.T, color: '#fff' }, { label: 'physics only', x: t.physics_only.t_min, y: t.physics_only.T, color: '#E69F00', dash: [6, 3] }, { label: 'hybrid', x: t.hybrid.t_min, y: t.hybrid.T, color: '#56B4E9', dash: [2, 2], width: 2.2 }] });
      lineChart(root.querySelector('#m-C'), { y: { title: 'wt%', log: true, min: 0.003 }, series: [{ label: 'truth', x: t.truth.t_min, y: t.truth.C, color: '#fff' }, { label: 'physics only', x: t.physics_only.t_min, y: t.physics_only.C, color: '#E69F00', dash: [6, 3] }, { label: 'hybrid', x: t.hybrid.t_min, y: t.hybrid.C, color: '#56B4E9', dash: [2, 2] }] });
    }
    if (mc?.metrics_live) {
      const imp = mc.metrics_live.targets.ln_k_C_mult?.permutation_importance || [];
      barChart(root.querySelector('#m-imp'), { labels: imp.map((i) => i.feature), sets: [{ label: 'permutation importance (k_C)', data: imp.map((i) => i.importance), color: '#56B4E9' }], horizontal: true });
    }
  } };
}
