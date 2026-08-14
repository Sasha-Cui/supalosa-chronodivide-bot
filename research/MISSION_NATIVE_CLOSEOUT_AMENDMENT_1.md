# Mission-Native Closeout: Amendment 1

Date: 2026-08-14

Status: completed outcome-free v1 gate and prospective v2 freeze

## Completed v1 evidence

Mission-native compatibility-v1 completed as Slurm job `22198518` under
account `pi_jss233`.

- source commit: `4f62764e1e7dfc6ce478fc28235354d3084d25d9`
- artifact: `research-evidence/mission-native-closeout/outcome-blind-compatibility-v1/22198518/compatibility.json`
- artifact SHA-256: `ce3355023a6ec048b45dc2bd6d5006c24cfb9a57586707cbbb9722a79c7abddb`
- scheduler state: `FAILED`, exit code `1:0`, elapsed `00:08:15`
- artifact status: `FAIL_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_V1`
- coverage: 9 countries, 2 reciprocal slots, 4 deterministic games per cell,
  72 games
- global validation errors: none
- outcome inspected: no

The scheduler failure is the gate's intentional fail-closed exit after writing
a complete artifact.

## Outcome-free findings

- native mission activations: 18/18 cells
- cells with physical building damage: 4/18
- aggregate building damage: 796 across 16 progress events
- mission-owned target-order telemetry events: 517
- stalled-target events: 95
- cells whose assignment range reached zero: 9/18
- exercised building types: GAPILE, GAREFN, GAWEAP, NAHAND, NAPOWR, NAREFN

Thus the external-controller injection and persistent ownership interfaces work
across all countries and slots, but unconditional building focus does not
reliably convert that ownership into damage. The v1 gate does not authorize an
outcome-bearing screen.

## Frozen v2 mechanism

V2 preserves the v1 external strategy, native controller injection,
low-building activation, full offensive ownership, and one-target focus. It
adds only the following mission-native behavior:

1. Commit to one compatible reachable building until it disappears or becomes
   technically incompatible; do not rerank to a different surviving building
   on every order interval.
2. Identify only public enemy combatants intersecting the route corridor from
   the owned assault force to the committed building.
3. Estimate building completion time from approach, compatible damage rate,
   and remaining building hit points.
4. Estimate force survival time from the time at which route threats can
   intercept and their compatible damage rates.
5. Attack the building when any owned attacker is already in range or when the
   estimated building completion time is no greater than estimated survival.
6. Otherwise attack exactly one removable route blocker. Off-route forces are
   ignored.
7. After the blocker disappears, recompute the race and resume the same
   committed building.

The route-corridor radius is frozen at eight tiles. The order interval remains
three ticks. Empty compatible-target sets produce no target-order event rather
than an event falsely claiming an empty focused attack.

## V2 telemetry and gate

V2 adds a public-state engagement-decision event containing:

- committed building identity and remaining hit points;
- phase: `building_strike`, `blocker_clear`, or `no_compatible_target`;
- owned and assigned attacker counts;
- blocker identity when applicable;
- route-threat count;
- estimated building-completion, force-survival, and earliest-intercept ticks;
- the reason certificate for the decision.

The fresh v2 compatibility gate retains exact disabled equivalence,
determinism, all nine countries, reciprocal slots, and four games per cell.
Every cell must activate, acquire mission-owned attackers, expose a valid race
decision, issue a building strike, and produce physical building damage. A
blocker-clear branch must be observed somewhere globally, as must a direct or
race-certified building branch. No outcome is inspected or serialized.

## Decision rule

- Pass all 18 cells: authorize the two-arm opened-development screen.
- Fail any cell: do not inspect outcomes; diagnose the complete v2 telemetry
  and revise or reject the mechanism prospectively.

No cell-specific exception, selective rerun, or paper claim is permitted.
