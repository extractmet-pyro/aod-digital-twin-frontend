// Display unit conversion (internal API units: degC, wt%, kg, Nm3/min, MJ)
export const units = { temp: 'C', comp: 'wt', mass: 't' };
export function setUnits(u) { Object.assign(units, u); }
export const T = (c) => units.temp === 'K' ? c + 273.15 : c;
export const Tu = () => units.temp === 'K' ? 'K' : '°C';
export const ppm = (wt) => wt * 1e4;
// N, S, O shown in ppm when composition unit is 'ppm-trace'
export function compVal(el, wt) { return (units.comp === 'ppm' && ['N', 'S', 'O', 'C'].includes(el)) ? ppm(wt) : wt; }
export function compUnit(el) { return (units.comp === 'ppm' && ['N', 'S', 'O', 'C'].includes(el)) ? 'ppm' : 'wt%'; }
export const kgToT = (kg) => kg / 1000;
