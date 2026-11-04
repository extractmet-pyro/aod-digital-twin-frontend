import { esc } from '../utils/format.js';
import { STAGE_COL } from '../utils/colors.js';

let cid = 0;
export const uid = (p = 'c') => `${p}${++cid}`;
export const page = (title, sub, body, actions = '') => `<div class="page-title"><h1>${esc(title)}</h1><span class="sub">${sub}</span><div class="btns" style="margin-left:auto">${actions}</div></div>${body}`;
export const card = (title, inner, { hint = '', cls = '', id = '' } = {}) => `<section class="card ${cls}" ${id ? `id="${id}"` : ''}><h3>${title}${hint ? `<span class="hint">${hint}</span>` : ''}</h3>${inner}</section>`;
export const canvas = (id, size = '') => `<div class="chart-box ${size}"><canvas id="${id}" role="img" aria-label="${id} chart"></canvas></div>`;
export const kpi = (k, v, u = '', s = '', cls = '') => `<div class="kpi ${cls}"><div class="k">${esc(k)}</div><div class="v">${v}<span class="u">${esc(u)}</span></div>${s ? `<div class="s">${s}</div>` : ''}</div>`;
export const banner = (html, cls = '') => `<div class="banner ${cls}">${html}</div>`;
export const empty = (t) => `<div class="empty">${t}</div>`;
export const spinner = (on, text = 'Computing…') => on ? `<div class="loading-overlay"><span class="spinner"></span>${esc(text)}</div>` : '';

export function stageTimeline(run) {
  const st = run.summary.stages; const T = run.process_time_s || run.series.t_s.at(-1);
  return `<div class="timeline" role="img" aria-label="stage timeline">${st.filter((s) => (s.duration_s ?? 0) > 0).map((s) => `<div style="width:${100 * s.duration_s / T}%;background:${STAGE_COL[s.kind] || '#888'}" title="${esc(s.name)} · ${(s.duration_s / 60).toFixed(1)} min · ${esc(s.end_reason || '')}">${esc(s.name)}</div>`).join('')}</div>`;
}

export function stageMarks(run) {
  return run.summary.stages.filter((s) => s.t_start_s > 0).map((s) => s.t_start_s / 60);
}
