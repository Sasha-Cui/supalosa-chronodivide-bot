# Finish-advantage composite technical-gate protocol, version 1

Status: **prospectively frozen, outcome blind**

Recorded: 2026-08-15 (America/New_York), before sealed V5 unblinding, before the finish-advantage state audit, and before any finish-advantage competitive outcome

## Purpose

This gate tests whether the exact Supalosa + multi-building finish-advantage + unchanged V5 composite is technically faithful, deterministic, and operational across every standard country and both physical player slots. It is not a competitive experiment and cannot support a win-rate claim.

The gate emits no winner, score, terminal building count, resignation-derived label, or other competitive outcome. `isFinished()` may be used only as a predicate to stop engine updates safely; its value and timing are excluded from the public gate artifact and from advancement decisions.

## Frozen population and launch count

- Map: the committed `simple-1v1-no-preview.map` bytes already used for exact-baseline compatibility, with the existing `METHOD_V5_EQUIVALENCE_MAP_SHA256` commitment.
- Countries: USA, Korea, France, Germany, Great Britain, Libya, Iraq, Cuba, and Russia.
- Candidate slots: 0 and 1.
- One fresh engine seed per country-slot cell, `4_226_000_000 + cell_index`, where `cell_index` is the canonical country-major, slot-minor index in `[0,17]`.
- Four same-seed runs per cell: exact external Supalosa control, both-overlay-disabled composite, enabled composite first run, and enabled composite repeat.
- Exact total: `9 * 2 * 4 = 72` launched games.
- Maximum update horizon: 5,400 ticks per game.
- Slurm account: only `pi_jss233`.

Every attempted game creation counts. A software failure invalidates the complete gate; no cell can be selectively rerun. A repaired gate requires a new version, a fresh seed interval, and all 72 new launches.

## Outcome-blind policy selection

The V5 layer uses the exact frozen V5 policy that entered sealed confirmation; no threshold is changed for this gate.

The multi-building layer is chosen solely from the completed outcome-free state-audit artifact:

1. If `selectedMargins` is nonempty, use `surplus_cover` with `min(selectedMargins)`. This is the least conservative outcome-blindly eligible arm and therefore exercises the broadest permitted leasing surface.
2. If `selectedMargins` is empty, use `irreversible_only`.

The selected state-audit artifact path and SHA-256, selected mode and margin, exact V5 policy SHA-256, exact finish-advantage policy SHA-256, source commit, source runtime tree, external baseline commit/runtime tree, game-API runtime tree, package lock, map bytes, and scheduler job ID/account must be committed in the gate artifact.

## Trace boundary

For each run, record only technical state needed for equivalence and order validation:

- normalized candidate action calls with tick and arguments;
- deterministic candidate snapshots at fixed 300-tick intervals;
- candidate production-queue snapshots;
- suppressed `quitGame` attempt counts for both bots;
- V5 telemetry and finish-advantage telemetry;
- number of executed updates; and
- source/runtime/policy provenance.

The trace must not contain or hash a winner, score, terminal building count, endpoint orientation, or engine-finish tick. Hashing a forbidden field instead of emitting it is also forbidden.

## Per-cell technical requirements

Every one of the 18 country-slot cells must satisfy all of the following:

1. The exact control trace and both-disabled composite trace are byte-identical after canonical normalization, and both disabled telemetry streams are empty.
2. Enabled first and repeat traces, including both telemetry streams, are byte-identical under the same engine seed.
3. Every emitted finish-advantage decision has `enemyBuildingCount > 1`; every V5 action-bearing decision has the exact frozen V5 schema/mechanism/information-boundary identity.
4. Every issued overlay order has one same-tick telemetry witness whose unit IDs, order type, target ID or coordinates, and policy phase match the actual action call.
5. No finish-advantage selected attacker ID appears in its protected mission set, additional reserve set, or any non-offensive mission ownership set.
6. Cover arithmetic matches `min(N, max(2, E + margin))` when the certificate is absent; irreversible activation has zero numerical cover; a revoked certificate cannot continue an irreversible-only order.
7. A direct building order is permitted only when the recorded completion estimate plus safety margin precedes both recorded causal interception and friendly-base-loss estimates. A blocker order names only the recorded minimum causal blocker. A base-race decision is action-free in the multi-building overlay.
8. Exact unseen buildings receive coordinate `AttackMove`; visible buildings receive direct `Attack`; stalled-target recovery never emits a global force-sweep order.
9. All telemetry schemas have an empty forbidden-field list and contain no outcome/evaluator field.

## Population exposure requirements

The gate fails closed unless the enabled population jointly provides:

- at least one matched finish-advantage building-order witness in both factions and both physical slots;
- finish-advantage building-order witnesses in at least four distinct countries;
- at least one irreversible-certificate witness, or an explicit state-audit proof that no irreversible state was exposed in the complete 360-game audit;
- at least one surplus-cover witness when the state audit selected a margin;
- at least one protected or additional-reserve unit coexisting with an issued strike, proving separation rather than an empty-set check;
- at least one exact-unseen coordinate approach and one later visible direct-attack handoff across the composite population; and
- no validation errors in any cell.

If the diagnostic map cannot expose one of these conditions, the result is a failed technical gate, not permission to inspect gameplay outcomes. A new prospective gate may use a different committed diagnostic map only after documenting why the original technical stimulus was inadequate.

## Advancement

Passing this gate authorizes the already specified complete open causal screen. It does not authorize sealed confirmation or a paper claim. Competitive advancement still requires the open screen's frozen positive, non-regression, cross-country, cross-family, and leave-one-family-out criteria, followed by a fresh-family sealed confirmation and uncertainty analysis.

