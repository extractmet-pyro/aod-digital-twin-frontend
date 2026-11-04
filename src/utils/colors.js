export function tempHex(Tc) {
  const t = Math.min(1, Math.max(0, (Tc - 1450) / 320));
  const h = 8 + 38 * t; const l = 42 + 26 * t;
  return `hsl(${h} 100% ${l}%)`;
}
export const STAGE_COL = { decarb: '#E69F00', turndown: '#8fa1b5', reduction: '#56B4E9', trim: '#009E73', desulf: '#009E73', tap: '#CC79A7' };
