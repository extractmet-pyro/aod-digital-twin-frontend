import { state } from '../state/store.js';
import { page, card, canvas } from '../components/ui.js';
import { barChart, lineChart } from '../components/charts.js';
import { table } from '../components/tables.js';
import { download, tableToCSV } from '../utils/export.js';
import { fmt, sigfig } from '../utils/format.js';
import { originBanner, noRun } from './_common.js';

function sankey(rows, el) {
  // simple 2D Sankey-like element flow (kg): inputs -> phases at tap
  const r = rows.find((x) => x.element === el); if (!r) return '';
  const ins = [['initial charge', r.initial_kg], ['additions', r.added_kg], ['gas in', r.gas_in_kg]].filter((a) => a[1] > 1e-6);
  const outs = [['metal + slag + pool', r.metal_slag_pool_kg], ['off-gas', r.gas_out_kg], ['removed (deslag/entrained)', r.removed_kg]].filter((a) => a[1] > 1e-6);
  const tot = ins.reduce((s, a) => s + a[1], 0) || 1; const H = 160; let y1 = 10; let y2 = 10;
  const band = (a, x, y, c) => { const h = Math.max(2, a[1] / tot * H); const s = `<rect x="${x}" y="${y}" width="14" height="${h}" fill="${c}"/><text x="${x === 20 ? 40 : x - 6}" y="${y + h / 2 + 4}" font-size="10.5" fill="#c9d6e3" text-anchor="${x === 20 ? 'start' : 'end'}">${a[0]} ${sigfig(a[1], 4)} kg</text>`; return [s, h]; };
  let svg = ''; const L = []; const R = [];
  for (const a of ins) { const [s, h] = band(a, 20, y1, '#E69F00'); svg += s; L.push([y1, h]); y1 += h + 6; }
  for (const a of outs) { const [s, h] = band(a, 426, y2, '#56B4E9'); svg += s; R.push([y2, h]); y2 += h + 6; }
  const lt = L.reduce((s, a) => s + a[1], 0); const rt = R.reduce((s, a) => s + a[1], 0);
  svg += `<path d="M34 10 C230 10 230 10 426 10 L426 ${10 + rt} C230 ${10 + rt} 230 ${10 + lt} 34 ${10 + lt} Z" fill="#56B4E9" fill-opacity=".15"/>`;
  return `<svg viewBox="0 0 460 ${Math.max(y1, y2) + 10}"><text x="230" y="${Math.max(y1, y2) + 4}" font-size="11" fill="#E69F00" text-anchor="middle">${el} balance · residual ${sigfig(r.residual_kg, 2)} kg (rel ${r.relative.toExponential(1)})</text>${svg}</svg>`;
}

