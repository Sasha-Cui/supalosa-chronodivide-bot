# Mission-Native Closeout: Amendment 5

Date: 2026-08-14

Status: completed outcome-free v5 gate and frozen instrumentation diagnostic

## Completed v5 evidence

Mission-native compatibility-v5 completed as Slurm job `22199491` under
account `pi_jss233`.

- source commit: `d11a92514c5dba9a39bd05eaf65673e069c5d59a`
- artifact: `research-evidence/mission-native-closeout/outcome-blind-compatibility-v5/22199491/compatibility.json`
- artifact SHA-256: `2bc0c1b1c7c6571b7c900d7a3af3a53fe6683f1de65035f3837ca1d3c4264d3a`
- scheduler state: `FAILED`, exit code `1:0`, elapsed `00:07:31`
- artifact status: `FAIL_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_V5`
- coverage: 9 countries, 2 reciprocal slots, 4 deterministic games per cell,
  72 games
- global validation errors: none
- outcome inspected: no

The scheduler failure is the gate's intentional fail-closed exit after writing
a complete artifact.

## Outcome-free findings

- retargeted cells: 18/18
- cells passing the complete technical contract: 3/18
- cells with physical building damage: 3/18
- aggregate building damage: 597 across 12 progress events
- single-screen split allocations: 529
- pure building allocations: 336
- blocker-clear decisions: 2,074
- building-strike decisions: 198
- one zero-damage cell reached the external no-army/no-production resignation
  condition

V5 put as many as ten Allied or thirteen Soviet assigned attackers on the
building while screening with at most one attacker, yet most cells recorded no
physical building damage. This falsifies a monotonic allocation explanation:
simply assigning more units to the building does not ensure that those units
reach firing range, survive the route, preserve the order, or execute a usable
weapon attack.

The v5 gate does not authorize an outcome-bearing screen.

## Frozen next step: observation-only execution diagnostic

Do not introduce a v6 policy parameter before resolving the execution path.
The next run preserves the exact enabled and disabled v5 policies and adds only
outcome-free telemetry sampled at the existing 120-tick heartbeat:

- current committed building identity and hit points;
- assigned, building-directed, blocker-screen, and in-range attacker counts;
- total assigned hit points;
- minimum, median, and maximum distance from building-directed attackers to
  the target firing perimeter;
- change in minimum and median distance since the previous heartbeat for the
  same target;
- assigned attacker identities lost since the previous heartbeat;
- blocker identity and route-threat count;
- whether the last emitted command was a direct building attack, movement
  toward the building, or blocker attack.

The diagnostic must cover all nine countries and reciprocal slots with fresh
seeds and repeat each trace for determinism. It serializes no win, loss, draw,
score, game-finished tick, or opponent-outcome field. Its technical pass
requires complete valid telemetry, exact disabled equivalence, deterministic
repeats, no early game termination, and reconciled scheduler provenance. It
does not require physical building damage because damage is the phenomenon to
be explained.

The diagnostic analysis is limited to distinguishing among these predeclared
mechanisms:

1. no approach progress;
2. approach followed by attacker loss;
3. arrival without entering firing range;
4. firing-range entry without physical damage;
5. direct-order replacement or oscillation; or
6. successful physical damage.

Only after the complete diagnostic assigns every cell to one or more of these
mechanisms may a new policy be frozen. No cell-specific fix, selective rerun,
or outcome inspection is permitted.

The 1,000-attempt method comparison in `research/DIAGNOSTIC_PROTOCOL.md`
remains downstream and is not launched while this mission-native technical
gate is unresolved.
