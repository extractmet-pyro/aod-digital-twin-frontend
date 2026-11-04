import { state } from '../state/store.js';
import { page, card, canvas, stageTimeline } from '../components/ui.js';
import { lineChart } from '../components/charts.js';
import { originBanner, noRun, targetBand } from './_common.js';

export function render() {
  const r = state.run;
  if (!r) return { html: page('Trends', '', noRun()), mount() {} };
  const html = page('Live / Replay Trends', 'every quantity vs process time · target bands from the configured grade', originBanner() +
    `<div class="legend-enc" style="margin-bottom:8px"><span class="sim">simulated</span><span class="est">target / limit</span><span class="meas">measured sample (synthetic)</span><span class="fc">equilibrium / derived</span></div>
    <div style="margin-bottom:12px">${stageTimeline(r)}</div>
    <div class="grid g2">
      ${card('Carbon (wt%, log) with equilibrium C_eq', canvas('t-c'))}${card('Chromium (wt%) with grade window', canvas('t-cr'))}
      ${card('Si · Mn · Ni · Mo (wt%)', canvas('t-alloy'))}${card('Nitrogen & sulphur (ppm) with N_eq', canvas('t-ns'))}
      ${card('Temperatures: metal, slag, hot face, shell, off-gas, critical T', canvas('t-T', 'tall'))}${card('Gas flows & O₂:inert ratio', canvas('t-flow', 'tall'))}
      ${card('pCO in bubbles, plume pressure, pN₂', canvas('t-p'))}${card('Decarburisation: dC/dt, O₂ efficiency to C, Cr oxidation', canvas('t-dc'))}
      ${card('Oxygen distribution among C / Cr / Si / Mn / Fe', canvas('t-os'))}${card('Stirring power & mixing time', canvas('t-stir'))}
      ${card('Interfacial & bulk oxygen activity', canvas('t-ao'))}${card('Metal & slag weights, bath depth', canvas('t-w'))}
    </div>`);
  return { html, mount(root) {
    const S = r.series; const x = S.t_min; const u = r.uncertainty || {}; const ux = (u.t_s || []).map((t) => t / 60);
    const sm = r.summary.samples;
    const tb = (el) => targetBand(el);
    const cB = tb('C');
    lineChart(root.querySelector('#t-c'), { x, y: { title: 'wt%', log: true, min: 0.002 }, series: [{ label: 'C', y: S.m_C, color: '#E69F00', width: 2.4 }, { label: 'C_eq (Cr–Cr₂O₃–CO)', y: S.C_eq_wt.map((v) => Math.max(v, 0.002)), color: '#8fa1b5', dash: [2, 3] }],
      bands: u.m_C ? [{ label: 'C p10–p90', lo: u.m_C.p10.map((v) => Math.max(v, 0.002)), hi: u.m_C.p90, color: '#E69F00', x: ux }] : [],
      hlines: cB ? [{ y: cB.hi, label: 'C max', color: '#ff5f5f' }] : [], marks: [{ label: 'sample C', color: '#fff', points: sm.map((s) => ({ x: s.t_sample_s / 60, y: Math.max(s.metal_wt.C, 0.002) })) }] });
    const crB = tb('Cr');
    lineChart(root.querySelector('#t-cr'), { x, y: { title: 'wt%' }, series: [{ label: 'Cr', y: S.m_Cr, color: '#56B4E9', width: 2.2 }], bands: [...(u.m_Cr ? [{ label: 'Cr p10–p90', lo: u.m_Cr.p10, hi: u.m_Cr.p90, color: '#56B4E9', x: ux }] : []), ...(crB ? [{ label: 'grade window', lo: x.map(() => crB.lo), hi: x.map(() => crB.hi), color: '#009E73' }] : [])] });
    lineChart(root.querySelector('#t-alloy'), { x, y: { title: 'wt%' }, series: [{ label: 'Si', y: S.m_Si, color: '#009E73' }, { label: 'Mn', y: S.m_Mn, color: '#CC79A7' }, { label: 'Ni ÷10', y: S.m_Ni.map((v) => v / 10), color: '#F0E442' }, { label: 'Mo', y: S.m_Mo, color: '#0072B2' }] });
    const nB = tb('N');
    lineChart(root.querySelector('#t-ns'), { x, y: { title: 'ppm' }, series: [{ label: 'N', y: S.m_N.map((v) => v * 1e4), color: '#009E73', width: 2.2 }, { label: 'N_eq (Sieverts, bubble pN₂)', y: S.N_eq_wt.map((v) => v * 1e4), color: '#009E73', dash: [2, 3] }, { label: 'S', y: S.m_S.map((v) => v * 1e4), color: '#F0E442' }],
      hlines: nB?.hi ? [{ y: nB.hi * 1e4, label: 'N max', color: '#ff5f5f' }] : [] });
    lineChart(root.querySelector('#t-T'), { x, y: { title: '°C' }, series: [{ label: 'metal', y: S.T_metal_C, color: '#D55E00', width: 2.4 }, { label: 'slag', y: S.T_slag_C, color: '#E69F00' }, { label: 'lining hot face', y: S.T_hotface_C, color: '#CC79A7' },
      { label: 'off-gas exit', y: S.T_offgas_C, color: '#8fa1b5', dash: [4, 3] }, { label: 'C–Cr critical T', y: S.T_critical_C, color: '#56B4E9', dash: [2, 3] }, { label: 'shell ×5', y: S.T_shell_C.map((v) => v * 5), color: '#009E73', dash: [6, 3] }],
      bands: u.T_metal_C ? [{ label: 'T p10–p90', lo: u.T_metal_C.p10, hi: u.T_metal_C.p90, color: '#D55E00', x: ux }] : [], marks: [{ label: 'immersion T (sample)', color: '#fff', points: sm.map((s) => ({ x: s.t_sample_s / 60, y: s.T_C })) }] });
    lineChart(root.querySelector('#t-flow'), { x, y: { title: 'Nm³/min' }, y2: { title: 'O₂ : inert' }, series: [{ label: 'O₂ side', y: S.O2_side_Nm3_min, color: '#56B4E9', stepped: true }, { label: 'O₂ top', y: S.O2_top_Nm3_min, color: '#0072B2', stepped: true }, { label: 'Ar', y: S.Ar_Nm3_min, color: '#CC79A7', stepped: true }, { label: 'N₂', y: S.N2_Nm3_min, color: '#009E73', stepped: true }, { label: 'O₂:inert', y: S.O2_to_inert.map((v) => Math.min(v, 6)), color: '#fff', axis: 'y2', dash: [3, 3] }] });
    lineChart(root.querySelector('#t-p'), { x, y: { title: 'atm' }, series: [{ label: 'pCO (bubble mean)', y: S.pCO_atm, color: '#E69F00' }, { label: 'plume pressure', y: S.P_plume_atm, color: '#8fa1b5' }, { label: 'pN₂', y: S.pN2_atm, color: '#009E73' }] });
    lineChart(root.querySelector('#t-dc'), { x, y: { title: '%/min · –' }, y2: { title: 'kg Cr/min' }, series: [{ label: '−dC/dt (%/min)', y: S.dC_dt_pct_min.map((v) => -v), color: '#E69F00' }, { label: 'η O₂→C', y: S.eta_C_O2, color: '#56B4E9' }, { label: 'Cr oxidation', y: S.Cr_ox_kg_min, color: '#D55E00', axis: 'y2' }, { label: 'Cr reduction', y: S.Cr_red_kg_min, color: '#009E73', axis: 'y2' }] });
    lineChart(root.querySelector('#t-os'), { x, y: { title: 'share of injected O', min: 0, max: 1 }, series: [['C', '#E69F00'], ['Cr', '#D55E00'], ['Si', '#009E73'], ['Mn', '#CC79A7'], ['Fe', '#8fa1b5']].map(([k, c]) => ({ label: k, y: S[`O_share_${k}`], color: c, fill: true })) });
    lineChart(root.querySelector('#t-stir'), { x, y: { title: 'kW/t' }, y2: { title: 'mixing time (s)' }, series: [{ label: 'stirring power', y: S.stirring_W_t.map((v) => v / 1000), color: '#56B4E9' }, { label: 'mixing time', y: S.mixing_time_s.map((v) => Math.min(v, 300)), color: '#E69F00', axis: 'y2' }] });
    lineChart(root.querySelector('#t-ao'), { x, y: { title: 'a_O (1 wt% std)', log: true }, series: [{ label: 'interface a_O*', y: S.a_O_interface.map((v) => Math.max(v, 1e-5)), color: '#D55E00' }, { label: 'bulk a_O (controlling couple)', y: S.a_O_bulk.map((v) => Math.max(v, 1e-5)), color: '#56B4E9' }] });
    lineChart(root.querySelector('#t-w'), { x, y: { title: 't' }, y2: { title: 'm' }, series: [{ label: 'metal (t)', y: S.metal_kg.map((v) => v / 1000), color: '#D55E00' }, { label: 'slag ×10 (t)', y: S.slag_kg.map((v) => v / 100), color: '#E69F00' }, { label: 'bath depth', y: S.bath_depth_m, color: '#56B4E9', axis: 'y2' }] });
  } };
}
