import { state, set } from '../state/store.js';
import { page, card, canvas, kpi } from '../components/ui.js';
import { barChart, doughnut } from '../components/charts.js';
import { runDraft } from '../state/actions.js';
import { fmt } from '../utils/format.js';
import { originBanner, noRun } from './_common.js';

export function render() {
  const r = state.run;
  if (!r) return { html: page('Economics', '', noRun()), mount() {} };
  const e = r.economics; const P = e.prices_used;
  const keys = ['O2_per_Nm3', 'Ar_per_Nm3', 'N2_per_Nm3', 'lime', 'dolime', 'fluorspar', 'FeSi75', 'Al', 'FeCr_LC', 'Ni', 'FeMo', 'Mn_EL', 'SS_scrap', 'Cr_value_per_kg', 'time_value_per_min', 'CO2_price_per_t'];
  const html = page('Economics & CO₂', `${e.currency} · user-supplied tariffs (placeholders — no market data hard-coded)`, originBanner() +
    `<div class="kpis">${kpi('Total cost', fmt(e.total_cost, 0), e.currency.split(' ')[0])}${kpi('Cost per tonne', fmt(e.cost_per_t, 1), '/t', '', 'hot')}${kpi('Gas cost', fmt(e.gas_cost_per_t, 1), '/t')}${kpi('Materials', fmt(e.materials_cost_per_t, 1), '/t')}
      ${kpi('Cr loss value', fmt(e.Cr_loss_value, 0), '', 'Cr in final slag')}${kpi('Time cost', fmt(e.time_cost, 0))}${kpi('Direct CO₂', fmt(e.co2.direct_process_CO2_t, 2), 't', 'C removed → CO₂ (afterburnt upper bound)')}${kpi('Gas-production CO₂', fmt(e.co2.gas_production_CO2_t, 2), 't', `${fmt(e.electricity_kWh_gas_production, 0)} kWh`)}
      ${kpi('Lime calcination CO₂', fmt(e.co2.lime_calcination_CO2_t, 2), 't', 'scope-3 style')}${kpi('CO₂ intensity', fmt(e.co2.per_t_steel_kg, 0), 'kg/t')}</div>
    <div class="grid g3" style="margin-top:12px">${card('Cost breakdown', canvas('ec-bar', 'tall'))}${card('Cost shares', canvas('ec-pie', 'tall'))}${card('CO₂ by scope (t)', canvas('ec-co2', 'tall'))}
    ${card('Tariffs & prices (edit → re-run)', `<div class="form-grid">${keys.map((k) => `<label class="f">${k}<input type="number" step="any" data-pr="${k}" value="${P[k]}"></label>`).join('')}</div><div class="btns" style="margin-top:8px"><button class="btn primary" id="ec-run">Re-run with these prices</button></div><div class="note">${e.disclaimer} Factors: ${JSON.stringify(e.assumptions)}</div>`, { cls: 'spanall' })}</div>`);
  return { html, mount(root) {
    const items = { ...Object.fromEntries(Object.entries(e.gas_cost).map(([k, v]) => [`${k} gas`, v])), ...e.materials_cost, 'Cr loss': e.Cr_loss_value, time: e.time_cost };
    barChart(root.querySelector('#ec-bar'), { labels: Object.keys(items), sets: [{ label: 'cost', data: Object.values(items), color: '#E69F00' }], horizontal: true, legend: false });
    doughnut(root.querySelector('#ec-pie'), { labels: Object.keys(items), data: Object.values(items) });
    barChart(root.querySelector('#ec-co2'), { labels: ['direct process', 'gas production', 'lime calcination'], sets: [{ label: 't CO₂', data: [e.co2.direct_process_CO2_t, e.co2.gas_production_CO2_t, e.co2.lime_calcination_CO2_t], color: '#009E73' }], legend: false });
    root.querySelectorAll('[data-pr]').forEach((el) => { el.onchange = () => set({ draft: { ...state.draft, prices: { ...state.draft.prices, [el.dataset.pr]: +el.value } } }); });
    root.querySelector('#ec-run').onclick = () => runDraft('price sensitivity');
  } };
}
