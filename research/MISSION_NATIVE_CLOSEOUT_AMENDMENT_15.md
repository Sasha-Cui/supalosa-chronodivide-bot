# Mission-Native Closeout: Amendment 15

Date: 2026-08-14

Status: completed outcome-free V13 gate and prospective V14 freeze

## Completed V13 evidence

The mission-owned assembly V13 compatibility gate completed as Slurm job
`22225002` under account `pi_jss233`.

- source commit: `95aa9d44c339076be3985bcfcfd9f5e2c743224c`
- artifact: `research-evidence/mission-native-closeout/outcome-blind-compatibility-v13/22225002/compatibility-v13.json`
- artifact SHA-256: `3c414457f7780b32c23c68fa648185d9045376b2c6a065ce40b5c1c1abc99d82`
- scheduler state: `FAILED`, exit code `1:0`, elapsed `00:09:49`
- artifact status: `FAIL_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_V13`
- coverage: 9 countries, 2 reciprocal slots, 4 deterministic games per cell,
  72 games
- global validation errors: none
- outcome inspected: no

The scheduler failure is the gate's intentional fail-closed exit after writing
the complete artifact.

## Outcome-free findings

- cells passing the complete technical contract: 3/18;
- cells with physical building damage: 8/18;
- aggregate physical building damage: 3,383;
- full-force staging created in 18/18 cells;
- positive staged-force growth in 18/18 cells;
- staging released and closeout activated in 9/18 cells;
- maximum staged force: 22 combatants; and
- no resignation attempts.

Mission-owned assembly fixed both American slots that never activated under
V12. Each assembled ten attackers, launched at tick 2,736, owned all ten at the
first execution heartbeat, and caused 466 physical building damage. Six Soviet
cells also caused 397 damage after launching at tick 2,736.

The aggregate route-clearance gate remained too conservative. Nine cells held
between nine and twenty-two staged attackers through the horizon without
launching. This contradicts the intended instrumental role of force clearance:
requiring the staged force to be able to eliminate the entire currently visible
route-threat set before beginning an attack can turn waiting into the de facto
objective.

V13 also resolved the large V12 ownership transient but exposed a smaller
handoff-accounting gap. Its immediate Soviet certificates counted seventeen
staged attackers and first execution owned sixteen. Those cells nevertheless
caused physical building damage. The artifact cannot distinguish a unit
destroyed during handoff from a still-alive unit left in another mission, so the
strict V13 ownership criterion correctly fails closed.

V13 is rejected as a complete policy. No outcome-bearing comparison is
authorized.

## Frozen V14 mechanism: staged first-blocker launch with audited handoff

V14 preserves V13 full-force mission-owned assembly, target ranking, zero
reserve, public-state interface, and post-activation phase-pure persistent
execution. It changes only the launch certificate and adds read-only handoff
accounting.

1. Continue to evaluate readiness only on compatible units currently owned by
   the full-force staging mission.
2. A direct building race still launches immediately when no blocker exists or
   building completion is no slower than force survival.
3. When interception wins, launch if the staged force can remove the first
   committed route blocker before the staged force is destroyed. Do not require
   prospective removal of every later visible route threat before launching.
4. After that blocker is removed, retain the existing persistent controller:
   re-evaluate the building race, attack the building when feasible, or commit
   the next minimum route blocker. Force removal remains an intermediate phase,
   never a terminal objective.
5. At release, pass the exact staged unit identifiers into the closeout mission.
6. On the first nonempty closeout execution update, emit a single handoff event
   partitioning those identifiers into assigned, physically destroyed, and
   alive-but-unassigned sets using only current public game and mission state.
7. Fail closed if any expected surviving staged unit remains unassigned. Units
   physically destroyed between release and first execution are reported and
   do not masquerade as an ownership failure.

This is the prespecified interaction test suggested by V10 and V13: V10's
first-blocker certificate launched everywhere but lacked synchronized
ownership; V13 synchronized ownership but waited on complete route clearance.
V14 combines the two without changing target selection or post-launch tactics.

## V14 outcome-free gate

The fresh V14 gate uses new seeds and all nine countries with reciprocal slots.
It retains exact disabled equivalence, repeat determinism, zero-vanguard
staging, positive staged growth, release-before-activation, no resignation,
same-tick certificate ordering, phase-pure execution, blocker persistence, and
physical building damage in all 18 cells.

Every cell must activate through either a direct-building certificate or a
first-blocker-removal certificate. It must emit exactly one handoff audit. The
audit must reconcile every expected staged identifier exactly once, contain no
alive-but-unassigned identifier, and precede or coincide with the first target
order. A staged unit lost before execution is permitted only when the current
game API confirms physical destruction.

If any cell fails, no outcome is inspected. A complete pass authorizes only a
fresh open-development comparison of exact Supalosa, V13, and V14.
