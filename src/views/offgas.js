import { state } from '../state/store.js';
import { page, card, canvas } from '../components/ui.js';
import { doughnut, lineChart } from '../components/charts.js';
import { fmt } from '../utils/format.js';
import { originBanner, noRun } from './_common.js';

export function render() {
  const r = state.run;
  if (!r) return { html: page('Off-Gas', '', noRun()), mount() {} };
  const k = r.summary.kpis;
  const html = page('Off-Gas', 'vessel gas ≠ duct gas (air ingress + hood combustion) ≠ analyzer reading (transport delay + lag)', originBanner() +
    `<div class="row" style="margin-bottom:10px"><span class="chip">C removed (gas inventory) <b>${fmt(k.C_removed_kg, 1)} kg</b></span><span class="chip">CO <b>${fmt(k.CO_Nm3, 0)} Nm³</b></span><span class="chip">CO₂ <b>${fmt(k.CO2_Nm3, 0)} Nm³</b></span><span class="chip">O₂ to C <b>${fmt(k.O2_efficiency_to_C_pct, 1)} %</b></span><span class="chip">Normal ref <b>${r.normal_reference}</b></span></div>
    <div class="grid g2">${card('Vessel gas composition (vol %)', canvas('o-v'))}${card('Duct gas after air ingress (vol %)', canvas('o-d'))}
    ${card('Analyzer (delayed, lagged) vs duct CO', canvas('o-a'))}${card('Gas flows (Nm³/min) and off-gas temperature', canvas('o-f'))}
    ${card('Carbon removal rate from gas (kg/min)', canvas('o-c'))}${card('Where the injected oxygen went (heat total)', canvas('o-pie'))}</div>`);
  return { html, mount(root) {
    const S = r.series; const x = S.t_min;
    const comp = (p) => [['CO', '#E69F00'], ['CO2', '#D55E00'], ['O2', '#56B4E9'], ['N2', '#009E73'], ['Ar', '#CC79A7']].map(([g, c]) => ({ label: g, y: S[`${p}_${g}`], color: c }));
    lineChart(root.querySelector('#o-v'), { x, y: { title: 'vol %' }, series: comp('vg') });
    lineChart(root.querySelector('#o-d'), { x, y: { title: 'vol %' }, series: comp('duct') });
    lineChart(root.querySelector('#o-a'), { x, y: { title: 'vol %' }, series: [{ label: 'duct CO (true)', y: S.duct_CO, color: '#E69F00' }, { label: 'analyzer CO', y: S.an_CO, color: '#E69F00', dash: [5, 3] }, { label: 'duct CO₂', y: S.duct_CO2, color: '#D55E00' }, { label: 'analyzer CO₂', y: S.an_CO2, color: '#D55E00', dash: [5, 3] }] });
    lineChart(root.querySelector('#o-f'), { x, y: { title: 'Nm³/min' }, y2: { title: '°C' }, series: [{ label: 'vessel off-gas', y: S.offgas_vessel_Nm3_min, color: '#E69F00' }, { label: 'duct', y: S.offgas_duct_Nm3_min, color: '#56B4E9' }, { label: 'T exit', y: S.T_offgas_C, color: '#D55E00', axis: 'y2', dash: [3, 3] }] });
    lineChart(root.querySelector('#o-c'), { x, y: { title: 'kg C/min' }, series: [{ label: 'C in (CO + CO₂)', y: S.C_removal_gas_kg_min, color: '#E69F00' }] });
    const o = k.O_distribution_pct;
    doughnut(root.querySelector('#o-pie'), { labels: Object.keys(o).map((s) => `${s} ${fmt(o[s], 1)} %`), data: Object.values(o), colors: ['#E69F00', '#009E73', '#0072B2', '#CC79A7', '#D55E00', '#8fa1b5', '#56B4E9'] });
  } };
}
