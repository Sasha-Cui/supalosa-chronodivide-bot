# Method-v5 visibility-limited closeout controller: implementation design v1

Status: prospective implementation design; no Method-v5 game has run
Frozen: 2026-08-12 America/New_York

## Objective

Starting from the exact pinned external Supalosa bot and `DefaultStrategy`, add a generic controller that converts survivable late-game positions into literal wins. A literal win is only the opponent-attributed destruction of every currently enemy-owned building under `LITERAL_BUILDING_ELIMINATION_ENDPOINT_V4.md`. Engine defeat, resignation, material lead, score, and terminal zero caused by sale/capture/unspawn do not count.

## Information boundary

The controller may use only the candidate's own units, currently visible enemy units, remembered observations, public map geometry, public starting locations, `isVisibleTile`, production availability/queues, and normal Supalosa context. It must never call `getAllUnits`, consume evaluator ledgers, or log hidden building identities/locations. The evaluator alone may enumerate complete state.

## Composition

1. **Exact baseline preservation.** Construct the candidate from the pinned external runtime and external `DefaultStrategy`. Invoke the baseline strategy first. When the closeout layer is disabled its callback trace must match the independently constructed baseline.
2. **Own-state activation latch.** Activate from a frozen minimum tick and own anti-ground combatant count. Do not infer an advantage from an incomplete visible-enemy count. Once active, remain active.
3. **Visible target memory.** Record visible enemy buildings. Invalidate a remembered target only when its tile is observable and the building is absent. Directly attack a visible building; attack-move to a remembered location.
4. **Systematic search.** When no target is visible or remembered, partition public map geometry into fixed cells, prioritize public enemy starts, then never-observed cells, then least-recently observed cells. Assign mobile anti-ground units to distinct cells. Ground assignments must be reachable; air assignments may traverse connectivity boundaries.
5. **Target allocation.** Rank construction, power, production, defense, refinery, then other buildings, with distance and progress tie-breakers. Match only attackers that can damage currently visible target armor. For remembered targets, retain the last verified compatibility class and fall back to mobility-first search if unknown.
6. **Progress and stall detection.** Track visible target hit points, time since damage, search coverage, order acknowledgements, and per-target assignment. Reassign stalled attackers and request mobility capability after a frozen stall interval.
7. **Adaptive capability production.** Add a structural mission to the external mission controller so Supalosa's own queue controller receives high-priority requests. Request a small persistent air anti-building force for every country (`JUMPJET` for Allied countries, `ZEP` for Soviet countries), building only public, currently available prerequisites at locations validated by `canPlaceBuilding`. Naval production is requested only when visible/remembered reachability evidence identifies a water-separated target and an available ship path exists.
8. **Preemption and reserve.** Preserve a frozen home reserve. The full method issues later same-update orders to the remaining compatible combatants, overriding ordinary attack orders only after activation. The preemption ablation uses only units acquired by the add-on mission and does not override baseline orders.
9. **Immediate endpoint stop.** The separate symmetric evaluator stops the simulation after the first valid positive-to-zero building transition, before another update.

## Initial open-training arms

All arms use the final endpoint, all nine countries, reciprocal physical slots, and common paired seeds on the 22 permanently open training families.

- `baseline_control`: exact Supalosa, closeout disabled.
- `memory_search`: visible targets, memory, public-grid search, no adaptive production.
- `memory_search_air2`: full search plus persistent air target count 2.
- `memory_search_air4`: full search plus persistent air target count 4.
- `early_air4`: earlier activation and air target count 4.
- `reserve2_air4`: two-unit reserve, air target count 4.
- `reserve4_air4`: four-unit reserve, air target count 4.
- `production_priority_high`: full method with higher adaptive request priority.

The exact numeric values, cap, seeds, and arm hashes are frozen in each generated campaign before launch. Screen selection follows the already frozen Method-v5 ordering: literal wins, win-loss margin, draw rate, competing-risk time to elimination, then country/family stability. No selectively chosen game is rerun.

## Required technical gates

- endpoint v4 unit tests for destroy, simultaneous destroy, sale, capture, unspawn, undeploy, rebuild, no-winner-building, establishment, engine-finish, and cap paths;
- a live Slurm endpoint probe reproducing the already observed destruction ledger under the committed implementation;
- two-repeat deterministic equality for result and policy telemetry;
- reciprocal instrumentation and quit suppression checks;
- disabled-layer baseline callback/action trace equivalence;
- source/runtime checks that the closeout module never calls `getAllUnits`;
- telemetry allowlist proving no complete-state identifiers or locations cross from evaluator to policy; and
- all-nine-country construction and production smoke checks before the full screen.

## Escalation if the first arms do not win

A failed open-training screen does not alter the endpoint. Diagnose losses/draws by prespecified failure classes: never activated, no target discovery, incompatible attacker, unreachable target, production prerequisite failure, order churn, home-base collapse, or cap after measurable progress. Freeze a new controller version and complete a fresh all-country screen. Only after the generic heuristic class is exhausted may training expand to an outcome-blind learned scheduler over these same public state variables; fresh development and confirmatory maps remain untouched.
