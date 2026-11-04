import { state } from '../state/store.js';
import { page, card } from '../components/ui.js';
import { api } from '../api/client.js';
import { table } from '../components/tables.js';
import { download, seriesToCSV } from '../utils/export.js';
import { esc } from '../utils/format.js';
import { originBanner, noRun } from './_common.js';

export function render() {
  const r = state.run;
  if (!r) return { html: page('Reports', '', noRun()), mount() {} };
  const online = state.backend.online && state.runOrigin !== 'OFFLINE FIXTURE';
  const html = page('Reports & Exports', `run ${r.run_id}`, originBanner() + `<div class="grid g2">
    ${card('Per-heat report', `<div class="btns">
      <a class="btn primary" ${online ? `href="${api.reportUrl(r.run_id, 'html')}" target="_blank" rel="noopener"` : 'aria-disabled="true"'}>Open formatted report (HTML → Print → PDF)</a>
      <a class="btn" ${online ? `href="${api.reportUrl(r.run_id, 'csv')}"` : 'aria-disabled="true"'}>Backend CSV (all series)</a>
      <button class="btn" id="rp-json">Download complete run JSON</button><button class="btn" id="rp-csv">Download displayed series CSV</button><button class="btn" id="rp-print">Print this page</button></div>
      <div class="note" style="margin-top:8px">The report contains heat details, grade, operating timeline, predictions vs targets, inputs/outputs with compositions, element & energy closure, heat sources/sinks, off-gas, Cr recovery, gas economics, recommendations with status, warnings, model/recipe versions and the hash-chained audit trail. Test <code>tests/integration/test_api.py::test_end_to_end_heat_run_report_and_audit</code> proves report fields equal displayed data.</div>`)}
    ${card('Run metadata', `<div class="kv">${['run_id', 'heat_id', 'grade_id', 'timestamp_utc', 'mode', 'model_version', 'recipe_version', 'data_origin', 'quality', 'normal_reference'].map((k) => `<span class="k">${k}</span><span class="v">${esc(r[k])}</span>`).join('')}
      <span class="k">solver</span><span class="v">${esc(r.solver.scheme)} · ${r.solver.steps} steps · ${r.solver.wall_s.toFixed(2)} s</span></div>`)}
    ${card('Operating timeline', table(r.summary.stages, [{ key: 'name', txt: true }, { key: 'kind' }, { key: 't_start_s', label: 'start s' }, { key: 'duration_s', label: 'dur s' }, { key: 'end_reason', txt: true }, { key: 'C_end_wt', label: 'C end' }, { key: 'T_end_C', label: 'T end' }]), { cls: 'spanall' })}
    ${card('Event log', table(r.summary.events, [{ key: 't_s', label: 't (s)' }, { key: 'kind' }, { key: 'stage', txt: true }, { key: 'material' }, { key: 'kg' }, { key: 'reason', txt: true }, { key: 'message', txt: true }], { maxH: 300 }), { cls: 'spanall' })}
    ${card('Assumptions', `<ul class="note">${r.assumptions.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>`, { cls: 'spanall' })}</div>`);
  return { html, mount(root) {
    root.querySelector('#rp-json').onclick = () => download(`${r.run_id}.json`, JSON.stringify(r, null, 1), 'application/json');
    root.querySelector('#rp-csv').onclick = () => download(`${r.run_id}-series.csv`, seriesToCSV(r.series), 'text/csv');
    root.querySelector('#rp-print').onclick = () => window.print();
  } };
}
