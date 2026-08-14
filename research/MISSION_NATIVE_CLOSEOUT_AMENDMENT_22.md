# Mission-Native Closeout: Amendment 22

Date: 2026-08-14

Status: **completed production probe and prospective V19 resource-reservation freeze**

## Completed outcome-free production probe

The frozen production microdiagnostic completed as Slurm job `22234986` under
account `pi_jss233`.

- source commit: `b0a50f2ee62eca32fde826cd6232da721d8a3813`
- external baseline commit: `165b77a71d0cf5ebd27c65b19d0486bcbae78d0f`
- artifact:
  `research-evidence/mission-native-closeout/outcome-blind-production-probe-v1/22234986/production-probe-v1.json`
- artifact SHA-256:
  `243ab9cc5e500f2234e9a3fe6709d191dcb3af1ba479b50259fa706c1b8a2f6d`
- scheduler state: `COMPLETED`, exit code `0:0`, elapsed `00:01:00`
- peak batch RSS: 464,716 KiB
- artifact status:
  `PASS_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_PRODUCTION_PROBE_V1`
- launched games: 4
- exact same-seed repeat identity: passed for both countries
- resignation attempts: zero
- outcome inspected: no

## Outcome-free findings

The request, prerequisite, availability, and queue-entry paths work on both
sides. The observed bottleneck is resources under continued concurrent
production, compounded by infrastructure exposure.

### Allied trace (`Americans`, slot 0)

- `GAWEAP` became visible at tick 3,432.
- `MTNK` became available immediately and entered the active vehicle queue at
  tick 3,444.
- While the tank remained active, credits fell from 1,696 to zero.
- The war factory disappeared by tick 3,864 before a tank completed.
- Maximum physically visible `MTNK` count: zero.

### Soviet trace (`Africans`, slot 0)

- `NAWEAP` became visible at tick 3,264.
- `HTNK` entered the active vehicle queue at tick 3,276.
- Credits fell from 1,658 to zero during production.
- One `HTNK` became physically visible at tick 4,152; a second then entered the
  queue and remained resource-limited.
- Maximum physically visible `HTNK` count: one.

The V18 all-country summary's tank metric was therefore incomplete: it used only
the tank count inside pre-launch activation evaluations. A tank produced after
activation was omitted even though production telemetry and self snapshots
showed it. This is a measurement defect, not evidence that V18 passed.

## Frozen V19 repair

V19 preserves V18 activation, transfer, staging, target selection, engagement,
terminal-building priority, side-generic unit/structure names, target tank count,
and all country-independent rules. It adds exactly one mechanism and one metric
correction.

1. **Terminal production reservation.** While low-building closeout scope is
   live and the side has fewer than four visible main battle tanks, reserve the
   production system for the side-correct war factory and main battle tank.
2. Remove pending request-map entries for other unit or structure types and
   cancel already queued non-reserved production items through the public
   production/actions interfaces. Repeat idempotently until the tank ceiling is
   reached or closeout scope ends.
3. Preserve all existing combat missions and their unit ownership. In
   particular, do not disband, recall, or pause the active attacking vanguard;
   reservation affects economic production only.
4. Preserve `GAWEAP`/`NAWEAP` and `MTNK`/`HTNK` requests. Do not introduce a
   country exception, fixed map coordinate, credit grant, starting-unit change,
   or opponent-dependent rule.
5. Emit schema-15 reservation telemetry containing current tank count, retained
   names, removed request names, and canceled queue items.
6. Bump the exact policy schema to V19 with
   `adaptiveGroundAssaultProductionReservation: true`.
7. Correct the gate's physical acquisition metric to use the maximum
   `currentCount` in assault-production telemetry. Retain the pre-launch
   certificate tank count separately; neither may be inferred from request
   counts.

## Staged V19 technical gates

Before another all-country gate, use a fresh focused gate with the same two
country/slot strata as the diagnostic, exact same-seed repeats, and seed base
`4_160_000_000`. It must require:

- deterministic traces and zero resignation attempts;
- schema-15 reservation exposure on both sides;
- physically visible `MTNK` and `HTNK` counts of at least one; and
- continued physical enemy-building damage on both sides.

Only if that focused gate passes may V19 run the full nine-country, reciprocal-
slot compatibility gate with fresh seed base `4_170_000_000`, four deterministic
games per cell, exact handoff reconciliation, both physical tank types, both
physical infrastructure types, and building damage in all 18 cells.

Both gates remain outcome-free: no win, loss, draw, score, terminal tick,
opponent outcome, or sealed-family field may be inspected or serialized.
