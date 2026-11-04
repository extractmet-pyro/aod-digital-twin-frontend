import { describe, expect, it } from 'vitest';
import { validateCharge, validateStage } from '../../src/utils/validators.js';
import { seriesToCSV, tableToCSV } from '../../src/utils/export.js';
import { fmt, esc } from '../../src/utils/format.js';
import { checkRun } from '../../src/api/contracts.js';
import fixture from '../../src/fixtures/demo-run.json';

describe('validators', () => {
  it('flags missing critical assay and >100 %', () => {
    const e = validateCharge({ metal_mass_kg: 90000, T_metal_C: 1540, metal_wt: { C: null, Cr: 60, Ni: 45 }, slag_mass_kg: 0 });
    expect(e.metal_C).toBeTruthy(); expect(e.metal_sum).toBeTruthy();
  });
  it('accepts a valid charge', () => {
    expect(Object.keys(validateCharge({ metal_mass_kg: 90000, T_metal_C: 1540, metal_wt: { C: 1.6, Cr: 18.5 }, slag_mass_kg: 800 }))).toHaveLength(0);
  });
  it('rejects contradictory gas schedules', () => {
    expect(validateStage({ name: 'r', kind: 'reduction', O2_side_Nm3_min_t: 0.4, O2_top_Nm3_min_t: 0, inert_Nm3_min_t: 0.5 })).toHaveLength(1);
    expect(validateStage({ name: 'd', kind: 'decarb', O2_side_Nm3_min_t: 0, O2_top_Nm3_min_t: 0, inert_Nm3_min_t: 0.5 })).toHaveLength(1);
  });
});

describe('exports & formatting', () => {
  it('CSV has header + one row per sample', () => {
    const csv = seriesToCSV({ t: [0, 1, 2], C: [1.6, 1.5, 1.4] });
    expect(csv.split('\n')).toHaveLength(4);
    expect(tableToCSV([{ a: 1, b: { x: 1 } }], ['a', 'b']).split('\n')[1]).toContain('1');
  });
  it('escapes HTML and formats numbers', () => { expect(esc('<b>')).toBe('&lt;b&gt;'); expect(fmt(1.23456, 2)).toBe('1.23'); expect(fmt(null)).toBe('—'); });
});

describe('API contract (bundled fixture produced by backend)', () => {
  it('fixture satisfies the run contract and closes balances', () => {
    expect(() => checkRun(fixture)).not.toThrow();
    expect(fixture.balance_residual.pass).toBe(true);
    const n = fixture.series.t_s.length;
    for (const k of ['m_C', 'm_Cr', 'T_metal_C', 's_Cr2O3', 'bath_depth_m', 'O2_side_Nm3_min']) expect(fixture.series[k]).toHaveLength(n);
    expect(fixture.summary.inputs.length).toBeGreaterThan(3);
    expect(fixture.data_origin).toContain('SYNTHETIC');
  });
});
