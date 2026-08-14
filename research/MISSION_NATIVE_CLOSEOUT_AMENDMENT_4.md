# Mission-Native Closeout: Amendment 4

Date: 2026-08-14

Status: completed outcome-free v4 gate and prospective v5 freeze

## Completed v4 evidence

Mission-native compatibility-v4 completed as Slurm job `22199331` under
account `pi_jss233`.

- source commit: `3712541b892994ceb65fcc2706d48190563b68e2`
- artifact: `research-evidence/mission-native-closeout/outcome-blind-compatibility-v4/22199331/compatibility.json`
- artifact SHA-256: `76b9334c40e9867429d735cacd7536e47d7093db6085bb059b9facadb14c2a8f`
- scheduler state: `FAILED`, exit code `1:0`, elapsed `00:07:01`
- artifact status: `FAIL_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_V4`
- coverage: 9 countries, 2 reciprocal slots, 4 deterministic games per cell,
  72 games
- global validation errors: none
- outcome inspected: no

The scheduler failure is the gate's intentional fail-closed exit after writing
a complete artifact.

## Outcome-free findings

- retargeted cells: 18/18
- cells passing the complete technical contract: 8/18
- cells with physical building damage: 9/18
- aggregate building damage: 1,732 across 38 progress events
- bounded split allocations: 451
- pure building allocations: 414
- blocker-clear decisions: 1,836
- building-strike decisions: 542
- one damaging cell later reached the external no-army/no-production
  resignation condition

V4 successfully changed target identity after stalls in every cell, so stale
commitment is no longer the missing interface. The remaining zero-damage
cells occupy a lower force-size regime: Allied failures reached at most six
assigned attackers, while damage-producing Allied cells reached eleven;
Soviet failures reached at most fourteen, while damage-producing Soviet cells
reached seventeen. Under the v3/v4 half-screen rule, that leaves only three
Allied or seven Soviet attackers on the terminal building.

The v4 gate therefore identifies excessive screening allocation as the next
bounded mechanism error. The v4 gate does not authorize an outcome-bearing
screen.

## Frozen v5 mechanism

V5 preserves v4 exactly and changes only the maximum screen size:

1. At most one compatible attacker may screen the single certified route
   blocker.
2. The screen attacker is still chosen by the deterministic comparative
   blocker-damage rule.
3. Every other compatible assigned attacker continues toward or attacks the
   committed building.
4. A single-attacker force remains entirely building-directed.
5. In-range building attackers remain protected from diversion.
6. Completion-race decisions, blocker identity, route corridor, stall
   retargeting, and the external strategy remain unchanged.

The rule is independent of country, slot, building type, blocker type, map
coordinate, and outcome. It operationalizes the distinction between clearing
one consequential obstruction and turning enemy-force elimination into the
objective.

## V5 gate

The fresh v5 gate retains all v4 requirements and additionally certifies that
no allocation sends more than one attacker to the blocker. A single-screen
split and a pure building allocation must both execute globally. Every cell
must still produce physical building damage without a resignation attempt.
No outcome is inspected or serialized.

## Decision rule

- Pass all 18 cells: authorize the two-arm opened-development screen.
- Fail any cell: do not inspect outcomes; diagnose the complete v5 telemetry
  and revise or reject the mechanism prospectively.

No cell-specific exception, selective rerun, or paper claim is permitted.