export function render() {
  const r = state.run;
  if (!r) return { html: page('Mass Balance', '', noRun()), mount() {} };
  const s = r.summary;
  const compCols = ['C', 'Cr', 'Ni', 'Mn', 'Si', 'Mo', 'N', 'S', 'CaO', 'SiO2', 'Cr2O3', 'MgO', 'Al2O3', 'CaF2', 'FeO', 'MnO', 'O2', 'Ar', 'N2', 'CO', 'CO2'];
  const ioCols = [{ key: 'item', label: 'Stream', txt: true }, { key: 'kind', label: 'type' }, { key: 'kg', label: 'kg', fmt: (v) => fmt(v, 1) }, { key: 't_s', label: 't (min)', fmt: (v) => (v === undefined ? '' : fmt(v / 60, 1)) },
    { key: 'composition_wt', label: 'composition (wt%)', txt: true, fmt: (v) => Object.entries(v || {}).filter(([k, x]) => x > 1e-4 && k !== 'Fe').map(([k, x]) => `${k} ${sigfig(x, 3)}`).join(' · ') + (v?.Fe ? ` · Fe ${sigfig(v.Fe, 4)}` : '') }];
  const html = page('Mass Balance', 'all inputs & outputs with compositions and final weights · element closure computed independently', originBanner() +
    `<div class="row" style="margin-bottom:10px"><span class="chip">Σ inputs <b>${fmt(s.mass_totals.inputs_kg, 1)} kg</b></span><span class="chip">Σ outputs <b>${fmt(s.mass_totals.outputs_kg, 1)} kg</b></span><span class="chip">difference <b>${sigfig(s.mass_totals.difference_kg, 3)} kg</b></span><span class="chip">max element residual <b>${r.balance_residual.element_max_relative.toExponential(2)}</b></span>
     <button class="btn" id="b-io">Export inputs/outputs CSV</button></div>
    <div class="grid g2">
      ${card('Inputs: hot metal, slag, every addition and gas', table(s.inputs, ioCols, { maxH: 380 }))}
      ${card('Outputs: tapped steel, slag, off-gas, losses', table(s.outputs, ioCols, { maxH: 380 }))}
      ${card('Element closure (kg) — Fe, Cr, C, O, Si, Mn, Ca, Mg, Al, N, S …', table(s.element_closure, [{ key: 'element' }, { key: 'initial_kg', label: 'initial' }, { key: 'added_kg', label: 'added' }, { key: 'gas_in_kg', label: 'gas in' }, { key: 'metal_slag_pool_kg', label: 'inventory' }, { key: 'gas_out_kg', label: 'gas out' }, { key: 'removed_kg', label: 'removed' }, { key: 'residual_kg', label: 'residual', fmt: (v) => v.toExponential(2) }, { key: 'relative', label: 'relative', fmt: (v) => v.toExponential(1), cls: (x) => (x.relative < 1e-9 ? 'st-within' : 'st-bad') }]), { cls: 'spanall' })}
      ${card('Chromium flow', `<div class="svgbox">${sankey(s.element_closure, 'Cr')}</div>`)}${card('Carbon flow', `<div class="svgbox">${sankey(s.element_closure, 'C')}</div>`)}
      ${card('Final metal composition vs targets', canvas('b-final'))}${card('Final slag composition (wt%)', canvas('b-slag'))}
      ${card('Metal / slag weight trajectory (t)', canvas('b-w'))}${card('Cumulative gas consumption (Nm³)', canvas('b-gas'))}
    </div>`);
  return { html, mount(root) {
    root.querySelector('#b-io').onclick = () => download(`${r.run_id}-inputs-outputs.csv`, tableToCSV([...s.inputs.map((x) => ({ ...x, dir: 'IN' })), ...s.outputs.map((x) => ({ ...x, dir: 'OUT' }))], ['dir', 'item', 'kind', 'kg', 't_s', 'composition_wt']), 'text/csv');
    const els = s.compliance.filter((c) => c.element !== 'T_tap_C' && c.target_wt !== null);
    barChart(root.querySelector('#b-final'), { labels: els.map((c) => c.element), sets: [{ label: 'final', data: els.map((c) => c.final_wt), color: '#E69F00' }, { label: 'target', data: els.map((c) => c.target_wt), color: '#56B4E9' }], y: { title: 'wt%', log: true } });
    const ws = s.final_slag.wt; const ks = Object.keys(ws).filter((k) => ws[k] > 0.05);
    barChart(root.querySelector('#b-slag'), { labels: ks, sets: [{ label: 'final slag', data: ks.map((k) => ws[k]), color: '#c48a3a' }], y: { title: 'wt%' }, legend: false });
    const S = r.series;
    lineChart(root.querySelector('#b-w'), { x: S.t_min, y: { title: 'metal t' }, y2: { title: 'slag t' }, series: [{ label: 'metal', y: S.metal_kg.map((v) => v / 1000), color: '#D55E00' }, { label: 'slag', y: S.slag_kg.map((v) => v / 1000), color: '#E69F00', axis: 'y2' }] });
    lineChart(root.querySelector('#b-gas'), { x: S.t_min, y: { title: 'Nm³' }, series: [{ label: 'O₂', y: S.cum_O2_Nm3, color: '#56B4E9' }, { label: 'Ar', y: S.cum_Ar_Nm3, color: '#CC79A7' }, { label: 'N₂', y: S.cum_N2_Nm3, color: '#009E73' }] });
  } };
}
