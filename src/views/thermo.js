import { state } from '../state/store.js';
import { page, card, canvas, spinner, empty } from '../components/ui.js';
import { lineChart, PAL } from '../components/charts.js';
import { table } from '../components/tables.js';
import { loadThermo } from '../state/actions.js';
import { fmt } from '../utils/format.js';

export function render() {
  const t = state.thermo; const reactions = state.meta?.reactions || [];
  const html = page('Thermochemistry Explorer', 'Hilty-type C–Cr equilibrium, critical temperature, N solubility, reaction registry',
    `<div class="row" style="margin-bottom:10px"><label class="f">Cr (wt%)<input type="number" id="th-cr" value="18"></label><label class="f">Ni (wt%)<input type="number" id="th-ni" value="8"></label><label class="f">T for N (°C)<input type="number" id="th-T" value="1700"></label><button class="btn blue" id="th-go">Compute</button>${spinner(state.busy.thermo)}</div>
    ${t ? `<div class="grid g3">${card('Equilibrium [C] vs pCO (a_Cr₂O₃ = 1)', canvas('th-c', 'tall'))}${card('C–Cr critical temperature vs [C]', canvas('th-crit', 'tall'))}${card('Nitrogen solubility vs pN₂ (Sieverts)', canvas('th-n', 'tall'))}</div>
      ${card('ΔG° at selected T (J/mol)', `<div class="kv">${Object.entries(t.summary_at_T).filter(([, v]) => typeof v === 'number').map(([k, v]) => `<span class="k">${k}</span><span class="v">${fmt(v, 0)}</span>`).join('')}</div><div class="note">${t.label}</div>`)}` : empty('Press Compute (backend required).')}
    ${card('Reaction registry (balanced stoichiometry, unit-tested)', reactions.length ? table(reactions, [{ key: 'id' }, { key: 'equation', txt: true }, { key: 'domain', txt: true }, { key: 'representation', txt: true }, { key: 'extent_units', txt: true }]) : empty('Load /v1/meta (backend) to show the registry.'))}`);
  return { html, mount(root) {
    root.querySelector('#th-go').onclick = () => loadThermo(+root.querySelector('#th-cr').value, +root.querySelector('#th-ni').value, +root.querySelector('#th-T').value);
    if (!t) return;
    lineChart(root.querySelector('#th-c'), { x: t.pCO_atm, xTitle: 'pCO (atm)', y: { title: '[C]_eq wt%', log: true }, series: t.carbon_equilibrium.map((c, i) => ({ label: `${c.T_C} °C`, y: c.C_eq_wt, color: PAL[i], points: true })) });
    lineChart(root.querySelector('#th-crit'), { x: t.C_wt_grid, xTitle: '[C] wt%', y: { title: 'T critical (°C)' }, series: Object.entries(t.critical_T_C).map(([p, v], i) => ({ label: `pCO ${p} atm`, y: v, color: PAL[i], points: true })) });
    lineChart(root.querySelector('#th-n'), { x: t.nitrogen_solubility.map((n) => n.pN2), xTitle: 'pN₂ (atm)', y: { title: '[N]_eq ppm' }, series: [{ label: '[N]_eq', y: t.nitrogen_solubility.map((n) => n.N_eq_wt * 1e4), color: '#009E73', points: true }] });
  } };
}
