import { apiBase } from './client.js';

/** Replay a stored run over WebSocket (wss:// when the API is https). Falls back to polling the
 * stored run if the socket fails; reconnects with backoff up to 3 times. */
export function streamRun(heatId, runId, { speed = 120, onFrame, onEnd, onFallback } = {}) {
  const wsUrl = apiBase().replace(/^http/, 'ws') + `/v1/stream/${encodeURIComponent(heatId)}?run_id=${runId}&speed=${speed}`;
  let tries = 0; let closed = false; let ws;
  const open = () => {
    ws = new WebSocket(wsUrl);
    ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.type === 'frame') onFrame?.(m); if (m.type === 'end') { closed = true; onEnd?.(); } };
    ws.onerror = () => {};
    ws.onclose = () => { if (closed) return; if (++tries <= 3) setTimeout(open, 500 * 2 ** tries); else onFallback?.(); };
  };
  open();
  return { close() { closed = true; ws?.close(); } };
}
