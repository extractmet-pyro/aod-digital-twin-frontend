import { apiBase } from '../api/client.js';
import { state } from '../state/store.js';
import { esc } from '../utils/format.js';
import { saveSettings } from '../state/actions.js';

export function renderHeader(el) {
  const r = state.run;
  const b = state.backend;
  const fi = state.frameIdx ?? (r ? r.series.t_s.length - 1 : 0);
  const stage = r ? r.series.stage[fi] : '—';
  const fresh = b.lastOk ? `${Math.round((Date.now() - b.lastOk) / 1000)} s` : '—';
  const origin = state.runOrigin === 'OFFLINE FIXTURE' ? '<span class="tag demo">OFFLINE FIXTURE</span>' : '';
  el.innerHTML = `
    <div class="brand"><div class="logo" aria-hidden="true"></div><div><div class="t1">AOD Stainless-Steel Refining Digital Twin</div><div class="t2">Extractmet Private Limited · simulator · state estimator · advisory MPC</div></div></div>
    <div class="chips">
      <span class="chip">Heat <b>${esc(r?.heat_id || '—')}</b></span>
      <span class="chip">Grade <b>${esc(r?.grade_id || '—')}</b></span>
      <span class="chip">Stage <b>${esc(stage)}</b></span>
      <label class="chip">Mode <select id="hdr-mode" aria-label="Operating mode" style="padding:1px 4px">
        ${['SIMULATION', 'SHADOW', 'ADVISORY'].map((m) => `<option ${state.settings.mode === m ? 'selected' : ''}>${m}</option>`).join('')}
        <option disabled>CLOSED_LOOP (disabled)</option></select></label>
      <span class="chip" title="${esc(apiBase())}"><span class="dot ${b.online ? 'ok' : (b.checked ? 'bad' : '')}"></span>API <b>${b.online ? 'online' : (b.checked ? 'offline' : '…')}</b></span>
      <span class="chip" title="time since last successful API contact">Fresh <b>${fresh}</b></span>
      <span class="chip">Model <b>${esc((r?.model_version || 'aod-physics').split('+')[0])}</b></span>
      <span class="chip">Role <b>${esc(state.settings.role)}</b></span>
      ${origin}
    </div>`;
  el.querySelector('#hdr-mode').onchange = (e) => saveSettings({ mode: e.target.value });
}
