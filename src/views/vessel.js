import { state, set } from '../state/store.js';
import { page, card } from '../components/ui.js';
import { createVesselScene, webglAvailable } from '../three/scene.js';
import { renderSchematic } from '../components/schematic.js';
import { fmt } from '../utils/format.js';
import { download } from '../utils/export.js';
import { originBanner, noRun, defaultFrame } from './_common.js';

let scene = null;
export function dispose() { scene?.dispose(); scene = null; }

function readout(r, i) {
  const S = r.series;
  const rows = [['Time', `${fmt(S.t_min[i], 1)} min`], ['Stage', S.stage[i]], ['Metal', `${fmt(S.metal_kg[i] / 1000, 2)} t @ ${fmt(S.T_metal_C[i], 0)} °C`], ['C · Cr · Ni', `${fmt(S.m_C[i], 4)} · ${fmt(S.m_Cr[i], 2)} · ${fmt(S.m_Ni[i], 2)}`],
    ['N · S (ppm)', `${fmt(S.m_N[i] * 1e4, 0)} · ${fmt(S.m_S[i] * 1e4, 0)}`], ['Slag', `${fmt(S.slag_kg[i] / 1000, 2)} t · Cr₂O₃ ${fmt(S.s_Cr2O3[i], 1)} % · B₂ ${fmt(S.B2[i], 2)}`],
    ['Flows O₂/Ar/N₂', `${fmt(S.O2_side_Nm3_min[i], 0)} / ${fmt(S.Ar_Nm3_min[i], 0)} / ${fmt(S.N2_Nm3_min[i], 0)}`], ['Top O₂', fmt(S.O2_top_Nm3_min[i], 0)], ['pCO (bubble)', `${fmt(S.pCO_atm[i], 2)} atm`],
    ['η O₂→C', `${fmt(100 * S.eta_C_O2[i], 0)} %`], ['Off-gas CO', `${fmt(S.vg_CO[i], 0)} %`], ['Bath depth', `${fmt(S.bath_depth_m[i], 2)} m`], ['Hot face / shell', `${fmt(S.T_hotface_C[i], 0)} / ${fmt(S.T_shell_C[i], 0)} °C`],
    ['Stirring', `${fmt(S.stirring_W_t[i] / 1000, 1)} kW/t`]];
  return `<div class="kv">${rows.map(([k, v]) => `<span class="k">${k}</span><span class="v">${v}</span>`).join('')}</div>`;
}

export function render() {
  const r = state.run;
  if (!r) return { html: page('3D Vessel', '', noRun()), mount() {} };
  const n = r.series.t_s.length; const i0 = state.frameIdx ?? defaultFrame(r);
  const g = r.summary.geometry;
  const html = page('3D AOD Vessel', `${g.capacity_t} t ${g.vessel_type} · Ø${fmt(g.inner_diameter_m, 2)} m · ${g.n_tuyeres} tuyeres · lining ${fmt(g.lining_total_m * 1000, 0)} mm`, originBanner() + `
  <div class="grid g-main">
    <div class="vessel-wrap" id="v3d">
      <div class="vessel-hud"><span class="chip">O₂ <b style="color:var(--o2)">■</b> Ar <b style="color:var(--ar)">■</b> N₂ <b style="color:var(--n2)">■</b> bubble colour = gas mix</span></div>
      <div class="vessel-tools">
        <button class="btn" data-t="reset">Reset camera</button><button class="btn" data-t="pause" aria-pressed="${!!state.settings.reducedMotion}">Pause FX</button>
        <button class="btn" data-t="cutaway" aria-pressed="true">Cutaway</button><button class="btn" data-t="xray" aria-pressed="false">Transparent wall</button>
        <button class="btn" data-t="labels" aria-pressed="true">Labels</button><button class="btn" data-t="snap">Snapshot PNG</button><button class="btn" data-t="schem">2D fallback</button></div>
      <div class="cfd-note">Gas plume & bubbles are schematic animation, not CFD output. Levels, temperatures, flows from backend.</div>
      <div class="vessel-scrub"><button class="btn" id="v-play">▶ Replay</button><input type="range" id="v-scrub" min="0" max="${n - 1}" value="${i0}" aria-label="time scrubber"><span class="mono" id="v-time"></span></div>
    </div>
    <div class="grid">${card('Live readings at scrubber time', `<div id="v-read">${readout(r, i0)}</div>`)}
      ${card('Legend & regions', `<div class="note">Steel shell (dark metal) · safety lining (grey brick) · working lining (magnesia-chrome, brick red, glows with hot-face T) · liquid metal bath (colour = temperature) · slag (amber → olive as Cr₂O₃ rises) · side tuyeres with gas plume · optional top lance (AOD-L) · hood, off-gas duct, analyzer · additions chute (falling chunks at addition events) · trunnion ring & stands. Vessel tilts during sampling turndown and tapping.</div>`)}</div>
  </div>`);
  return { html, mount(root) {
    const el = root.querySelector('#v3d');
    const scrub = root.querySelector('#v-scrub'); const tl = root.querySelector('#v-time'); const rd = root.querySelector('#v-read');
    const onFrame = (i) => { scrub.value = i; tl.textContent = `${fmt(r.series.t_min[i], 1)} min · ${r.series.stage[i]}`; rd.innerHTML = readout(r, i); state.frameIdx = i; };
    if (!webglAvailable()) { el.insertAdjacentHTML('afterbegin', `<div class="svgbox">${renderSchematic(r, i0)}</div>`); onFrame(i0); return; }
    scene = createVesselScene(el, r, { reducedMotion: state.settings.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches, onFrame });
    scene.setFrame(i0);
    scrub.oninput = () => scene.setFrame(+scrub.value);
    root.querySelector('#v-play').onclick = (e) => { const p = scene.play(); e.target.textContent = p ? '⏸ Pause' : '▶ Replay'; };
    root.querySelectorAll('[data-t]').forEach((b) => { b.onclick = () => {
      const t = b.dataset.t;
      if (t === 'reset') scene.reset();
      else if (t === 'snap') { const a = document.createElement('a'); a.href = scene.snapshot(); a.download = `aod-vessel-${r.heat_id}.png`; a.click(); }
      else if (t === 'schem') { download(`aod-schematic-${r.heat_id}.svg`, renderSchematic(r, scene.frame), 'image/svg+xml'); }
      else b.setAttribute('aria-pressed', String(scene[t]()));
    }; });
  } };
}
export const _set = set;
