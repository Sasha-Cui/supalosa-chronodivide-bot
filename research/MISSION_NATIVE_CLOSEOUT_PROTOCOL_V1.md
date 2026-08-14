# Mission-Native Closeout Protocol V1

Date frozen: 2026-08-14

Status: prospective, outcome-blind architecture diagnostic

## Motivation

Persistent objective compatibility-v11 proved that a full compatible offensive
force can produce physical building damage in some cells, but the additive
post-strategy overlay failed the all-country gate. The next experiment isolates
mission ownership from order selection.

The repository already contains a locked `BuildingEliminationMission` and a
factory that can preempt competing attack missions, request the freed units at
priority 300, retain those units across updates, and emit assignment and target
progress telemetry. Prior external-baseline lifecycle screens issued orders
after the baseline tick; they did not inject this mission into the pinned
external baseline's mission controller.

## Candidate architecture

The candidate uses the independently loaded pinned external Supalosa runtime.
Its exact external `DefaultStrategy` runs first on every strategy update. A
local, structurally compatible building-elimination factory then interacts with
that same external mission controller.

No local opening, production, scouting, defence, attack, or map-profile strategy
replaces the external baseline. When disabled, the candidate is the unmodified
external baseline instance.

When enabled, the closeout mission:

- may activate only after tick 2,700 and when one to five public enemy
  buildings remain, preventing the initial deployed base from being mistaken
  for a closeout state;
- requires at least one compatible offensive combatant;
- does not require a numerical army advantage and does not reject a building
  strike merely because many enemy combatants remain;
- reserves no unassigned offensive combatants;
- preempts only ordinary attack, retreat-from-attack, and all-in missions;
- cannot steal units that remain assigned to other locked external missions,
  including active home defence;
- focuses all acquired compatible attackers on exactly one reachable building;
- refreshes its decision every three ticks;
- retains locked mission ownership until the target disappears, the enemy has
  no buildings, or the mission is explicitly invalidated;
- observes public complete game state but no endpoint outcome.

V1 deliberately tests building-first persistent ownership. It does not add a
new force-clear branch. Compatibility-v11 already showed that repeated blocker
clearing can consume the closeout horizon. If persistent ownership still fails,
a later mission-native revision may add a prospectively frozen interception
race without reviving the retired post-strategy overlay.

## Required code boundary

The legacy building-elimination defaults must remain behaviorally unchanged.
V1 may add an explicit low-building activation mode and maximum-building count,
both disabled by default, plus the external-strategy adapter and gate. Disabled
trace equivalence must be exact.

## Outcome-blind compatibility gate

The gate uses fresh seeds and the same simple-map diagnostic population:

- 9 countries;
- candidate slots 0 and 1;
- 4 deterministic games per country/slot cell;
- 72 enabled games, plus direct/disabled equivalence and repeat traces;
- pinned external Supalosa runtime;
- Slurm account `pi_jss233` only.

Every country/slot cell must satisfy all of the following:

1. direct external and disabled-adapter traces are identical;
2. enabled traces are deterministic under exact repetition;
3. the native mission is activated and appears in mission ownership telemetry;
4. at least one offensive unit transfers into the native mission;
5. target orders are building-directed and use one target group;
6. physical building damage occurs;
7. target disappearance or a target transition is observed when the horizon
   exposes one;
8. no endpoint outcome is read or serialized.

The exact gate implementation may refine telemetry completeness checks before
the source freeze, but may not weaken the physical building-damage requirement.

## Decision rule

- Pass all 18 cells: authorize a small two-arm opened-development screen against
  exact Supalosa.
- Fail any cell: do not inspect outcomes and do not run the screen. Diagnose the
  completed telemetry, then revise the mission-native mechanism prospectively.

No selective rerun, country-specific exception, subgroup rescue, or paper claim
is permitted.
