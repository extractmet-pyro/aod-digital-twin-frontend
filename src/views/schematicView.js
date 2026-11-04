import { state } from '../state/store.js';
import { page, card } from '../components/ui.js';
import { renderSchematic } from '../components/schematic.js';
import { download } from '../utils/export.js';
import { fmt } from '../utils/format.js';
import { originBanner, noRun, defaultFrame } from './_common.js';

export function render() {
  const r = state.run;
  if (!r) return { html: page('Process Schematic', '', noRun()), mount() {} };
  const n = r.series.t_s.length; const i0 = state.frameIdx ?? defaultFrame(r);
  const html = page('Process Schematic — big picture', 'all regions, utilities, instruments and live parameters', originBanner() +
    card('AOD converter, gas skid, bunkers, hood/off-gas, instrumentation', `<div class="row" style="margin-bottom:8px"><button class="btn" id="s-play">▶ Replay</button><input type="range" id="s-scrub" min="0" max="${n - 1}" value="${i0}" style="flex:1" aria-label="time"><span class="mono" id="s-t"></span><button class="btn" id="s-dl">Download SVG</button></div><div class="svgbox" id="s-svg"></div>`), '');
  return { html, mount(root) {
    const sv = root.querySelector('#s-svg'); const sc = root.querySelector('#s-scrub'); const tt = root.querySelector('#s-t');
    const draw = (i) => { sv.innerHTML = renderSchematic(r, i); tt.textContent = `${fmt(r.series.t_min[i], 1)} min`; state.frameIdx = i; };
    draw(i0); sc.oninput = () => draw(+sc.value);
    let timer = null;
    root.querySelector('#s-play').onclick = (e) => {
      if (timer) { clearInterval(timer); timer = null; e.target.textContent = '▶ Replay'; return; }
      let i = +sc.value >= n - 1 ? 0 : +sc.value; e.target.textContent = '⏸ Pause';
      timer = setInterval(() => { i += 2; if (i >= n) { clearInterval(timer); timer = null; e.target.textContent = '▶ Replay'; return; } sc.value = i; draw(i); }, 80);
    };
    root.querySelector('#s-dl').onclick = () => download(`aod-schematic-${r.heat_id}.svg`, renderSchematic(r, +sc.value), 'image/svg+xml');
  } };
}
