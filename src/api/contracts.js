/** API contract notes (mirrors backend Pydantic schemas; see docs/API_BINDINGS.md).
 * SimulationRunRequest: { grade_id, mode, charge{heat_id, metal_mass_kg, T_metal_C, metal_wt{}, slag_mass_kg, slag_wt{}}, design{}, recipe?, params{}, dt_s, output_interval_s, uncertainty_samples, extra_additions[], prices{} }
 * SimulationRunResponse: { run_id, heat_id, grade_id, timestamp_utc, process_time_s, mode, model_version, recipe_version, data_origin, quality,
 *   unit_system, normal_reference, solver, balance_residual, series{col:[]}, summary{final_metal, final_slag, inputs, outputs, element_closure,
 *   energy_closure, heat_balance_MJ, compliance, kpis, stages, events, samples, warnings, lining_profile, geometry}, uncertainty, economics, warnings, assumptions }
 * MPCRequest: { base: SimulationRunRequest, decision_time_s, weights{}, estimator_sigma_C_wt?, data_fresh, analyzer_ok, max_evals?, robust_samples }
 * Recommendation: { recommendation_id, advisory_only:true, actuation:'NONE…', status, gate, proposed_actions[], expected_benefit, uncertainty, active_constraints, reason_codes, alternatives, pareto, trajectories, required_approval_role, expires_utc }
 */
export const REQUIRED_RUN_FIELDS = ['run_id', 'heat_id', 'series', 'summary', 'balance_residual', 'economics', 'model_version', 'data_origin'];
export function checkRun(r) { const miss = REQUIRED_RUN_FIELDS.filter((k) => !(k in r)); if (miss.length) throw new Error('API contract mismatch: missing ' + miss.join(', ')); return r; }
