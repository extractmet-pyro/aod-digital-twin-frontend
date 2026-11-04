import { state } from '../state/store.js';
import { page, card, canvas, kpi, stageTimeline, spinner } from '../components/ui.js';
import { lineChart } from '../components/charts.js';
import { alarmList, alarmsFromRun } from '../components/alerts.js';
import { loadDemo } from '../state/actions.js';
import { createVesselScene, webglAvailable } from '../three/scene.js';
import { renderSchematic } from '../components/schematic.js';
import { fmt } from '../utils/format.js';
import { originBanner, noRun, defaultFrame } from './_common.js';

let scene = null;
export function dispose() { scene?.dispose(); scene = null; }

export function render() {
  const r = state.run;
  const demos = Object.entries(state.demoHeats).map(([id, d]) => `<button class="btn" data-demo="${id}">${id}</button>`).join('');
  if (!r) return { html: page('Overview', '', noRun(), demos), mount: bindDemo };
  const k = r.summary.kpis; const e = r.economics; const fm = r.summary.final_metal;
  const comp = Object.fromEntries(r.summary.compliance.map((c) => [c.element, c.status]));
  const cls = (el) => (comp[el] === 'within' ? 'ok' : comp[el] ? 'bad' : '');
  const kp = [
    kpi('Tap temperature', fmt(k.tap_T_C, 0), '°C', `target ${r.summary.compliance.find((c) => c.element === 'T_tap_C')?.target_wt} °C`, cls('T_tap_C')),
    kpi('Carbon', fmt(fm.wt.C, 4), 'wt%', 'endpoint', cls('C')),
    kpi('Chromium', fmt(fm.wt.Cr, 2), 'wt%', '', cls('Cr')),
    kpi('Nitrogen', fmt(fm.wt.N * 1e4, 0), 'ppm', '', cls('N')),
    kpi('Sulphur', fmt(fm.wt.S * 1e4, 0), 'ppm', '', cls('S')),
    kpi('Cr recovery', fmt(k.Cr_recovery_pct, 2), '%', `${fmt(k.Cr_in_final_slag_kg, 0)} kg Cr to slag`, 'hot'),
    kpi('Tapped steel', fmt(k.tapped_steel_t, 2), 't', `yield ${fmt(k.metallic_yield_pct, 1)} %`),
    kpi('O₂', fmt(k.O2_Nm3_per_t, 1), 'Nm³/t', `η→C ${fmt(k.O2_efficiency_to_C_pct, 0)} %`),
    kpi('Ar / N₂', `${fmt(k.Ar_Nm3_per_t, 1)} / ${fmt(k.N2_Nm3_per_t, 1)}`, 'Nm³/t'),
    kpi('FeSi75', fmt(k.additions_kg_per_t?.FeSi75 || 0, 1), 'kg/t'),
    kpi('Heat time', fmt(k.heat_duration_min, 1), 'min'),
    kpi('Cost', fmt(e.cost_per_t, 1), '/t', e.currency),
    kpi('CO₂', fmt(e.co2.per_t_steel_kg, 0), 'kg/t', 'scoped'),
    kpi('Closure', r.balance_residual.pass ? 'PASS' : 'FAIL', '', `elem ${r.balance_residual.element_max_relative.toExponential(1)} · E ${r.balance_residual.energy_MJ_per_t.toExponential(1)} MJ/t`, r.balance_residual.pass ? 'ok' : 'bad'),
  ].join('');
  const html = page('Operator Overview', `${r.heat_id} · ${r.grade_id} · ${r.summary.geometry.capacity_t} t ${r.summary.geometry.vessel_type}`,
    originBanner() + `<div class="kpis">${kp}</div>
    <div style="margin:12px 0">${stageTimeline(r)}</div>
    <div class="grid g-main">
      ${card('Bath chemistry & temperature trajectory', canvas('ov-main', 'tall'), { hint: 'solid = simulated · band = p10–p90 ensemble' })}
      ${card('AOD vessel (live 3D)', `<div class="vessel-wrap mini" id="ov-3d"></div>`, { hint: 'drag to orbit' })}
      ${card('Gas practice', canvas('ov-gas'))}
      ${card('Operator alarms', `<div style="max-height:250px;overflow:auto">${alarmList(alarmsFromRun(r))}</div>`)}
      ${card('Process schematic (mid-blow snapshot — scrub in Process Schematic view)', `<div class="svgbox">${renderSchematic(r, defaultFrame(r))}</div>`, { cls: 'spanall' })}
    </div>`, demos + spinner(state.busy.run));
  return { html, mount(root) {
    bindDemo(root);
    const S = r.series; const x = S.t_min; const u = r.uncertainty || {};
    lineChart(root.querySelector('#ov-main'), { x, y: { title: 'wt% (C ×10)' }, y2: { title: '°C' },
      bands: u.m_C ? [{ label: 'C ×10 p10–p90', lo: u.m_C.p10.map((v) => v * 10), hi: u.m_C.p90.map((v) => v * 10), color: '#E69F00', x: u.t_s.map((t) => t / 60) }, { label: 'T p10–p90', lo: u.T_metal_C.p10, hi: u.T_metal_C.p90, color: '#D55E00', axis: 'y2', x: u.t_s.map((t) => t / 60) }] : [],
      series: [{ label: 'C ×10 (wt%)', y: S.m_C.map((v) => v * 10), color: '#E69F00', width: 2.4 }, { label: 'Cr (wt%)', y: S.m_Cr, color: '#56B4E9' }, { label: 'Si ×10', y: S.m_Si.map((v) => v * 10), color: '#009E73' },
        { label: 'T metal (°C)', y: S.T_metal_C, color: '#D55E00', axis: 'y2', width: 2.2 }],
      marks: [{ label: 'measured samples', color: '#fff', points: r.summary.samples.map((s) => ({ x: s.t_sample_s / 60, y: s.metal_wt.C * 10 })) }] });
    lineChart(root.querySelector('#ov-gas'), { x, y: { title: 'Nm³/min' }, series: [{ label: 'O₂ side', y: S.O2_side_Nm3_min, color: '#56B4E9', stepped: true }, { label: 'O₂ top', y: S.O2_top_Nm3_min, color: '#0072B2', stepped: true },
      { label: 'Ar', y: S.Ar_Nm3_min, color: '#CC79A7', stepped: true }, { label: 'N₂', y: S.N2_Nm3_min, color: '#009E73', stepped: true }] });
    const el = root.querySelector('#ov-3d');
    if (webglAvailable()) { try { scene = createVesselScene(el, r, { mini: true, reducedMotion: state.settings.reducedMotion, frame: defaultFrame(r) }); } catch (e) { el.innerHTML = `<div class="svgbox">${renderSchematic(r)}</div>`; } }
    else el.innerHTML = `<div class="svgbox">${renderSchematic(r)}</div>`;
  } };
}
function bindDemo(root) { root.querySelectorAll('[data-demo]').forEach((b) => { b.onclick = () => loadDemo(b.dataset.demo); }); }
