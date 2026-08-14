# Progress-certified open-development v1 invalidation

Status: **invalidated before scheduled outcome analysis**

## Scope

The frozen v1 campaign at
`research-evidence/progress-certified/open-development-v1/campaign-9de7e8e-v1`
launched exactly 1,080 games as Slurm array `22160669`. All 90 shards
completed under account `pi_jss233` with exit `0:0`. Scheduler elapsed time
summed to 157,260 one-CPU seconds (43.6833 CPU-hours), with per-shard elapsed
times from 116 to 5,801 seconds.

Dependent controller `22160670` failed closed after three seconds with exit
`1:0`. It produced no technical-gate artifact, no analysis artifact, and no
completion marker. The scheduled analyzer was never invoked, and no researcher
inspected a game outcome. The controller's technical validator may have read
outcome fields while checking literal endpoint consistency before it reached
the failing telemetry event.

The immutable failure record is
`research-evidence/progress-certified/open-development-v1/results-9de7e8e-v1/controller-22160670-invalidated.json`
with SHA-256
`c9fb77520d58a1a2f1b1dc7ed7980a0cb5e34721817a2f0c63b587dbdd6860b2`.

## Defect

The policy computes `terminalReserveReleased=true` only when the live exact
enemy-building count equals one. Ordinary decision telemetry included that
count. The physical-progress deadline branch emitted a
`predecessor_fallback` event with the release flag but omitted the redundant
`exactEnemyBuildingCount` field. The fail-closed validator therefore could not
establish the release invariant from the standalone event and rejected it.

This is a telemetry-evidence defect. It does not establish a game failure or a
performance result. Nevertheless, the frozen v1 protocol states that a code
defect invalidates the complete campaign. Therefore no v1 outcome will be
unblinded, analyzed, pooled, selected, or reported.

## Prospective repair

1. Add the live exact enemy-building count to every deadline-fallback event.
2. Require every `terminalReserveReleased=true` event to carry exact count one
   in both compatibility and campaign technical gates.
3. Rerun the complete 72-game outcome-blind compatibility gate on the repaired
   clean source.
4. Freeze a v2 campaign with a new engine-seed base and fresh game executions.
5. Preserve v1 unchanged; do not rerun, replace, or selectively reuse any v1
   game.

The repair changes telemetry evidence only. It does not change target ranking,
orders, combat behavior, endpoint semantics, or any outcome-bearing policy
parameter.
