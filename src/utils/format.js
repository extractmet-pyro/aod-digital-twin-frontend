export const fmt = (v, d = 2) => (v === null || v === undefined || Number.isNaN(v)) ? '—' : (typeof v === 'number' ? (Math.abs(v) >= 1e5 ? v.toExponential(2) : v.toFixed(d)) : String(v));
export const fmtInt = (v) => (v === null || v === undefined) ? '—' : Math.round(v).toLocaleString('en-US');
export const pct = (v, d = 1) => (v === null || v === undefined) ? '—' : `${v.toFixed(d)} %`;
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const sigfig = (v, n = 4) => (v === null || v === undefined) ? '—' : (v === 0 ? '0' : Number(v).toPrecision(n));
export const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
