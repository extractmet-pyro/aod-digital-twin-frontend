// Client-side validation mirrors backend rules (backend remains authoritative; 4xx shown verbatim)
export const METAL = ['Fe', 'C', 'Cr', 'Ni', 'Mn', 'Si', 'Mo', 'N', 'S', 'P', 'O', 'Al', 'Ti', 'Cu'];
export const SLAG = ['CaO', 'SiO2', 'Cr2O3', 'FeO', 'MnO', 'MgO', 'Al2O3', 'CaF2', 'CaS', 'NiO', 'TiO2'];
export function validateCharge(ch) {
  const errs = {};
  if (!(ch.metal_mass_kg > 1000 && ch.metal_mass_kg <= 300000)) errs.metal_mass_kg = 'mass must be 1–300 t';
  if (!(ch.T_metal_C >= 1350 && ch.T_metal_C <= 1750)) errs.T_metal_C = 'T must be 1350–1750 °C';
  let s = 0;
  for (const [k, v] of Object.entries(ch.metal_wt || {})) {
    if (v === null || v === '' || v === undefined) { if (k === 'C' || k === 'Cr') errs['metal_' + k] = `${k} assay required`; continue; }
    if (v < 0 || v > 100) errs['metal_' + k] = 'outside 0–100'; s += Number(v);
  }
  if (s > 100) errs.metal_sum = `composition sums to ${s.toFixed(2)} wt% > 100`;
  if (ch.slag_mass_kg < 0) errs.slag_mass_kg = 'negative slag mass';
  return errs;
}
export function validateStage(st) {
  const e = [];
  if (st.kind === 'decarb' && !(st.O2_side_Nm3_min_t + st.O2_top_Nm3_min_t > 0)) e.push(`${st.name}: decarb stage needs O2`);
  if (['reduction', 'desulf', 'trim', 'turndown'].includes(st.kind) && (st.O2_side_Nm3_min_t > 0 || st.O2_top_Nm3_min_t > 0)) e.push(`${st.name}: no O2 allowed in ${st.kind}`);
  for (const k of ['O2_side_Nm3_min_t', 'O2_top_Nm3_min_t', 'inert_Nm3_min_t']) if (st[k] < 0) e.push(`${st.name}: negative ${k}`);
  return e;
}
