import { state, set } from '../state/store.js';
import { page, card, spinner, banner } from '../components/ui.js';
import { fetchDefaultRecipe, loadDemo, runDraft, draftFromDemo } from '../state/actions.js';
import { METAL, SLAG, validateCharge, validateStage } from '../utils/validators.js';
import { esc, fmt } from '../utils/format.js';
import { toast } from '../components/alerts.js';

const MATERIALS = ['lime', 'dolime', 'fluorspar', 'FeSi75', 'Al', 'FeCr_HC', 'FeCr_LC', 'FeMn_HC', 'Mn_EL', 'Ni', 'FeMo', 'FeTi', 'SS_scrap', 'Fe_scrap', 'coke'];

export function render() {
  const d = state.draft; const ch = d.charge; const errs = validateCharge(ch);
  const g = state.grades.find((x) => x.grade_id === d.grade_id);
  const demos = Object.keys(state.demoHeats).map((id) => `<button class="btn" data-demo="${id}">Load ${id}</button>`).join('');
  const gradeSel = `<select id="r-grade">${state.grades.map((x) => `<option ${x.grade_id === d.grade_id ? 'selected' : ''} value="${x.grade_id}">${x.grade_id} — ${esc(x.label)}</option>`).join('')}</select>`;
  const gradeTbl = g ? `<div class="tbl-wrap"><table class="t"><thead><tr><th>Element</th><th>target</th><th>min</th><th>max</th></tr></thead><tbody>${Object.entries(g.limits_wt).map(([el, [lo, hi]]) => `<tr><td>${el}</td><td>${g.targets_wt[el] ?? '—'}</td><td>${lo ?? '—'}</td><td>${hi ?? '—'}</td></tr>`).join('')}<tr><td>T tap</td><td>${g.tap_T_C} °C</td><td colspan=2>N₂ ${g.n2_permitted ? 'permitted' : '<b class="st-bad">NOT permitted</b>'}</td></tr></tbody></table></div><div class="note">Extra tests outside twin: ${esc(g.extra_tests.join('; '))}. Illustrative demo recipe — not a standard.</div>` : '';
  const comp = `<div class="form-grid">${METAL.filter((e) => e !== 'Fe').map((e) => `<label class="f">${e} (wt%)<input type="number" step="0.001" data-m="${e}" value="${ch.metal_wt[e] ?? ''}" placeholder="not measured" class="${errs['metal_' + e] ? 'invalid' : ''}"></label>`).join('')}</div>
    <div class="note">Fe = balance (${fmt(100 - Object.values(ch.metal_wt).reduce((s, v) => s + (+v || 0), 0), 3)} wt%). Empty = not measured (never treated as zero; C and Cr are mandatory).</div>`;
  const slag = `<div class="form-grid">${SLAG.map((e) => `<label class="f">${e}<input type="number" step="0.1" data-s="${e}" value="${ch.slag_wt[e] ?? ''}"></label>`).join('')}</div>`;
  const stages = d.recipe?.stages;
  const stErr = stages ? stages.flatMap(validateStage) : [];
  const stTable = stages ? `<div class="tbl-wrap" style="max-height:none"><table class="t"><thead><tr><th>#</th><th>Stage</th><th>kind</th><th>O₂ side</th><th>O₂ top</th><th>inert</th><th>gas</th><th>end C ≤</th><th>end η_C &lt;</th><th>duration s</th><th>max s</th><th>additions</th></tr></thead><tbody>
    ${stages.map((s, i) => `<tr><td>${i}</td><td class="txt">${esc(s.name)}</td><td>${s.kind}</td>
      <td><input type="number" step="0.01" style="width:70px" data-st="${i}" data-f="O2_side_Nm3_min_t" value="${s.O2_side_Nm3_min_t}"></td>
      <td><input type="number" step="0.01" style="width:70px" data-st="${i}" data-f="O2_top_Nm3_min_t" value="${s.O2_top_Nm3_min_t}"></td>
      <td><input type="number" step="0.01" style="width:70px" data-st="${i}" data-f="inert_Nm3_min_t" value="${s.inert_Nm3_min_t}"></td>
      <td><select data-st="${i}" data-f="inert_gas"><option ${s.inert_gas === 'Ar' ? 'selected' : ''}>Ar</option><option ${s.inert_gas === 'N2' ? 'selected' : ''}>N2</option></select></td>
      <td><input type="number" step="0.005" style="width:70px" data-st="${i}" data-f="C_below_pct" value="${s.C_below_pct ?? ''}"></td>
      <td><input type="number" step="0.05" style="width:60px" data-st="${i}" data-f="eta_C_below" value="${s.eta_C_below ?? ''}"></td>
      <td><input type="number" step="10" style="width:70px" data-st="${i}" data-f="duration_s" value="${s.duration_s ?? ''}"></td>
      <td><input type="number" step="60" style="width:70px" data-st="${i}" data-f="max_duration_s" value="${s.max_duration_s}"></td>
      <td class="txt">${s.additions.map((a) => `${a.material} ${typeof a.kg === 'number' ? Math.round(a.kg) + ' kg' : a.kg}`).join(', ') || '—'}${s.coolant_rule ? ` · coolant ${s.coolant_rule.material} if T>${s.coolant_rule.T_above_C}` : ''}</td></tr>`).join('')}</tbody></table></div>
    <div class="note">Flows in Nm³/min per tonne of charge (normal reference 0 °C, 101.325 kPa). Stage ends at first satisfied criterion; η_C criterion is the kinetics-derived transition. Values are synthetic demonstration practice.</div>
    ${stErr.length ? banner(esc(stErr.join(' · ')), 'red') : ''}` : '<div class="empty">Using the grade default recipe. <button class="btn" id="r-edit">Load recipe for editing</button></div>';
  const extra = `<div class="row"><select id="x-mat">${MATERIALS.map((m) => `<option>${m}</option>`).join('')}</select><input type="number" id="x-kg" placeholder="kg" style="width:90px"><input type="number" id="x-t" placeholder="t (min)" style="width:90px"><button class="btn" id="x-add">Add timed addition</button></div>
    <div class="note">${d.extra_additions.map((a, i) => `${a.material} ${a.kg} kg @ ${(a.t_s / 60).toFixed(1)} min <a href="#" data-xdel="${i}">✕</a>`).join(' · ') || 'No extra timed additions.'}</div>`;
  const params = `<div class="form-grid">${[['k_C', 0.0036], ['k_Cr', 0.003], ['k_red_Si', 0.0105], ['k_N', 0.0012], ['k_S', 0.0045], ['eta_O2_side', 0.97], ['heat_loss_multiplier', 1.0], ['pcr_vessel', 0.06]].map(([k, dv]) => `<label class="f">${k}<input type="number" step="any" data-p="${k}" value="${d.params[k] ?? dv}" ${['process_engineer', 'admin'].includes(state.settings.role) || state.settings.role === 'shift_supervisor' ? '' : 'disabled'}></label>`).join('')}</div><div class="note">Model parameters editable by process engineer / supervisor roles only. SYNTHETIC defaults.</div>`;
  const html = page('Charge & Recipe', 'transfer from upstream melting · grade target · gas & addition schedule · model parameters',
    `<div class="btns" style="margin-bottom:10px">${demos}</div>
    <div class="grid g2">
      ${card('Grade target (configured recipe)', gradeSel + gradeTbl)}
      ${card('Transfer to AOD (from EAF/IF — DRI only upstream)', `<div class="form-grid">
        <label class="f">Heat ID<input id="c-heat" value="${esc(ch.heat_id)}"></label>
        <label class="f">Transfer weight (kg)<input type="number" data-c="metal_mass_kg" value="${ch.metal_mass_kg}" class="${errs.metal_mass_kg ? 'invalid' : ''}"></label>
        <label class="f">Temperature (°C)<input type="number" data-c="T_metal_C" value="${ch.T_metal_C}" class="${errs.T_metal_C ? 'invalid' : ''}"></label>
        <label class="f">Carry-over slag (kg)<input type="number" data-c="slag_mass_kg" value="${ch.slag_mass_kg}"></label>
        <label class="f">Upstream route<input id="c-route" value="${esc(ch.upstream_route || 'EAF')}"></label>
        <label class="f">DRI in upstream charge (fraction, metadata)<input type="number" step="0.05" data-c="dri_fraction_upstream" value="${ch.dri_fraction_upstream || 0}"></label></div>
        <h3 style="margin-top:10px">Metal assay</h3>${comp}${Object.keys(errs).length ? banner(esc(Object.values(errs).join(' · ')), 'red') : ''}`)}
      ${card('Carry-over slag composition (wt%, oxide basis)', slag)}
      ${card('Model parameters & numerics', params + `<div class="form-grid" style="margin-top:8px"><label class="f">dt (s)<input type="number" step="0.5" id="n-dt" value="${d.dt_s}"></label><label class="f">uncertainty samples<input type="number" id="n-unc" value="${d.uncertainty_samples}"></label></div>`)}
      ${card('Gas & addition schedule (recipe stages)', stTable, { cls: 'spanall' })}
      ${card('Extra timed additions (operator / scenario)', extra, { cls: 'spanall' })}
    </div>`, `<button class="btn primary" id="r-run" ${Object.keys(errs).length || stErr.length ? 'disabled' : ''}>Run transient heat</button>${spinner(state.busy.run)}`);
  return { html, mount(root) {
    const up = (patch) => set({ draft: { ...state.draft, ...patch } });
    root.querySelectorAll('[data-demo]').forEach((b) => { b.onclick = () => loadDemo(b.dataset.demo); });
    root.querySelector('#r-grade').onchange = (e) => up({ grade_id: e.target.value, recipe: null });
    root.querySelectorAll('[data-c]').forEach((el) => { el.onchange = () => up({ charge: { ...state.draft.charge, [el.dataset.c]: +el.value } }); });
    root.querySelector('#c-heat').onchange = (e) => up({ charge: { ...state.draft.charge, heat_id: e.target.value.replace(/[^A-Za-z0-9_.-]/g, '') } });
    root.querySelector('#c-route').onchange = (e) => up({ charge: { ...state.draft.charge, upstream_route: e.target.value } });
    root.querySelectorAll('[data-m]').forEach((el) => { el.onchange = () => up({ charge: { ...state.draft.charge, metal_wt: { ...state.draft.charge.metal_wt, [el.dataset.m]: el.value === '' ? null : +el.value } } }); });
    root.querySelectorAll('[data-s]').forEach((el) => { el.onchange = () => up({ charge: { ...state.draft.charge, slag_wt: { ...state.draft.charge.slag_wt, [el.dataset.s]: +el.value || 0 } } }); });
    root.querySelectorAll('[data-p]').forEach((el) => { el.onchange = () => up({ params: { ...state.draft.params, [el.dataset.p]: +el.value } }); });
    root.querySelector('#n-dt').onchange = (e) => up({ dt_s: +e.target.value });
    root.querySelector('#n-unc').onchange = (e) => up({ uncertainty_samples: +e.target.value });
    root.querySelector('#r-edit')?.addEventListener('click', fetchDefaultRecipe);
    root.querySelectorAll('[data-st]').forEach((el) => { el.onchange = () => {
      const st = structuredClone(state.draft.recipe); const s = st.stages[+el.dataset.st]; const f = el.dataset.f;
      s[f] = el.tagName === 'SELECT' ? el.value : (el.value === '' ? null : +el.value); up({ recipe: st }); }; });
    root.querySelector('#x-add').onclick = () => { const kg = +root.querySelector('#x-kg').value; const t = +root.querySelector('#x-t').value;
      if (!(kg > 0) || !(t >= 0)) { toast('Enter positive kg and time', 'warn'); return; }
      up({ extra_additions: [...state.draft.extra_additions, { material: root.querySelector('#x-mat').value, kg, t_s: t * 60 }] }); };
    root.querySelectorAll('[data-xdel]').forEach((a) => { a.onclick = (e) => { e.preventDefault(); const x = [...state.draft.extra_additions]; x.splice(+a.dataset.xdel, 1); up({ extra_additions: x }); }; });
    root.querySelector('#r-run').onclick = () => runDraft();
  } };
}
export { draftFromDemo };
