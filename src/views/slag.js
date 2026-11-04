import { state } from '../state/store.js';
import { page, card, canvas } from '../components/ui.js';
import { lineChart } from '../components/charts.js';
import { originBanner, noRun } from './_common.js';

export function render() {
  const r = state.run;
  if (!r) return { html: page('Slag & Recovery', '', noRun()), mount() {} };
  const html = page('Slag Engineering & Chromium Recovery', 'oxide inventory, basicity, Cr₂O₃ saturation, viscosity, desulphurisation', originBanner() +
    `<div class="grid g2">${card('Slag composition (wt%, stacked)', canvas('s-comp', 'tall'))}${card('Basicity definitions & optical basicity', canvas('s-bas', 'tall'))}
    ${card('Cr₂O₃ vs liquid-slag solubility (proxy) & solid fraction', canvas('s-sat'))}${card('Chromium: in slag (kg), recovery (%)', canvas('s-cr'))}
    ${card('Slag viscosity (Riboud) & foaming index', canvas('s-visc'))}${card('Desulphurisation: L_S and [S]', canvas('s-s'))}</div>`);
  return { html, mount(root) {
    const S = r.series; const x = S.t_min;
    lineChart(root.querySelector('#s-comp'), { x, y: { title: 'wt%', min: 0, max: 100 }, series: [['s_CaO', 'CaO', '#F0E442'], ['s_SiO2', 'SiO₂', '#56B4E9'], ['s_Cr2O3', 'Cr₂O₃', '#009E73'], ['s_MgO', 'MgO', '#CC79A7'], ['s_Al2O3', 'Al₂O₃', '#0072B2'], ['s_FeO', 'FeO', '#D55E00'], ['s_MnO', 'MnO', '#E69F00'], ['s_CaF2', 'CaF₂', '#BBBBBB']]
      .map(([k, l, c], i, arr) => ({ label: l, y: S[k].map((_, j) => arr.slice(0, i + 1).reduce((s, a) => s + S[a[0]][j], 0)), color: c, fill: i === 0 ? 'origin' : '-1' })) });
    lineChart(root.querySelector('#s-bas'), { x, y: { title: 'mass ratio' }, y2: { title: 'Λ' }, series: [{ label: 'B₂ CaO/SiO₂', y: S.B2.map((v) => Math.min(v, 6)), color: '#E69F00', width: 2.2 }, { label: 'B₃ (CaO+MgO)/SiO₂', y: S.B3.map((v) => Math.min(v, 6)), color: '#CC79A7' }, { label: 'B₄ (CaO+MgO)/(SiO₂+Al₂O₃)', y: S.B4.map((v) => Math.min(v, 6)), color: '#56B4E9' }, { label: 'optical basicity Λ', y: S.optical_basicity, color: '#fff', axis: 'y2', dash: [3, 3] }] });
    lineChart(root.querySelector('#s-sat'), { x, y: { title: 'wt%' }, y2: { title: 'solid fraction' }, series: [{ label: 'Cr₂O₃ in slag', y: S.s_Cr2O3, color: '#009E73', width: 2.2 }, { label: 'solubility proxy', y: S.Cr2O3_solubility_wt, color: '#8fa1b5', dash: [4, 3] }, { label: 'solid fraction', y: S.slag_solid_fraction, color: '#ff5f5f', axis: 'y2' }] });
    lineChart(root.querySelector('#s-cr'), { x, y: { title: 'kg' }, y2: { title: '%' }, series: [{ label: 'Cr in slag (kg)', y: S.Cr_slag_kg, color: '#009E73' }, { label: 'Cr recovery to metal (%)', y: S.Cr_recovery_pct, color: '#56B4E9', axis: 'y2' }] });
    lineChart(root.querySelector('#s-visc'), { x, y: { title: 'Pa·s', log: true }, y2: { title: 'index' }, series: [{ label: 'viscosity', y: S.slag_viscosity_Pa_s.map((v) => (v ? Math.min(Math.max(v, 1e-3), 50) : null)), color: '#E69F00' }, { label: 'foaming index (proxy)', y: S.foaming_index, color: '#CC79A7', axis: 'y2' }] });
    lineChart(root.querySelector('#s-s'), { x, y: { title: 'L_S', log: true }, y2: { title: 'ppm' }, series: [{ label: 'L_S = (S)/[S]', y: S.L_S.map((v) => Math.max(v, 0.01)), color: '#56B4E9' }, { label: '[S] ppm', y: S.m_S.map((v) => v * 1e4), color: '#F0E442', axis: 'y2' }] });
  } };
}
