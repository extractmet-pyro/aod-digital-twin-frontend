import { state } from '../state/store.js';
import { page, card, canvas, kpi } from '../components/ui.js';
import { barChart, lineChart } from '../components/charts.js';
import { fmt } from '../utils/format.js';
import { originBanner, noRun } from './_common.js';

export function render() {
  const r = state.run;
  if (!r) return { html: page('Heat Balance', '', noRun()), mount() {} };
  const e = r.summary.energy_closure; const hb = r.summary.heat_balance_MJ; const t = r.summary.kpis.tapped_steel_t;
  const html = page('Heat Balance', 'absolute-enthalpy balance (formation + sensible, 298 K reference) · coupled conduction / convection / radiation', originBanner() +
    `<div class="kpis">${kpi('Energy residual', e.residual_MJ.toExponential(2), 'MJ', `${e.residual_MJ_per_t.toExponential(1)} MJ/t (no normalisation)`, Math.abs(e.residual_MJ_per_t) < 0.5 ? 'ok' : 'bad')}
      ${kpi('C oxidation heat', fmt(hb.C_oxidation, 0), 'MJ', `${fmt(hb.C_oxidation / t, 1)} MJ/t`, 'hot')}${kpi('Cr oxidation heat', fmt(hb.Cr_oxidation, 0), 'MJ', '', 'hot')}${kpi('Si/Mn/Fe oxidation', fmt(hb.Si_oxidation + hb.Mn_oxidation + hb.Fe_oxidation, 0), 'MJ')}
      ${kpi('Lining storage', fmt(-hb.lining_hotface, 0), 'MJ', 'into refractory')}${kpi('Shell loss', fmt(e.E_shell_loss_MJ, 0), 'MJ', 'convection + radiation')}${kpi('Mouth radiation', fmt(e.E_mouth_radiation_MJ, 0), 'MJ')}${kpi('Off-gas sensible', fmt(-hb.offgas_sensible_out, 0), 'MJ')}</div>
    <div class="grid g2" style="margin-top:12px">
      ${card('Integrated heat sources (+) and sinks (−), MJ', canvas('h-bar', 'tall'))}${card('Heat flows vs time (MW)', canvas('h-flow', 'tall'))}
      ${card('Refractory lining temperature profile at tap (°C)', canvas('h-prof'))}${card('Hot face, shell temperature & refractory wear proxy', canvas('h-lin'))}
      ${card('Metal–slag exchange & post-combustion to slag (MW)', canvas('h-ms'))}${card('System enthalpy account (MJ)', `<div class="kv">${Object.entries(e).filter(([, v]) => typeof v === 'number').map(([k, v]) => `<span class="k">${k}</span><span class="v">${fmt(v, 3)}</span>`).join('')}</div><div class="note" style="margin-top:6px">${e.basis}. Residual = E_end − E_start − additions + off-gas + shell + mouth + deslag. Temperatures obtained by exact inversion of H(T); no hidden normalisation.</div>`)}
    </div>`);
  return { html, mount(root) {
    const ks = Object.keys(hb).sort((a, b) => hb[b] - hb[a]);
    barChart(root.querySelector('#h-bar'), { labels: ks, sets: [{ label: 'MJ', data: ks.map((k) => hb[k]), colors: ks.map((k) => (hb[k] >= 0 ? '#E69F00' : '#56B4E9')) }], horizontal: true, legend: false, y: { title: 'MJ' } });
    const S = r.series; const x = S.t_min;
    lineChart(root.querySelector('#h-flow'), { x, y: { title: 'MW' }, series: [['q_C_oxidation_MW', 'C oxidation', '#E69F00'], ['q_Cr_oxidation_MW', 'Cr oxidation', '#D55E00'], ['q_Si_oxidation_MW', 'Si oxidation', '#009E73'], ['q_Mn_oxidation_MW', 'Mn oxidation', '#CC79A7'],
      ['q_Cr2O3_reduction_C_MW', 'Cr₂O₃ + C (endo)', '#F0E442'], ['q_reductions_Si_Al_MW', 'FeSi reductions', '#0072B2'], ['q_inert_gas_heating_MW', 'inert gas heating', '#BBBBBB'], ['q_lining_hotface_MW', 'to lining', '#56B4E9'], ['q_mouth_radiation_MW', 'mouth radiation', '#ff5f5f'], ['q_shell_loss_MW', 'shell loss', '#9be564']].map(([k, l, c]) => ({ label: l, y: S[k], color: c })) });
    const p = r.summary.lining_profile;
    lineChart(root.querySelector('#h-prof'), { x: p.r_m.map((v) => v * 1000), xTitle: 'distance from hot face (mm)', y: { title: '°C' }, series: [{ label: 'lining T at tap', y: p.T_C, color: '#D55E00', points: true }] });
    lineChart(root.querySelector('#h-lin'), { x, y: { title: '°C' }, y2: { title: 'mm' }, series: [{ label: 'hot face', y: S.T_hotface_C, color: '#D55E00' }, { label: 'shell', y: S.T_shell_C, color: '#009E73' }, { label: 'wear (cum., proxy)', y: S.wear_cum_mm, color: '#CC79A7', axis: 'y2' }] });
    lineChart(root.querySelector('#h-ms'), { x, y: { title: 'MW' }, series: [{ label: 'metal → slag', y: S.Q_metal_slag_MW, color: '#E69F00' }, { label: 'post-combustion → slag', y: S.q_post_combustion_to_slag_MW, color: '#56B4E9' }] });
  } };
}
