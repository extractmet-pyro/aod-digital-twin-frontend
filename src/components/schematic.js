import { tempHex } from '../utils/colors.js';

const f = (v, d = 2) => (v === null || v === undefined || Number.isNaN(v)) ? '—' : Number(v).toFixed(d);

function box(x, y, w, h, title, rows, col = '#3fb6ff') {
  const lines = rows.map((r, i) => `<text x="${x + 10}" y="${y + 36 + i * 16}" font-size="11.5" fill="#c9d6e3">${r[0]}</text><text x="${x + w - 10}" y="${y + 36 + i * 16}" font-size="11.5" text-anchor="end" fill="#ffffff" font-family="IBM Plex Mono, monospace">${r[1]}</text>`).join('');
  return `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="#0f1720" stroke="${col}" stroke-opacity=".55"/><rect x="${x}" y="${y}" width="${w}" height="22" rx="8" fill="${col}" fill-opacity=".18"/><text x="${x + 10}" y="${y + 15}" font-size="12" font-weight="700" fill="${col}">${title}</text>${lines}</g>`;
}
function valve(x, y, col) { return `<path d="M${x - 7} ${y - 6} L${x + 7} ${y + 6} L${x + 7} ${y - 6} L${x - 7} ${y + 6} Z" fill="${col}" fill-opacity=".25" stroke="${col}" stroke-width="1.4"/>`; }
function arrow(x1, y1, x2, y2, col = '#8fa1b5', w = 2, dash = '') { return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="${w}" ${dash ? `stroke-dasharray="${dash}"` : ''} marker-end="url(#ah)"/>`; }
function tag(x, y, t, v, col = '#E69F00') { return `<g><circle cx="${x}" cy="${y}" r="17" fill="#0f1720" stroke="${col}" stroke-width="1.5"/><text x="${x}" y="${y - 2}" font-size="9" text-anchor="middle" fill="${col}" font-weight="700">${t}</text><text x="${x}" y="${y + 9}" font-size="8.5" text-anchor="middle" fill="#fff">${v}</text></g>`; }

/** Full process schematic with all regions and live parameters at frame i. */
export function renderSchematic(run, i) {
  const S = run.series; const sm = run.summary; const g = sm.geometry;
  const k = Math.max(0, Math.min(S.t_s.length - 1, i ?? S.t_s.length - 1));
  const add = {};
  for (const e of sm.events) if (e.kind === 'addition' && e.t_s <= S.t_s[k] + 1e-6) add[e.material] = (add[e.material] || 0) + e.kg;
  const Tm = S.T_metal_C[k];
  const metalCol = tempHex(Tm);
  // vessel drawing coordinates
  const cx = 600; const yb = 655; const sc = Math.min(185 / (g.inner_diameter_m / 2 + g.lining_total_m), 330 / (g.vessel_inner_height_m * 0.82)); // px per m (fits any capacity)
  const rIn = g.inner_diameter_m / 2 * sc; const lin = g.lining_total_m * sc; const Hh = g.vessel_inner_height_m * sc * 0.82;
  const rM = g.mouth_diameter_m / 2 * sc; const yCone = yb - Hh * 0.62; const yTop = yb - Hh;
  const layer = (o) => `M${cx - rIn - o} ${yb + o * 0.3} L${cx - rIn - o} ${yCone} L${cx - rM - o} ${yTop} L${cx + rM + o} ${yTop} L${cx + rIn + o} ${yCone} L${cx + rIn + o} ${yb + o * 0.3} Q${cx + rIn + o} ${yb + o} ${cx} ${yb + o} Q${cx - rIn - o} ${yb + o} ${cx - rIn - o} ${yb + o * 0.3} Z`;
  const lay = g.lining; const tot = lay.reduce((s, l) => s + l.thickness_m, 0);
  const tWork = lay[0].thickness_m / tot * lin; const tSafe = (lay[1]?.thickness_m || 0) / tot * lin;
  const depth = S.bath_depth_m[k] * sc * 0.82; const slagT = Math.max(6, S.slag_kg[k] / 2900 / (Math.PI * (g.inner_diameter_m / 2) ** 2) * sc * 0.82);
  const ySurf = yb - depth; const ySlag = ySurf - slagT;
  const fl = { O2: S.O2_side_Nm3_min[k], Ar: S.Ar_Nm3_min[k], N2: S.N2_Nm3_min[k], top: S.O2_top_Nm3_min[k] };
  const tilted = S.stage_kind[k] === 'turndown' || S.stage_kind[k] === 'tap';
  const bubbles = Array.from({ length: Math.round(Math.min(60, (fl.O2 + fl.Ar + fl.N2) / 2.2)) }, (_, j) => {
    const yy = yb - 30 - ((j * 37) % Math.max(10, depth - 30)); const xx = cx - rIn + 30 + ((j * 53) % (rIn * 0.9)) + (yb - yy) * 0.35;
    return `<circle cx="${xx}" cy="${yy}" r="${2 + (j % 3)}" fill="#ffe7c2" fill-opacity=".55"/>`;
  }).join('');
  const bunk = [['Lime', 'lime'], ['Dolime', 'dolime'], ['CaF₂', 'fluorspar'], ['FeSi75', 'FeSi75'], ['Alloys', ['FeCr_LC', 'Ni', 'FeMo', 'Mn_EL', 'FeTi']], ['Scrap', ['SS_scrap', 'Fe_scrap']]];
  const bunkers = bunk.map(([n, m], j) => {
    const kg = Array.isArray(m) ? m.reduce((s, x) => s + (add[x] || 0), 0) : (add[m] || 0);
    const x = 40 + j * 74;
    return `<g><path d="M${x} 150 h60 v40 l-18 22 h-24 l-18 -22 z" fill="#18212c" stroke="#56B4E9" stroke-opacity=".6"/><text x="${x + 30}" y="168" font-size="11" text-anchor="middle" fill="#dbe7f3" font-weight="600">${n}</text><text x="${x + 30}" y="183" font-size="10" text-anchor="middle" fill="#E69F00" font-family="IBM Plex Mono">${kg ? Math.round(kg) + ' kg' : '—'}</text></g>`;
  }).join('');
  const flowsheet = [['DRI (optional)', '#7d8a99'], ['EAF / IF melting', '#D55E00'], ['Transfer ladle', '#E69F00'], ['AOD converter', '#ff8a1f'], ['LF / CC interface', '#56B4E9']]
    .map(([t, c], j) => `<g><rect x="${30 + j * 232}" y="18" width="190" height="34" rx="17" fill="${c}" fill-opacity=".14" stroke="${c}"/><text x="${125 + j * 232}" y="40" font-size="12.5" text-anchor="middle" fill="#e7eef6" font-weight="${j === 3 ? 700 : 500}">${t}</text>${j < 4 ? arrow(222 + j * 232, 35, 260 + j * 232, 35, '#8fa1b5') : ''}</g>`).join('');
  const lance = g.top_lance_installed ? `<rect x="${cx - 5}" y="70" width="10" height="${Math.max(10, ySlag - 90 - 70)}" fill="#c9d3dd"/><path d="M${cx - 5} ${ySlag - 90} L${cx - 26} ${ySlag - 10} L${cx + 26} ${ySlag - 10} L${cx + 5} ${ySlag - 90} Z" fill="#56B4E9" fill-opacity="${fl.top > 0 ? 0.35 : 0.05}"/><text x="${cx + 14}" y="96" font-size="11" fill="#56B4E9">Top O₂ lance (AOD-L) ${f(fl.top, 0)} Nm³/min</text>` : `<text x="${cx}" y="98" font-size="10.5" fill="#5f7186" text-anchor="middle">No top lance (side-blown AOD)</text>`;
  const tuyY = yb - 0.3 * sc * 0.82 - 8;
  return `<svg viewBox="0 0 1200 760" class="schematic" role="img" aria-label="AOD process schematic with live parameters">
  <defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#8fa1b5"/></marker>
  <linearGradient id="metalG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${metalCol}"/><stop offset="1" stop-color="#7a2400"/></linearGradient>
  <linearGradient id="slagG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a4426"/><stop offset="1" stop-color="#8a5a26"/></linearGradient>
  <pattern id="brick" width="14" height="8" patternUnits="userSpaceOnUse"><rect width="14" height="8" fill="#7a3f22"/><path d="M0 4 H14 M7 0 V4 M0 4 V8" stroke="#4a2614" stroke-width="1"/></pattern>
  <pattern id="brick2" width="12" height="7" patternUnits="userSpaceOnUse"><rect width="12" height="7" fill="#8f826e"/><path d="M0 3.5 H12 M6 0 V3.5" stroke="#5f5648" stroke-width="1"/></pattern></defs>
  <rect width="1200" height="760" fill="#0b1016"/>
  ${flowsheet}
  <text x="30" y="72" font-size="11" fill="#8fa1b5">Material flow: DRI (if used) is melted upstream in the EAF/IF — the AOD refines molten stainless steel (decarburisation, reduction, desulphurisation, trimming) and taps to ladle.</text>
  ${bunkers}
  <path d="M${40 + 5 * 74 + 60} 200 L${cx - rM - 30} ${yTop - 46}" stroke="#56B4E9" stroke-width="7" stroke-opacity=".35"/><text x="300" y="232" font-size="11" fill="#8fa1b5">weigh hoppers → additions chute</text>
  <g opacity="${tilted ? 0.85 : 1}" transform="${tilted ? `rotate(-18 ${cx} ${yCone})` : ''}">
    <path d="${layer(lin)}" fill="#3d4652" stroke="#8aa0b8" stroke-width="1.5"/>
    <path d="${layer(tWork + tSafe)}" fill="url(#brick2)"/>
    <path d="${layer(tWork)}" fill="url(#brick)"/>
    <path d="${layer(0)}" fill="#120c08"/>
    <rect x="${cx - rIn + 1}" y="${ySurf}" width="${2 * rIn - 2}" height="${depth}" fill="url(#metalG)"/>
    <path d="M${cx - rIn + 1} ${yb - 4} Q${cx} ${yb + 6} ${cx + rIn - 1} ${yb - 4} L${cx + rIn - 1} ${ySurf} L${cx - rIn + 1} ${ySurf} Z" fill="url(#metalG)" opacity=".9"/>
    <rect x="${cx - rIn + 1}" y="${ySlag}" width="${2 * rIn - 2}" height="${slagT}" fill="url(#slagG)" stroke="#c48a3a" stroke-opacity=".5"/>
    <ellipse cx="${cx - rIn * 0.35}" cy="${yb - depth * 0.45}" rx="${rIn * 0.42}" ry="${depth * 0.48}" fill="#fff4dc" fill-opacity=".07" stroke="#ffe7c2" stroke-dasharray="4 4" stroke-opacity=".35"/>
    ${bubbles}
    ${[0, 1, 2].map((j) => `<rect x="${cx - rIn - lin - 26}" y="${tuyY - 14 + j * 12}" width="${lin + 30}" height="5" fill="#b7c3d0"/>`).join('')}
    <circle cx="${cx + rIn + lin + 18}" cy="${yCone + 40}" r="13" fill="#4b5867" stroke="#8aa0b8"/><circle cx="${cx - rIn - lin - 18}" cy="${yCone + 40}" r="13" fill="#4b5867" stroke="#8aa0b8"/>
  </g>
  <path d="M${cx - rM * 1.9} ${yTop - 40} L${cx - rM * 1.1} ${yTop - 120} L${cx + rM * 1.1} ${yTop - 120} L${cx + rM * 1.9} ${yTop - 40}" fill="none" stroke="#5c6f84" stroke-width="5"/>
  <path d="M${cx + rM * 1.1} ${yTop - 110} L960 ${yTop - 170} L1080 ${yTop - 170}" fill="none" stroke="#5c6f84" stroke-width="16" stroke-opacity=".7"/>
  ${lance}
  ${arrow(cx, ySlag - 14, cx, yTop - 70, '#E69F00', 2.5, '6 4')}
  <text x="${cx + 8}" y="${yTop - 54}" font-size="11" fill="#E69F00">vessel off-gas ${f(S.offgas_vessel_Nm3_min[k], 0)} Nm³/min · ${f(S.T_offgas_C[k], 0)} °C</text>
  ${tag(980, yTop - 205, 'AI', `CO ${f(S.an_CO[k], 0)}%`, '#0072B2')}${tag(1030, yTop - 205, 'AI', `CO₂ ${f(S.an_CO2[k], 0)}%`, '#0072B2')}${tag(1080, yTop - 205, 'FI', `${f(S.offgas_duct_Nm3_min[k], 0)}`, '#0072B2')}
  <text x="905" y="${yTop - 140}" font-size="11" fill="#8fa1b5">duct: air ingress + hood combustion → cleaning</text>
  <g>
    <text x="40" y="${tuyY - 120}" font-size="12" fill="#e7eef6" font-weight="700">Gas skid → side tuyeres (${g.n_tuyeres}× Ø${g.tuyere_inner_diameter_mm} mm)</text>
    ${[['O₂', fl.O2, '#56B4E9', 0], ['Ar', fl.Ar, '#CC79A7', 1], ['N₂', fl.N2, '#009E73', 2]].map(([n, v, c, j]) => `
      <line x1="60" y1="${tuyY - 90 + j * 34}" x2="${cx - rIn - lin - 30}" y2="${tuyY - 90 + j * 34}" stroke="${c}" stroke-width="${v > 0 ? 3 : 1}" stroke-opacity="${v > 0 ? 0.9 : 0.25}"/>
      <line x1="${cx - rIn - lin - 30}" y1="${tuyY - 90 + j * 34}" x2="${cx - rIn - lin - 30}" y2="${tuyY}" stroke="${c}" stroke-width="${v > 0 ? 3 : 1}" stroke-opacity="${v > 0 ? 0.9 : 0.25}"/>
      ${valve(150, tuyY - 90 + j * 34, c)}${tag(210, tuyY - 90 + j * 34, 'FIC', f(v, 0), c)}
      <text x="40" y="${tuyY - 86 + j * 34}" font-size="12" fill="${c}" font-weight="700">${n}</text>`).join('')}
    <text x="250" y="${tuyY + 40}" font-size="11" fill="#8fa1b5">O₂ : inert = ${f(S.O2_to_inert[k], 2)} · stirring ${f(S.stirring_W_t[k] / 1000, 1)} kW/t · mixing ${f(S.mixing_time_s[k], 0)} s</text>
  </g>
  ${tag(cx + rIn + lin + 60, ySurf - 30, 'TE', `${f(Tm, 0)}°C`, '#ff8a1f')}${tag(cx + rIn + lin + 60, ySurf + 20, 'AS', 'sample', '#ff8a1f')}${tag(cx + rIn + lin + 60, yCone - 20, 'TI', `shell ${f(S.T_shell_C[k], 0)}`, '#CC79A7')}
  <path d="M${cx + rIn - 40} ${yb + 40} h120 l-14 60 h-92 z" fill="#18212c" stroke="#8aa0b8"/><text x="${cx + rIn + 20}" y="${yb + 80}" font-size="11" fill="#dbe7f3" text-anchor="middle">Ladle (tap)</text>
  <text x="${cx - rIn - lin - 10}" y="${yb + lin + 22}" font-size="11" fill="#8fa1b5" text-anchor="end">Ø ${f(g.inner_diameter_m, 2)} m · bath ${f(S.bath_depth_m[k], 2)} m · lining ${f(g.lining_total_m * 1000, 0)} mm · ${g.capacity_t} t ${g.vessel_type}</text>
  <text x="${cx - rIn - lin - 4}" y="${yCone - 60}" font-size="10.5" fill="#d9a07a" text-anchor="end">Working lining (${lay[0].label}) · hot face ${f(S.T_hotface_C[k], 0)} °C</text>
  <text x="${cx - rIn - lin - 4}" y="${yCone - 44}" font-size="10.5" fill="#bfb39f" text-anchor="end">Safety lining · steel shell · trunnion ring</text>
  <text x="${cx - rIn * 0.35}" y="${yb - depth * 0.45}" font-size="10.5" fill="#fff4dc" text-anchor="middle">gas plume / emulsion</text>
  <text x="${cx + rIn * 0.45}" y="${ySurf + depth * 0.55}" font-size="12" fill="#1a0a00" font-weight="700" text-anchor="middle">METAL BATH</text>
  <text x="${cx + rIn * 0.45}" y="${ySlag + slagT / 2 + 4}" font-size="10.5" fill="#ffe2b0" text-anchor="middle">SLAG</text>
  ${box(860, 250, 300, 176, 'Metal bath', [['Mass', `${f(S.metal_kg[k] / 1000, 2)} t`], ['Temperature', `${f(Tm, 0)} °C`], ['C / Cr', `${f(S.m_C[k], 4)} / ${f(S.m_Cr[k], 2)} %`], ['Ni / Mn / Mo', `${f(S.m_Ni[k], 2)} / ${f(S.m_Mn[k], 2)} / ${f(S.m_Mo[k], 2)}`], ['Si / N / S', `${f(S.m_Si[k], 3)} / ${f(S.m_N[k] * 1e4, 0)} / ${f(S.m_S[k] * 1e4, 0)} ppm`], ['C_eq · T_crit', `${f(S.C_eq_wt[k], 3)} % · ${f(S.T_critical_C[k], 0)} °C`], ['dC/dt', `${f(S.dC_dt_pct_min[k], 3)} %/min`], ['Limited by', S.decarb_limited_by[k] || '—']], '#ff8a1f')}
  ${box(860, 436, 300, 160, 'Slag', [['Mass', `${f(S.slag_kg[k] / 1000, 2)} t`], ['CaO / SiO₂', `${f(S.s_CaO[k], 1)} / ${f(S.s_SiO2[k], 1)} %`], ['Cr₂O₃ / FeO / MnO', `${f(S.s_Cr2O3[k], 1)} / ${f(S.s_FeO[k], 1)} / ${f(S.s_MnO[k], 1)}`], ['B₂ · Λ', `${f(S.B2[k], 2)} · ${f(S.optical_basicity[k], 3)}`], ['Viscosity (Riboud)', `${f(S.slag_viscosity_Pa_s[k], 3)} Pa·s`], ['Solid Cr₂O₃ frac.', `${f(100 * S.slag_solid_fraction[k], 1)} %`], ['Cr recovery', `${f(S.Cr_recovery_pct[k], 2)} %`]], '#c48a3a')}
  ${box(860, 606, 300, 140, 'Gas & heat', [['pCO bubble · P plume', `${f(S.pCO_atm[k], 2)} · ${f(S.P_plume_atm[k], 2)} atm`], ['O₂ to C efficiency', `${f(100 * S.eta_C_O2[k], 0)} %`], ['Vessel CO / CO₂', `${f(S.vg_CO[k], 0)} / ${f(S.vg_CO2[k], 0)} %`], ['C oxidation heat', `${f(S.q_C_oxidation_MW[k], 1)} MW`], ['Cr oxidation heat', `${f(S.q_Cr_oxidation_MW[k], 1)} MW`], ['Shell + mouth loss', `${f(-S.q_shell_loss_MW[k] - S.q_mouth_radiation_MW[k], 2)} MW`]], '#56B4E9')}
  <text x="40" y="754" font-size="11" fill="#5f7186">t = ${f(S.t_min[k], 1)} min · stage: ${S.stage[k]} · values from backend simulation (${run.data_origin}) · schematic not to scale vertically</text>
  </svg>`;
}
