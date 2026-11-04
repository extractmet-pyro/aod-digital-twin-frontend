import { state } from '../state/store.js';
import { page, card, spinner, empty } from '../components/ui.js';
import { table } from '../components/tables.js';
import { apiBase, setApiBase, setApiKey, api } from '../api/client.js';
import { checkBackend, loadAudit, saveSettings } from '../state/actions.js';
import { esc } from '../utils/format.js';
import { toast } from '../components/alerts.js';

export function render() {
  const s = state.settings; const a = state.audit;
  const html = page('Settings & Audit', 'connectivity · roles · units · accessibility · audit trail · safety boundary', `<div class="grid g2">
    ${card('Backend connection', `<div class="form-grid"><label class="f" style="grid-column:span 2">API base URL<input id="st-url" value="${esc(apiBase())}"></label><label class="f">API key (optional)<input id="st-key" type="password" placeholder="X-API-Key"></label></div>
      <div class="btns" style="margin-top:8px"><button class="btn primary" id="st-save">Save & test</button><span class="chip"><span class="dot ${state.backend.online ? 'ok' : 'bad'}"></span>${state.backend.online ? 'online' : 'offline'}</span></div>
      <div class="note" style="margin-top:6px">Local: <code>http://localhost:8000</code>. Render: <code>https://YOUR-BACKEND.onrender.com</code> (and add this frontend origin to the backend <code>CORS_ALLOWED_ORIGINS</code>). Free Render instances spin down — first call may take ~1 min.</div>`)}
    ${card('Operator & display', `<div class="form-grid"><label class="f">Operator<input id="st-op" value="${esc(s.operator)}"></label>
      <label class="f">Role<select id="st-role">${['viewer', 'operator', 'process_engineer', 'shift_supervisor', 'admin'].map((r) => `<option ${r === s.role ? 'selected' : ''}>${r}</option>`).join('')}</select></label>
      <label class="f">Theme<select id="st-theme"><option ${s.theme === 'dark' ? 'selected' : ''}>dark</option><option ${s.theme === 'light' ? 'selected' : ''}>light</option></select></label>
      <label class="row"><input type="checkbox" id="st-rm" ${s.reducedMotion ? 'checked' : ''}> reduced motion</label></div><div class="note">Roles are demo-level (headers); production uses site IdP/RBAC. Approval requires shift_supervisor or above.</div>`)}
    ${card('Safety & deployment boundary', `<div class="note">${esc(state.meta?.safety_statement || 'Simulation, visualisation, analytics and advisory only. No public-Internet path to actuators. CLOSED_LOOP disabled.')}</div><div class="note" style="margin-top:6px">${esc(state.meta?.process_definition || 'AOD refines molten stainless steel; DRI is never charged to the AOD.')}</div>`)}
    ${card('Audit trail (hash-chained)', `<div class="row"><input id="st-heat" value="${esc(state.rec?.heat_id || state.run?.heat_id || '')}"><button class="btn" id="st-aud">Load audit</button>${spinner(state.busy.audit)}</div>
      ${a ? `<div class="note">chain intact: <b class="${a.chain_intact ? 'st-within' : 'st-bad'}">${a.chain_intact}</b></div>${table(a.events, [{ key: 'ts_utc' }, { key: 'actor' }, { key: 'role' }, { key: 'action' }, { key: 'details', txt: true }, { key: 'hash', fmt: (v) => v.slice(0, 12) + '…' }], { maxH: 300 })}` : empty('No audit loaded.')}`)}
    ${card('Data dictionary', `<button class="btn" id="st-dd">Load data dictionary</button><div id="st-ddv"></div>`, { cls: 'spanall' })}</div>`);
  return { html, mount(root) {
    root.querySelector('#st-save').onclick = async () => { setApiBase(root.querySelector('#st-url').value); const k = root.querySelector('#st-key').value; if (k) setApiKey(k); await checkBackend(); toast(state.backend.online ? 'Backend reachable' : 'Backend not reachable', state.backend.online ? 'ok' : 'bad'); };
    root.querySelector('#st-op').onchange = (e) => saveSettings({ operator: e.target.value });
    root.querySelector('#st-role').onchange = (e) => saveSettings({ role: e.target.value });
    root.querySelector('#st-theme').onchange = (e) => saveSettings({ theme: e.target.value });
    root.querySelector('#st-rm').onchange = (e) => saveSettings({ reducedMotion: e.target.checked });
    root.querySelector('#st-aud').onclick = () => loadAudit(root.querySelector('#st-heat').value);
    root.querySelector('#st-dd').onclick = async () => { try { const d = await api.dictionary(); root.querySelector('#st-ddv').innerHTML = table(d.items, [{ key: 'name' }, { key: 'unit', txt: true }, { key: 'limits' }, { key: 'provenance', txt: true }, { key: 'sampling_interval' }, { key: 'uncertainty' }, { key: 'editable_role' }, { key: 'historian_tag', txt: true }], { maxH: 400 }); } catch (e) { toast('Data dictionary needs the backend', 'bad'); } };
  } };
}
