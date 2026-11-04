import { state } from '../state/store.js';

export const VIEWS = [
  ['Operate', [['overview', '◉', 'Overview'], ['vessel', '⬢', '3D Vessel'], ['schematic', '▦', 'Process Schematic'], ['design', '⌀', 'Furnace Design'], ['recipe', '✎', 'Charge & Recipe'], ['trends', '〰', 'Live / Replay Trends']]],
  ['Balances', [['balance', '⚖', 'Mass Balance'], ['heat', '♨', 'Heat Balance'], ['slag', '◒', 'Slag & Recovery'], ['offgas', '☁', 'Off-Gas'], ['thermo', '∆G', 'Thermo Explorer']]],
  ['Intelligence', [['ml', 'σ', 'ML & Confidence'], ['mpc', '⌖', 'MPC Advisor'], ['scenarios', '⑂', 'Scenario Lab'], ['economics', '$', 'Economics & CO₂']]],
  ['Records', [['reports', '⎙', 'Reports'], ['settings', '⚙', 'Settings & Audit']]],
];

export function renderNav(el, go) {
  el.innerHTML = VIEWS.map(([sec, items]) => `<div class="sec">${sec}</div>` + items.map(([id, ico, lbl]) =>
    `<button data-v="${id}" ${state.view === id ? 'aria-current="page"' : ''} title="${lbl}"><span class="ico" aria-hidden="true">${ico}</span><span class="lbl">${lbl}</span></button>`).join('')).join('');
  el.querySelectorAll('button').forEach((b) => { b.onclick = () => go(b.dataset.v); });
}
