# Mission-Native Closeout: Amendment 34

Date: 2026-08-14

Status: **failed V28 focused gate and prospective V28-R1 telemetry-validation freeze**

## Preserved V28 result

The V28 focused gate ran exactly once as Slurm job `22241458` under account
`pi_jss233`, from clean tracked `main` source
`600e9974c98c5eb5867aa76339611b6df6a65f4b`. The policy identifier was
`7a831e109153a56f892529a41250c7bf77b5d0a5e8e6ff88684472d4c86d8c73`; the
pinned external Supalosa baseline was
`165b77a71d0cf5ebd27c65b19d0486bcbae78d0f` with a clean tracked tree.

- artifact: `research-evidence/mission-native-closeout/outcome-blind-focused-gate-v28/22241458/focused-gate-v28.json`
- artifact SHA-256: `ecfd3adcb5d4e3fa70ebc2d86cb29c715ad4d7351afe73876d3bfd3630f996fb`
- scheduler: `FAILED`, exit `1:0`, elapsed `00:02:46`
- artifact status: `FAIL_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_FOCUSED_GATE_V28`
- four games; both same-seed repeats were exact; no win, loss, draw, score, or other competitive outcome was serialized or inspected

The global state-contingent coverage conditions were both exposed without a
coverage error. In the American row, V28 launched at tick 2700 on a complete
route-feasibility certificate with ten compatible infantry, zero transferred
tanks, and zero readiness-owned tanks or screens. All ten expected units were
classified and assigned at handoff. The mission then serialized 529 points of
physical enemy-building damage. In the African row, V28 withheld activation for
a preterminal route-infeasible force. Eighty-two schema-22 evaluations retained
active predecessor delegation, no capability launch or handoff occurred, and
production telemetry continued through tick 5376.

These are outcome-blind mechanism observations, not evidence that V28 won,
drew, or lost either game. Job `22241458` remains a failed gate and is never
retroactively reclassified or rerun.

## Failure classification

Only the American row failed validation. The validator required every
`target_progress` record to have strictly positive serialized `damage`. Seven
records did, while the tick-3612 record conservatively serialized zero damage
with `hitPoints: 493` and `previousHitPoints: 493`.

Zero is valid under the frozen controller telemetry semantics. Progress
emission is triggered from damage relative to the immediately preceding public
observation, while the serialized lower-bound delta is recomputed relative to
the last emitted hit-point value. Repair followed by redamage to that prior
value can therefore trigger an emission whose conservative serialized delta is
zero. Treating such a record as malformed was a gate-implementation error. It
does not invalidate the separate requirement that an activated objective
mission accumulate positive physical building damage.

## Frozen V28-R1 correction

V28-R1 changes no bot policy, controller behavior, model parameter, target
selection rule, or competitive statistic. The policy identifier must remain
`7a831e109153a56f892529a41250c7bf77b5d0a5e8e6ff88684472d4c86d8c73`.

1. Each schema-2 `target_progress` record must contain finite nonnegative hit
   points, previous hit points, and damage, with
   `damage = max(0, previousHitPoints - hitPoints)`.
2. A live capability launch must still accumulate strictly positive total
   serialized physical enemy-building damage.
3. A correctly vetoed preterminal row remains exempt from building-damage
   requirements and must retain active predecessor delegation plus continuing
   production.
4. Deterministic tests must add a mixed zero-and-positive progress sequence and
   must reject negative or internally inconsistent damage.

The single V28-R1 outcome-blind focused gate uses fresh valid seed base
`4_293_000_000`, repeats the American and African rows exactly, and preserves
all V28 provenance, determinism, handoff, arbitration, resignation, and global
coverage checks. V28 seed base `4_292_000_000` is never reused.

Only a V28-R1 focused pass may advance to the already frozen all-nine-country
reciprocal-slot outcome-blind gate at seed base `4_294_000_000`. No sealed
test-family outcome may be opened before both technical gates pass.
