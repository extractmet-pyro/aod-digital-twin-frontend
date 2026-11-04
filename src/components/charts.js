import { Chart, LineController, LineElement, PointElement, LinearScale, LogarithmicScale, CategoryScale, BarController, BarElement,
  DoughnutController, ArcElement, ScatterController, Filler, Legend, Tooltip, Title } from 'chart.js';

Chart.register(LineController, LineElement, PointElement, LinearScale, LogarithmicScale, CategoryScale, BarController, BarElement,
  DoughnutController, ArcElement, ScatterController, Filler, Legend, Tooltip, Title);

export const PAL = ['#E69F00', '#56B4E9', '#009E73', '#F0E442', '#0072B2', '#D55E00', '#CC79A7', '#BBBBBB', '#ff8a1f', '#9be564'];
const live = new Set();

function css(v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim() || '#8fa1b5'; }
export function destroyAll() { live.forEach((c) => c.destroy()); live.clear(); }
export function alpha(hex, a) { const h = hex.replace('#', ''); const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; }

function baseOpts({ xTitle, y, y2, legend = true, stacked = false, animation = false } = {}) {
  const grid = css('--border'); const tick = css('--muted');
  const ax = (t, extra = {}) => ({ title: { display: !!t, text: t, color: tick, font: { size: 11 } }, grid: { color: grid, drawTicks: false }, ticks: { color: tick, font: { size: 10.5 }, maxTicksLimit: 8 }, border: { color: grid }, stacked, ...extra });
  const scales = { x: { type: 'linear', ...ax(xTitle) }, y: ax(y?.title, { min: y?.min, max: y?.max, type: y?.log ? 'logarithmic' : 'linear' }) };
  if (y2) scales.y2 = { ...ax(y2.title, { min: y2.min, max: y2.max, type: y2.log ? 'logarithmic' : 'linear' }), position: 'right', grid: { drawOnChartArea: false, color: grid } };
  return {
    responsive: true, maintainAspectRatio: false, animation: animation ? { duration: 300 } : false, parsing: true, normalized: true,
    interaction: { mode: 'nearest', axis: 'x', intersect: false },
    plugins: {
      legend: { display: legend, labels: { color: tick, boxWidth: 14, boxHeight: 2, font: { size: 10.5 }, filter: (i) => !i.text?.startsWith('_') } },
      tooltip: { backgroundColor: '#0d1319ee', borderColor: grid, borderWidth: 1, titleFont: { size: 11 }, bodyFont: { size: 11 }, filter: (i) => !i.dataset.label?.startsWith('_'),
        callbacks: { label: (c) => `${c.dataset.label}: ${typeof c.parsed.y === 'number' ? (Math.abs(c.parsed.y) < 0.1 ? c.parsed.y.toPrecision(3) : c.parsed.y.toFixed(2)) : c.parsed.y}` } },
    },
    elements: { point: { radius: 0, hitRadius: 6 }, line: { tension: 0.15, borderWidth: 1.8 } },
    scales,
  };
}

const xy = (x, y) => x.map((v, i) => ({ x: v, y: y[i] }));

/** series: [{label, y, x?, color, dash, width, axis:'y2', fill, points, hidden, stepped}] ; bands: [{label, lo, hi, color}] ; hlines: [{y, label, color}] */
export function lineChart(canvas, { x, series = [], bands = [], hlines = [], xTitle = 'time (min)', y, y2, legend = true, marks = [] }) {
  const ds = [];
  for (const b of bands) {
    const bx = b.x || x;
    ds.push({ label: '_lo_' + b.label, data: xy(bx, b.lo), borderWidth: 0, pointRadius: 0, fill: false, yAxisID: b.axis || 'y' });
    ds.push({ label: b.label, data: xy(bx, b.hi), borderWidth: 0, pointRadius: 0, backgroundColor: alpha(b.color, 0.18), fill: '-1', yAxisID: b.axis || 'y' });
  }
  series.forEach((s, i) => {
    const c = s.color || PAL[i % PAL.length];
    ds.push({ label: s.label, data: xy(s.x || x, s.y), borderColor: c, backgroundColor: s.fill ? alpha(c, 0.25) : c, borderDash: s.dash || [], borderWidth: s.width || 1.8,
      pointRadius: s.points ? 3.5 : 0, pointStyle: s.pointStyle || 'circle', showLine: s.showLine !== false, fill: s.fill || false, yAxisID: s.axis || 'y', hidden: !!s.hidden, stepped: s.stepped || false, spanGaps: true });
  });
  const xs = x || series[0]?.x || [];
  const x0 = Math.min(...xs.filter((v) => v !== null)); const x1 = Math.max(...xs.filter((v) => v !== null));
  for (const h of hlines) ds.push({ label: h.label, data: [{ x: x0, y: h.y }, { x: x1, y: h.y }], borderColor: h.color || '#aaa', borderDash: [6, 4], borderWidth: 1.2, pointRadius: 0, yAxisID: h.axis || 'y' });
  for (const m of marks) ds.push({ label: m.label, data: m.points, borderColor: m.color, backgroundColor: m.color, showLine: false, pointRadius: 4.5, pointStyle: m.style || 'rectRot', yAxisID: m.axis || 'y' });
  const c = new Chart(canvas, { type: 'line', data: { datasets: ds }, options: baseOpts({ xTitle, y, y2, legend }) });
  live.add(c); return c;
}

export function barChart(canvas, { labels, sets, y, horizontal = false, stacked = false, legend = true }) {
  const o = baseOpts({ y, legend, stacked });
  o.scales.x = { ...o.scales.x, type: 'category' };
  if (horizontal) { o.indexAxis = 'y'; o.scales = { x: { ...o.scales.y, stacked }, y: { ...o.scales.x, stacked } }; }
  o.interaction = { mode: 'index', intersect: false };
  const c = new Chart(canvas, { type: 'bar', data: { labels, datasets: sets.map((s, i) => ({ label: s.label, data: s.data, backgroundColor: s.colors || alpha(s.color || PAL[i], 0.85), borderRadius: 3, maxBarThickness: 34 })) }, options: o });
  live.add(c); return c;
}

export function doughnut(canvas, { labels, data, colors }) {
  const c = new Chart(canvas, { type: 'doughnut', data: { labels, datasets: [{ data, backgroundColor: colors || PAL, borderColor: css('--panel'), borderWidth: 2 }] },
    options: { responsive: true, maintainAspectRatio: false, animation: false, cutout: '58%', plugins: { legend: { position: 'right', labels: { color: css('--muted'), font: { size: 10.5 }, boxWidth: 10 } } } } });
  live.add(c); return c;
}

export function scatter(canvas, { sets, xTitle, yTitle }) {
  const o = baseOpts({ xTitle, y: { title: yTitle } });
  o.interaction = { mode: 'nearest', intersect: true };
  const c = new Chart(canvas, { type: 'scatter', data: { datasets: sets.map((s, i) => ({ label: s.label, data: s.points, backgroundColor: s.color || PAL[i], pointRadius: s.r || 4, pointStyle: s.style || 'circle', showLine: !!s.line, borderColor: s.color || PAL[i] })) }, options: o });
  live.add(c); return c;
}
