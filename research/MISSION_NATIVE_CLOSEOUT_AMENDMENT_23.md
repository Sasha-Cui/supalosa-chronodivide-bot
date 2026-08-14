# Mission-Native Closeout: Amendment 23

Date: 2026-08-14

Status: **failed focused V19 gate and prospective V20 production-scope-latch freeze**

## Completed outcome-free focused V19 gate

The frozen focused V19 gate completed as Slurm job `22235401` under account
`pi_jss233`.

- source commit: `f2d848bd155924a5f763d2c2f80467236c0c4eaa`
- external baseline commit: `165b77a71d0cf5ebd27c65b19d0486bcbae78d0f`
- artifact:
  `research-evidence/mission-native-closeout/outcome-blind-focused-gate-v19/22235401/focused-gate-v19.json`
- artifact SHA-256:
  `418e1417b3c7cfd6d6cf0d51712eed6e71a60f6970129b117cdbdcf4d8d8606d`
- scheduler state: `FAILED`, exit code `1:0`, elapsed `00:00:52`
- peak batch RSS: 389,252 KiB
- artifact status:
  `FAIL_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_FOCUSED_GATE_V19`
- launched games: 4
- exact same-seed repeat identity: passed for both countries
- resignation attempts: zero
- outcome inspected: no

The nonzero exit was the gate's intentional fail-closed behavior after writing a
complete artifact. It was not an infrastructure or runtime failure.

## Outcome-free findings

### Allied trace (`Americans`, slot 0)

- maximum physical `MTNK` count in schema-14 production telemetry: two;
- maximum pre-launch certificate tank count: zero;
- observed enemy-building damage: 123 hit points;
- focused technical contract: passed.

The production reservation therefore repaired the Allied resource-contention
failure seen in the earlier probe without changing combat control.

### Soviet trace (`Africans`, slot 0)

- maximum `HTNK` count in schema-14 production telemetry: zero;
- maximum pre-launch certificate tank count: zero;
- observed enemy-building damage: zero;
- focused technical contract: failed.

The trace localizes why. Reservation and schema-14 production telemetry ceased
after the infantry force attrited below the current low-building activation
gate. An already queued `HTNK` subsequently completed and appeared in direct
self snapshots from ticks 3,900 through 4,500, but the ordinary strategy had
resumed non-reserved infantry, defense, and power requests. The isolated tank
was lost before the four-tank readiness force assembled. The discrepancy
between the schema-14 maximum and the later self snapshot is evidence that the
production scope ended early; it is not grounds to reclassify the failed gate.

## Frozen V20 repair

V20 preserves every V19 combat, target-selection, engagement, staging,
transfer, infrastructure, reservation, and side-generic rule. It adds exactly
one mechanism.

1. **Persistent production-scope latch.** When the low-building closeout state
   first satisfies its public-information gate, latch capability production and
   production reservation on for the remainder of the episode.
2. The latch is independent of whether the combat closeout mission has already
   activated. Subsequent infantry attrition must not return the economy to
   unrelated production while fewer than four visible side-correct main tanks
   remain.
3. Reuse the existing shared capability latch so the side-correct war-factory
   mission, main-tank mission, schema-14 production telemetry, and schema-15
   reservation all remain live together.
4. Preserve all active combat missions and unit ownership. Do not recall,
   disband, pause, or retarget the attacking vanguard.
5. Do not add a country exception, opponent-dependent condition, resource
   grant, starting-unit change, map coordinate, or outcome-dependent rule.
6. Bump the exact policy schema to V20 with
   `adaptiveGroundAssaultProductionScopeLatch: true`.

## Staged V20 technical gates

Run a fresh focused gate using the same prospectively fixed country and slot
strata, exact same-seed repeats, and seed base `4_180_000_000`. It must require:

- deterministic traces and zero resignation attempts;
- schema-15 reservation exposure for both factions;
- schema-14 physical `MTNK` and `HTNK` counts of at least one;
- persistence of production telemetry after physical tank acquisition; and
- positive physical enemy-building damage for both factions.

Only if the focused V20 gate passes may V20 run the full nine-country,
reciprocal-slot compatibility gate with fresh seed base `4_190_000_000`, four
deterministic games per cell, exact handoff reconciliation, both physical tank
types, both physical infrastructure types, and building damage in all 18
cells.

Both gates remain outcome-free. No win, loss, draw, score, terminal tick,
opponent outcome, or sealed-family field may be inspected or serialized.
