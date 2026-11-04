import { state, set } from '../state/store.js';
import { page, card, canvas, spinner } from '../components/ui.js';
import { lineChart } from '../components/charts.js';
import { table } from '../components/tables.js';
import { previewDesign, runDraft } from '../state/actions.js';
import { fmt } from '../utils/format.js';
import { toast } from '../components/alerts.js';

const PRESETS = [20, 40, 60, 90, 120, 150, 180];
const MATS = ['magnesia_chrome', 'doloma', 'magnesia_carbon', 'magnesia_safety', 'fireclay_safety', 'insulating_board', 'steel_shell'];
const defLining = () => [{ material: 'magnesia_chrome', thickness_m: 0.45, nodes: 9 }, { material: 'magnesia_safety', thickness_m: 0.12, nodes: 3 }, { material: 'steel_shell', thickness_m: 0.045, nodes: 1 }];

function section(g) {
  // to-scale 2D cross-section of the vessel design
  const s = 70 / Math.max(1, g.inner_diameter_m / 2 + g.lining_total_m) * 2.2;
  const cx = 230; const yb = 420; const ri = g.inner_diameter_m / 2 * s; const L = g.lining_total_m * s; const H = g.vessel_inner_height_m * s; const rm = g.mouth_diameter_m / 2 * s;
  const yc = yb - H * 0.62; const yt = yb - H; const hb = g.bath_depth_m * s; const hs = g.slag_thickness_m * s;
  const pth = (o) => `M${cx - ri - o} ${yb + o} L${cx - ri - o} ${yc} L${cx - rm - o} ${yt} L${cx + rm + o} ${yt} L${cx + ri + o} ${yc} L${cx + ri + o} ${yb + o} Z`;
  return `<svg viewBox="0 0 460 470"><rect width="460" height="470" fill="#0b1016"/>
    <path d="${pth(L)}" fill="#3d4652"/><path d="${pth(L * 0.92)}" fill="#8f826e"/><path d="${pth(L * 0.74)}" fill="#7a3f22"/><path d="${pth(0)}" fill="#120c08"/>
    <rect x="${cx - ri}" y="${yb - hb}" width="${2 * ri}" height="${hb}" fill="#ff7a18"/><rect x="${cx - ri}" y="${yb - hb - hs}" width="${2 * ri}" height="${hs}" fill="#8a5a26"/>
    ${Array.from({ length: g.n_tuyeres }, (_, i) => `<rect x="${cx - ri - L - 12}" y="${yb - 0.3 * s - 4 + i * 4 - g.n_tuyeres * 2}" width="${L + 14}" height="2.5" fill="#b7c3d0"/>`).join('')}
    ${g.top_lance_installed ? `<rect x="${cx - 3}" y="10" width="6" height="${yb - hb - hs - 10 - g.lance_height_above_bath_m * s}" fill="#c9d3dd"/>` : ''}
    <line x1="${cx - ri}" y1="${yb + L + 16}" x2="${cx + ri}" y2="${yb + L + 16}" stroke="#56B4E9"/><text x="${cx}" y="${yb + L + 30}" fill="#56B4E9" font-size="11" text-anchor="middle">Ø inner ${fmt(g.inner_diameter_m, 2)} m</text>
    <line x1="${cx + ri + L + 16}" y1="${yb}" x2="${cx + ri + L + 16}" y2="${yt}" stroke="#E69F00"/><text x="${cx + ri + L + 22}" y="${(yb + yt) / 2}" fill="#E69F00" font-size="11">H ${fmt(g.vessel_inner_height_m, 2)} m</text>
    <text x="${cx}" y="${yb - hb / 2}" fill="#1a0a00" font-size="11" text-anchor="middle" font-weight="700">bath ${fmt(g.bath_depth_m, 2)} m</text>
    <text x="${cx}" y="${yt - 8}" fill="#8fa1b5" font-size="11" text-anchor="middle">mouth Ø ${fmt(g.mouth_diameter_m, 2)} m · freeboard ${fmt(g.freeboard_m, 2)} m</text></svg>`;
}

