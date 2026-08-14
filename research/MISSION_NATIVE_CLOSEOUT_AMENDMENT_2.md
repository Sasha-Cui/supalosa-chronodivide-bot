# Mission-Native Closeout: Amendment 2

Date: 2026-08-14

Status: completed outcome-free v2 gate and prospective v3 freeze

## Completed v2 evidence

Mission-native compatibility-v2 completed as Slurm job `22198911` under
account `pi_jss233`.

- source commit: `62679d0d6586ddfbd5fdd42add178f78cbc4c9a5`
- artifact: `research-evidence/mission-native-closeout/outcome-blind-compatibility-v2/22198911/compatibility.json`
- artifact SHA-256: `b73ff4b13024beebad5d298f569967037d2372f41b1e18aa2a85a61fd3d0141a`
- scheduler state: `FAILED`, exit code `1:0`, elapsed `00:06:08`
- artifact status: `FAIL_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_V2`
- coverage: 9 countries, 2 reciprocal slots, 4 deterministic games per cell,
  72 games
- global validation errors: none
- outcome inspected: no

The scheduler failure is the gate's intentional fail-closed exit after writing
a complete artifact.

## Outcome-free findings

- cells passing the complete technical contract: 11/18
- cells with physical building damage: 11/18
- aggregate building damage: 2,562 across 36 progress events
- engagement decisions: 2,423
- blocker-clear decisions: 1,840
- building-strike decisions: 583
- building-completion-race decisions: 205
- building-in-range decisions: 378
- blocker types selected: Allied rifle infantry (`E1`) in 10 cells and Soviet
  conscripts (`E2`) in 8 cells
- exercised building types: GAPILE, GAREFN, GAWEAP, NAPOWR, NAREFN, NAWEAP

The seven failing cells were Americans slots 0 and 1, Alliance slots 0 and 1,
Germans slot 0, British slot 1, and Arabs slot 1. Each repeatedly selected a
basic infantry blocker and never emitted a building-strike decision or
physical building damage. One failing cell also reached the external
baseline's no-army/no-production resignation condition. The failure is
therefore not missing mission ownership; it is an all-force diversion loop
that permits a replenished sequence of small blockers to indefinitely defer
the literal victory objective.

The v2 gate does not authorize an outcome-bearing screen.

## Frozen v3 mechanism

V3 preserves the v2 external strategy, low-building activation, native
mission ownership, committed building, public-state completion race, route
corridor, and blocker selection. It changes only allocation after a route
blocker has been certified:

1. At least one compatible assigned attacker always continues toward or
   attacks the committed building.
2. At least half of the assigned attackers, rounded up, remain on the building
   objective.
3. Attackers already in the building's firing perimeter cannot be diverted.
4. At most half of the force, rounded down, screens the certified blocker.
5. The screen is selected from attackers that can damage the blocker, ordered
   by comparative blocker damage relative to their building damage; ties are
   deterministic.
6. A single-attacker force ignores the blocker and continues toward the
   building.
7. Off-route forces remain ignored, and no second blocker is introduced.

This is a continuous-pressure rule, not an assertion that enemy forces do not
matter. It prevents force removal from becoming a substitute objective while
still assigning a bounded subgroup to a threat that the completion-race model
certifies as consequential.

## V3 telemetry and gate

V3 adds an engagement-allocation event containing:

- committed building and certified blocker identities;
- total assigned attackers;
- building-strike and blocker-screen attacker counts;
- number of building attackers already in firing range.

The fresh v3 outcome-free gate retains exact disabled equivalence,
determinism, all nine countries, reciprocal slots, four games per cell, and
the literal physical-building-damage requirement. Each allocation must keep
at least half the assigned force and at least one attacker on the building.
A bounded split must execute somewhere globally, while a pure building strike
must also execute. No outcome is inspected or serialized.

## Decision rule

- Pass all 18 cells: authorize the two-arm opened-development screen.
- Fail any cell: do not inspect outcomes; diagnose the complete v3 telemetry
  and revise or reject the mechanism prospectively.

No cell-specific exception, selective rerun, or paper claim is permitted.
