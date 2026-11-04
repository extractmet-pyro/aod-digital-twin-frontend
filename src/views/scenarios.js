import { state } from '../state/store.js';
import { page, card, canvas, spinner, empty } from '../components/ui.js';
import { lineChart, PAL } from '../components/charts.js';
import { table } from '../components/tables.js';
import { compare, runScenario } from '../state/actions.js';
import { esc, fmt } from '../utils/format.js';

export function render() {
  const cmp = state.compare; const sc = state.scenarios || {};
  const lib = Object.entries(sc).map(([id, s]) => `<div class="alarm"><span class="sev LOW">${esc(id)}</span><span style="flex:1"><b>${esc(s.title)}</b> — ${esc(s.explanation)}</span><button class="btn" data-scn="${id}">Run</button></div>`).join('');
  const branch = `<div class="form-grid">
    <label class="f">Variant name<input id="bv-n" value="more argon dilution"></label><label class="f">Inert scale (decarb)<input type="number" step="0.05" id="bv-i" value="1.2"></label>
    <label class="f">O₂ scale<input type="number" step="0.05" id="bv-o" value="1.0"></label><label class="f">Transfer T override (°C)<input type="number" id="bv-T" placeholder="—"></label>
    <label class="f">Stage-1 inert gas<select id="bv-g"><option value="">(recipe)</option><option>Ar</option><option>N2</option></select></label>
    <label class="f">Timed addition<select id="bv-m"><option value="">none</option><option>SS_scrap</option><option>lime</option><option>FeSi75</option><option>Ni</option></select></label>
    <label class="f">kg<input type="number" id="bv-kg" value="1500"></label><label class="f">at (min)<input type="number" id="bv-t" value="25"></label></div>
    <div class="btns" style="margin-top:8px"><button class="btn" id="bv-add">Add variant</button><button class="btn primary" id="bv-go">Compare with current draft</button>${spinner(state.busy.compare)}</div>
    <div class="note" id="bv-list">${(state._variants || []).map((v) => esc(v.name)).join(' · ') || 'No variants yet (base = current Charge & Recipe draft).'}</div>`;
  const res = cmp ? `${table(cmp.runs.map((r) => ({ name: r.name, T: r.kpis.tap_T_C, C: r.final_metal.wt.C, Cr: r.final_metal.wt.Cr, N: r.final_metal.wt.N, CrR: r.kpis.Cr_recovery_pct, O2: r.kpis.O2_total_Nm3, Ar: r.kpis.Ar_Nm3, N2: r.kpis.N2_Nm3, t: r.kpis.heat_duration_min, cost: r.economics.cost_per_t, co2: r.co2_per_t_kg, dc: r.delta_vs_base?.cost_per_t })),
    [{ key: 'name', txt: true }, { key: 'T', label: 'tap T' }, { key: 'C' }, { key: 'Cr' }, { key: 'N' }, { key: 'CrR', label: 'Cr rec %' }, { key: 'O2', label: 'O₂ Nm³' }, { key: 'Ar', label: 'Ar Nm³' }, { key: 'N2', label: 'N₂ Nm³' }, { key: 't', label: 'min' }, { key: 'cost', label: 'cost/t' }, { key: 'co2', label: 'kgCO₂/t' }, { key: 'dc', label: 'Δcost/t' }])}
    <div class="grid g2" style="margin-top:10px">${card('Carbon', canvas('cm-C'))}${card('Temperature', canvas('cm-T'))}${card('Slag Cr₂O₃', canvas('cm-Cr'))}${card('Nitrogen (ppm)', canvas('cm-N'))}</div>` : empty('Add variants and compare.');
  const html = page('Scenario Lab', 'branch · compare · replay · physically explained consequences',
    `<div class="grid g2">${card('Scenario library (synthetic)', `<div style="max-height:330px;overflow:auto">${lib || empty('backend required')}</div>${spinner(state.busy.scenario)}`)}${card('Branch a scenario from the current draft', branch)}</div><div style="height:12px"></div>${card('Comparison', res)}`);
  return { html, mount(root) {
    root.querySelectorAll('[data-scn]').forEach((b) => { b.onclick = () => runScenario(b.dataset.scn); });
    root.querySelector('#bv-add').onclick = () => {
      const v = { name: root.querySelector('#bv-n').value || 'variant', inert_scale: +root.querySelector('#bv-i').value || null, o2_scale: +root.querySelector('#bv-o').value || null, charge_patch: {}, stage_patch: {}, extra_additions: [] };
      const T = root.querySelector('#bv-T').value; if (T) v.charge_patch.T_metal_C = +T;
      const g = root.querySelector('#bv-g').value; if (g) v.stage_patch = { 0: { inert_gas: g } };
      const m = root.querySelector('#bv-m').value; if (m) v.extra_additions = [{ material: m, kg: +root.querySelector('#bv-kg').value, t_s: 60 * +root.querySelector('#bv-t').value }];
      state._variants = [...(state._variants || []), v].slice(-4); root.querySelector('#bv-list').textContent = state._variants.map((x) => x.name).join(' · ');
    };
    root.querySelector('#bv-go').onclick = () => compare(state._variants?.length ? state._variants : [{ name: 'more argon dilution', inert_scale: 1.2 }]);
    if (cmp) {
      const mk = (id, key, f = (v) => v, log = false) => lineChart(root.querySelector(id), { y: { log }, series: cmp.runs.map((r, i) => ({ label: r.name, x: r.series.t_min, y: r.series[key].map(f), color: PAL[i], dash: i ? [5, 3] : [] })) });
      mk('#cm-C', 'm_C', (v) => Math.max(v, 0.003), true); mk('#cm-T', 'T_metal_C'); mk('#cm-Cr', 's_Cr2O3'); mk('#cm-N', 'm_N', (v) => v * 1e4);
    }
  } };
}