export function render() {
  const d = state.draft?.design || { capacity_t: 90, vessel_type: 'AOD' };
  const lin = d.lining || defLining();
  const prev = state.design;
  const f = (k, lbl, step = 0.01, v = d[k]) => `<label class="f">${lbl}<input type="number" step="${step}" data-k="${k}" value="${v ?? ''}" placeholder="auto"></label>`;
  const form = `<div class="row" style="margin-bottom:10px">${PRESETS.map((c) => `<button class="btn ${d.capacity_t === c ? 'primary' : ''}" data-cap="${c}">${c} t</button>`).join('')}</div>
    <div class="form-grid">
      <label class="f">Vessel type<select data-k="vessel_type"><option ${d.vessel_type === 'AOD' ? 'selected' : ''}>AOD</option><option ${d.vessel_type === 'AOD-L' ? 'selected' : ''}>AOD-L</option></select></label>
      ${f('capacity_t', 'Nominal capacity (t)', 1)}${f('inner_diameter_m', 'Inner Ø (m, blank=auto)')}${f('bath_depth_to_diameter', 'Bath H/D', 0.01, d.bath_depth_to_diameter ?? 0.4)}
      ${f('specific_volume_m3_per_t', 'Specific volume (m³/t)', 0.01, d.specific_volume_m3_per_t ?? 0.62)}${f('mouth_to_diameter', 'Mouth/Ø', 0.01, d.mouth_to_diameter ?? 0.52)}
      ${f('n_tuyeres', 'Tuyeres (blank=auto)', 1)}${f('tuyere_inner_diameter_mm', 'Tuyere Ø (mm)', 1, d.tuyere_inner_diameter_mm ?? 18)}${f('tuyere_height_above_bottom_m', 'Tuyere height (m)', 0.01, d.tuyere_height_above_bottom_m ?? 0.3)}
      ${f('tuyere_arc_deg', 'Tuyere arc (°)', 1, d.tuyere_arc_deg ?? 75)}${f('lance_height_above_bath_m', 'Lance height (m)', 0.1, d.lance_height_above_bath_m ?? 2)}
      ${f('lining_age_heats', 'Lining age (heats)', 1, d.lining_age_heats ?? 120)}${f('hot_face_initial_C', 'Initial hot face (°C)', 10, d.hot_face_initial_C ?? 1250)}${f('ambient_C', 'Ambient (°C)', 1, d.ambient_C ?? 35)}${f('shell_wind_m_s', 'Wind at shell (m/s)', 0.1, d.shell_wind_m_s ?? 0.5)}
    </div>
    <h3 style="margin-top:12px">Refractory lining (hot face → shell)</h3>
    ${lin.map((l, i) => `<div class="row" style="margin:4px 0"><select data-lm="${i}">${MATS.map((m) => `<option ${m === l.material ? 'selected' : ''}>${m}</option>`).join('')}</select>
      <label class="f">thickness (m)<input type="number" step="0.005" data-lt="${i}" value="${l.thickness_m}"></label><label class="f">nodes<input type="number" step="1" data-ln="${i}" value="${l.nodes}"></label></div>`).join('')}
    <div class="btns" style="margin-top:10px"><button class="btn blue" id="d-prev">Preview design</button><button class="btn primary" id="d-run">Apply & simulate heat</button></div>`;
  const right = prev ? `<div class="grid g2"><div class="svgbox">${section(prev.geometry)}</div><div>${table(Object.entries(prev.geometry).filter(([, v]) => typeof v !== 'object').map(([k, v]) => ({ k, v })), [{ key: 'k', label: 'Geometry', txt: true }, { key: 'v', label: 'value' }], { maxH: 400 })}</div></div>
     <div class="row" style="margin-top:8px"><span class="chip">Steady shell loss <b>${fmt(prev.steady_shell_loss_kW, 0)} kW</b></span><span class="chip">Shell T <b>${fmt(prev.shell_T_C, 0)} °C</b></span><span class="chip">Lining heat capacity <b>${fmt(prev.lining_heat_capacity_MJ_K, 2)} MJ/K</b></span></div>
     ${canvas('d-prof')}` : '<div class="empty">Choose a capacity or edit dimensions, then Preview design.</div>';
  const html = page('Furnace Design & Capacity', 'dimensions, tuyeres, lance, refractory design and thermal state',
    `<div class="grid g2">${card('Design parameters (SYNTHETIC default ratios — replace with plant drawings)', form)}${card('Design preview: to-scale section, geometry, lining thermal profile', right + spinner(state.busy.design))}</div>`);
  return { html, mount(root) {
    const upd = (patch) => set({ draft: { ...state.draft, design: { ...state.draft.design, ...patch } } });
    root.querySelectorAll('[data-cap]').forEach((b) => { b.onclick = () => { const c = +b.dataset.cap; const ch = { ...state.draft.charge, metal_mass_kg: c * 1000 };
      set({ draft: { ...state.draft, charge: ch, recipe: null, design: { ...state.draft.design, capacity_t: c, inner_diameter_m: null, n_tuyeres: null } } }); previewDesign(state.draft.design); }; });
    root.querySelectorAll('[data-k]').forEach((el) => { el.onchange = () => { const v = el.tagName === 'SELECT' ? el.value : (el.value === '' ? null : +el.value); upd({ [el.dataset.k]: v }); }; });
    const linUpd = () => { const L = lin.map((l, i) => ({ material: root.querySelector(`[data-lm="${i}"]`).value, thickness_m: +root.querySelector(`[data-lt="${i}"]`).value, nodes: +root.querySelector(`[data-ln="${i}"]`).value })); upd({ lining: L }); };
    root.querySelectorAll('[data-lm],[data-lt],[data-ln]').forEach((el) => { el.onchange = linUpd; });
    root.querySelector('#d-prev').onclick = () => previewDesign(state.draft.design);
    root.querySelector('#d-run').onclick = async () => { const r = await runDraft('design change'); if (r) toast('Heat re-simulated with the new vessel design', 'ok'); };
    if (prev) { const p = prev.lining_profile; lineChart(root.querySelector('#d-prof'), { x: p.r_m.map((v) => v * 1000), xTitle: 'distance from hot face (mm)', y: { title: '°C' }, series: [{ label: 'initial lining temperature', y: p.T_C, color: '#D55E00', points: true }] }); }
  } };
}
