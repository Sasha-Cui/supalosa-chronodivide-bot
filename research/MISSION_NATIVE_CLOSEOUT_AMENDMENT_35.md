# Mission-Native Closeout: Amendment 35

Date: 2026-08-14

Status: **failed V28-R1 focused gate and prospective V28-R2 live-invariant freeze**

## Preserved V28-R1 result

The V28-R1 focused gate ran exactly once as Slurm job `22241614` under account
`pi_jss233`, from clean tracked `main` source
`ab24bf217843880ea74d9e8f79aff094c6b9ad01`. The unchanged V28 policy identifier
was `7a831e109153a56f892529a41250c7bf77b5d0a5e8e6ff88684472d4c86d8c73`;
the pinned external Supalosa baseline was
`165b77a71d0cf5ebd27c65b19d0486bcbae78d0f` with a clean tracked tree.

- artifact: `research-evidence/mission-native-closeout/outcome-blind-focused-gate-v28-r1/22241614/focused-gate-v28-r1.json`
- artifact SHA-256: `8d308108afbe0808565737f66f281da8a5d23d583eb343c7964b7e8c43e14e0c`
- scheduler: `FAILED`, exit `1:0`, elapsed `00:02:29`
- artifact status: `FAIL_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_FOCUSED_GATE_V28_R1`
- four games; both same-seed repeats were exact; no win, loss, draw, score, or other competitive outcome was serialized or inspected

Both global mechanism exposures again occurred without a coverage error. The
American row launched a complete-route-feasible mission at tick 2700 with ten
compatible infantry, exactly assigned all ten expected units, and serialized
316 points of physical enemy-building damage. The first physical main tank was
not observed until tick 3876. The African row withheld the route-infeasible
preterminal mission for 83 evaluations while retaining active predecessor
delegation and continuing production through tick 5328.

These are outcome-blind mechanism observations. Job `22241614` remains a failed
gate and is never retroactively reclassified or rerun.

## Failure classification

Two validator assumptions were inconsistent with the frozen policy and the
meaning of the live telemetry.

1. The launch validator required activation to occur no earlier than physical
   main-tank acquisition. V28 explicitly allows an objective-feasible mission to
   override the preferred tank-and-screen composition. The American launch was
   therefore correctly early; the gate assertion contradicted the intervention
   it was meant to test.
2. The screen validator imposed a raw readiness-owned head-count ceiling of
   five. In the African trace the count jumped from two to six at tick 4716
   while `factoryCount`, `queuedCount`, and `requested` were all zero. This was
   reassignment of compatible units from predecessor combat, not closeout-layer
   overproduction. A raw ownership count cannot identify excess production.

## Frozen V28-R2 correction

V28-R2 changes no bot policy, controller behavior, target selection, model
parameter, or competitive statistic. The V28 policy identifier remains exactly
`7a831e109153a56f892529a41250c7bf77b5d0a5e8e6ff88684472d4c86d8c73`.

1. An objective-feasible launch may precede physical main-tank acquisition.
   Production telemetry must still be valid and persist, but it is not a launch
   prerequisite under the composition override.
2. Remove the raw screen head-count ceiling. Bound screen *production* by the
   causal request invariant: a request is invalid whenever
   `currentCount + queuedCount >= targetCount`; all existing factory-trigger,
   queue-awareness, and nonnegative-count checks remain.
3. Deterministic tests must cover an early infantry objective launch, an
   externally reassigned screen count of six with no factory, queue, or request,
   and rejection of a production request at or above the queue-aware target.
4. Before any further Slurm run, the V28-R2 validator must be replayed against
   the complete outcome-free row telemetry preserved by jobs `22241458` and
   `22241614`, and every row must satisfy the corrected contract. This replay
   validates the gate implementation only and does not reclassify either job.

The single V28-R2 focused gate uses unused valid seed base `4_291_000_000`,
repeats the American and African rows exactly, and preserves every other V28-R1
check. Seed bases `4_292_000_000` and `4_293_000_000` are never reused.

Only a V28-R2 focused pass may advance to the already frozen all-nine-country
reciprocal-slot outcome-blind gate at seed base `4_294_000_000`. No sealed
test-family outcome may be opened before both technical gates pass.

## Process correction

Pure synthetic gate fixtures are necessary but insufficient when a validator
interprets ownership, queue, or progress telemetry. Before spending another
fresh seed, replay prospective validators over all available outcome-free live
artifacts and check invariants against the emitting source. Prefer causal
relations between fields over incidental maxima or timing observed in one seed.
