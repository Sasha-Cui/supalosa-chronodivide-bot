# Mission-native closeout amendment 43: V34 evidence and V34-R1 validator correction

## Scope

This amendment records the complete outcome-blind V34 gate, preserves its
failure, and freezes one validator-only successor. It does not change the V34
policy, inspect any game outcome, open the development outcome screen, or
authorize confirmatory evaluation.

The tactical doctrine remains objective-directed. Chrono Divide is won by
destroying all enemy buildings. Enemy forces are therefore not an independent
terminal objective: they receive force only when they can prevent, intercept,
or destroy the building strike. When the final enemy building is feasible, the
policy must attack it even if a large off-route enemy force remains. When a
genuinely lethal blocker controls the route, the policy assigns the minimum
bounded screen needed to clear or contain it and keeps the protected strike on
the building.

## Complete V34 evidence

The frozen V34 all-country gate ran exactly once as Slurm job `22261081` from
commit `1b0fa3bdb9526551866ab8769f207d837dd85806` under account `pi_jss233`.
The job completed all 72 outcome-free traces across all nine countries and both
reciprocal candidate slots, then exited fail-closed after validation. Its
immutable artifact is:

`research-evidence/mission-native-closeout/outcome-blind-all-country-gate-v34/22261081/all-country-gate-v34.json`

The artifact SHA-256 is
`97de67042bc1877a90ed588348a0d23ec787106b642942fbb23f6b843871c65d`.
The scheduler recorded exit `1:0`, elapsed time `00:14:05`, and maximum resident
memory `524148K`. The job did not write `COMPLETE`.

No winner, score, candidate score, or sealed-family result was computed or
serialized. Direct external and disabled-adapter traces were exactly equal in
all 18 cells, and enabled repeats were deterministic in every cell.

## Outcome-blind mechanism findings

V34 executed 1,219 schema-27 objective-race allocations, including 218 bounded
blocker allocations. It produced 10 certified launches, 10 post-composition-
block conversions, 10 launch handoffs, and 7,455 hit points of physical enemy-
building damage. Every cell that launched produced building damage, including
all five geometries whose all-force blocker diversion caused the V33 failure.
It also retained the external scheduler proof: 364 scheduler events, 58 paused
queues, 1,762 deferred queue observations, and zero destructive production
reservations.

These are technical mechanism measurements only. They do not establish a win,
win rate, or competitive improvement over Supalosa.

## Why V34 failed

The complete artifact exposed two validator defects rather than a policy
failure:

1. Schema-4 `engagement_allocation` telemetry is change-throttled, while
   schema-27 `objective_race_allocation` audits every applicable tick. The V34
   validator incorrectly required equal cardinality. The artifact contained
   420 schema-4 events and 1,219 schema-27 events. Every schema-4 event had an
   exact schema-27 counterpart, and every schema-27 partition independently
   satisfied the frozen bounded-screen rules.
2. In the fresh Americans, candidate-slot-0 control cell, the unmodified
   external Supalosa candidate invoked `quitGame` 59 times in both the direct
   and disabled-adapter traces. The traces remained exactly identical. The
   enabled V34 candidate and its baseline invoked `quitGame` zero times in both
   deterministic repetitions. The validator incorrectly rejected the matched
   control behavior instead of requiring control identity and forbidding
   enabled-policy resignations.

A complete post hoc invariant audit over the frozen artifact produced zero
errors under the corrected semantics. V34 nevertheless remains formally failed:
the recorded job is not relabeled, `COMPLETE` is not synthesized, and no cell is
selectively rerun.

## Frozen V34-R1 boundary

V34-R1 keeps the exact V34 policy, policy hashes, commands, map, external
baseline, 18-cell matrix, four traces per cell, maximum tick budget, and all
coverage requirements. It changes only the gate validator and uses the fresh
engine-seed base `4_294_850_000`.

The corrected validator requires:

- every change-throttled schema-4 allocation to have an exact schema-27 audit;
- every schema-27 audit, including additional per-tick events, to satisfy the
  frozen partition, terminal-priority, and bounded-screen rules;
- the direct external and disabled-adapter resignation audits to match exactly;
  and
- both enabled-policy repetitions to contain zero candidate or baseline
  resignation attempts.

V34-R1 must rerun the complete fresh 72-trace matrix exactly once. Any failure
preserves the artifact and stops advancement. A complete technical pass may
freeze the separate progress-deadline liveness repair, but it still does not
authorize outcome inspection or a paper claim.
