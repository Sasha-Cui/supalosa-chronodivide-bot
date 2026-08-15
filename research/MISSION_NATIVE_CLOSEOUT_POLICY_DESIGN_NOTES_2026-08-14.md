# Mission-Native Closeout Policy Design Notes

Recorded: 2026-08-14 (America/New_York)

Status: design rationale only; no outcome claim and no authorization to inspect
sealed evaluation families.

## Literal objective

A Chrono Divide game is won by destroying every enemy building. Enemy armed
forces matter only insofar as they protect those buildings, threaten the
attacking force or base, or prevent the attacker from reaching and damaging
the final objective.

The closeout controller should therefore use a lexicographic objective:

1. Prefer any feasible action sequence that destroys the last enemy building
   and ends the game.
2. Otherwise, destroy only the enemy forces or static defenses needed to make
   a building-kill sequence feasible.
3. If no local clearance sequence is feasible, preserve or produce an assault
   force while the underlying Supalosa strategy continues ordinary combat.
4. Return to building destruction immediately when a feasible win path opens.

This implies two important limiting cases:

- If the opponent has one vulnerable building and a large army elsewhere,
  destroy the building instead of fighting the army.
- If the opponent's armed forces are the only barrier to every remaining
  building, eliminate those forces and then close the undefended objectives.

The policy is not simply `always attack buildings` or `always clear forces`.
It is a terminal-objective policy that switches according to the shortest
credible route to destroying all remaining buildings.

## What V29 already implements

The current V29 mission is already closer to this rule than a generic attack
policy:

- `chooseBuildingEliminationEngagement` estimates building-completion time,
  route-threat interception, and attacker survival for one selected building;
- it chooses the building when it is already in range, no route threat exists,
  or the estimated building race finishes before force destruction;
- otherwise it selects a route blocker;
- `completionRace` commits to one building at a time; and
- the terminal-building override can bypass the preterminal force-composition
  requirement.

These are local decisions after a building has already been selected. They do
not yet solve global win-path selection.

## Remaining policy gaps

### 1. Rank win paths, not building classes

V29 first ranks buildings by a fixed class priority (`reinforcement`) and
distance, selects one, and only then evaluates the local building-versus-force
race. A lower-priority building could be the only immediately feasible kill or
could yield a shorter path to literal victory.

A successor should evaluate every compatible remaining building and rank
candidate plans by:

1. immediate terminal kill feasibility;
2. estimated time to building destruction;
3. required blocker-removal time and expected force loss;
4. strategic production value removed; and
5. deterministic distance and object-ID tie breaks.

When exactly one enemy building remains, terminal feasibility must dominate
enemy-force count and building class.

### 2. Clear the minimum sufficient blocking set

V29 chooses one route blocker and the `allBlocker` allocation sends every
compatible assigned attacker against it. This can overfight a screen when a
subset can hold or remove the blocker while the rest damages the building.

The successor should allocate the minimum blocker force that makes the
building plan survivable and keep the remaining compatible attackers on the
objective. If no such split is credible, it should commit the full force to
clearance rather than oscillate.

### 3. Recover from an infeasible local plan

Persistent aggression needs an explicit state machine, not repeated identical
orders:

`BUILDING_RACE -> MINIMUM_CLEARANCE -> FORCE_RECOVERY -> BUILDING_RACE`.

Progress is measured by building hit-point reduction, destruction of the
committed blocker set, reduction in route-threat damage, acquisition of needed
attack capability, or shortened estimated time-to-win. A lack of progress for
a fixed interval triggers deterministic replanning across all buildings,
followed by force recovery if no plan is feasible.

### 4. Preserve the base strategy outside closeout

The mission-native overlay should not replace Supalosa's ordinary economic,
defensive, or combat logic before a credible closeout state. It should seize
units only for a certified plan, release or avoid reserving them when the plan
becomes infeasible, and leave base defense intact unless the literal win is
expected to complete first.

## Outcome-free acceptance tests for a successor

Before any gameplay screen, deterministic unit and compatibility tests should
cover:

- one final reachable building plus 100 nonblocking tanks: all eligible damage
  remains on the building;
- one final building with an intercepting screen: use the smallest sufficient
  screen while the remainder attacks the building;
- one final building whose route cannot survive: clear the certified blocker
  set, then transition back to the same building;
- several buildings where the fixed class-priority target is infeasible but a
  lower-priority target is feasible: select the feasible target;
- destruction or disappearance of a committed blocker: replan immediately;
- stalled building damage: select a different feasible objective or enter
  force recovery, never issue the same ineffective plan indefinitely;
- destroyed enemy armed forces with surviving buildings: transition directly
  to building attack; and
- no feasible plan: preserve the underlying strategy and production while
  recording why activation remains blocked.

## Empirical decision rule

Do not add this successor merely because it sounds strategically correct. The
V29 all-country outcome-blind gate failed on technical faction-completeness and
production-safety criteria, so its frozen V27/V28/V29 open screen is dormant.
V30 repairs those two technical defects without changing target ranking,
blocker allocation, or recovery logic. Only a complete V30 outcome-blind pass
may unlock a newly frozen V30 open screen on a fresh seed domain. If that screen
does not produce a positive closeout signal, use its complete open telemetry to
determine whether failures actually arise from target ranking, excessive
blocker allocation, or recovery deadlock. Then freeze one successor containing
only the implicated mechanism and evaluate it on another fresh open seed
domain.

The paper may describe this mechanism only if a frozen implementation beats
the exact Supalosa comparator on fresh all-country development and then on the
sealed confirmatory families with the prespecified family-clustered uncertainty
and country-breadth gates.
