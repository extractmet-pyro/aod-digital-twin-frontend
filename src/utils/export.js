export function download(name, text, type = 'text/plain') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
export function seriesToCSV(series, keys) {
  const ks = keys || Object.keys(series);
  const n = series[ks[0]]?.length || 0;
  const rows = [ks.join(',')];
  for (let i = 0; i < n; i++) rows.push(ks.map((k) => { const v = series[k][i]; return typeof v === 'string' ? `"${v}"` : (v ?? ''); }).join(','));
  return rows.join('\n');
}
export function tableToCSV(rows, cols) {
  return [cols.join(','), ...rows.map((r) => cols.map((c) => { const v = r[c]; return typeof v === 'object' && v !== null ? `"${JSON.stringify(v).replace(/"/g, "'")}"` : (v ?? ''); }).join(','))].join('\n');
}
