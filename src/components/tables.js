import { esc, sigfig } from '../utils/format.js';

/** cols: [{key, label, fmt?, cls?, txt?}] */
export function table(rows, cols, { maxH } = {}) {
  const th = cols.map((c) => `<th>${esc(c.label ?? c.key)}</th>`).join('');
  const tr = rows.map((r) => `<tr>${cols.map((c) => {
    let v = typeof c.get === 'function' ? c.get(r) : r[c.key];
    const cls = typeof c.cls === 'function' ? c.cls(r) : (c.cls || '');
    if (c.fmt) v = c.fmt(v, r); else if (typeof v === 'number') v = sigfig(v, 5);
    else if (v && typeof v === 'object') v = Object.entries(v).filter(([, x]) => x).slice(0, 14).map(([k, x]) => `${k} ${typeof x === 'number' ? sigfig(x, 3) : x}`).join(' · ');
    return `<td class="${c.txt ? 'txt ' : ''}${cls}">${c.html ? v : esc(v ?? '—')}</td>`;
  }).join('')}</tr>`).join('');
  return `<div class="tbl-wrap" ${maxH ? `style="max-height:${maxH}px"` : ''}><table class="t"><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table></div>`;
}
