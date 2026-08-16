# Finish-advantage decision doctrine, amendment 1

Status: **prospective tactical clarification frozen before implementation,
state-audit launch, or V5 confirmatory unblinding**

Recorded: 2026-08-15 UTC

This amendment turns the terminal-objective principle in
`2026-08-15-finish-advantage-decision-doctrine-v1.md` into an operational
target-selection rule. It does not authorize a competitive experiment or use
any sealed outcome.

## Literal objective

A Chrono Divide win occurs only when every enemy building has been physically
destroyed. Enemy units are not a second terminal objective. They matter only
when they can prevent our building destruction, destroy our buildings first,
or restore the opponent's ability to prevent the strike.

The controller must therefore choose between **building progress** and
**force removal** according to their effect on the shortest credible path to
the literal win, not according to material value or kill count.

## Prospective decision order

At every overlay reconsideration, apply this order using public bot state:

1. **Preserve survival.** If an enemy action can destroy all of our remaining
   buildings before a candidate strike can finish, protect or interrupt that
   threat with the minimum sufficient compatible force.
2. **Take a feasible terminal strike.** If a remaining enemy building can be
   destroyed before surviving forces can interdict the strike or win the base
   race, focus the required attackers on that building. Non-interdicting enemy
   units are ignored even when they dominate the material count.
3. **Remove only the blocker.** If units, armed structures, or a production and
   redeployment path make the building strike infeasible, attack the smallest
   blocking set needed to make it feasible, then reconsider the building
   immediately. Do not turn a local clearance action into a global army hunt.
4. **Sweep helpless structures.** If the opponent has no effective combat,
   production, deployment, or base-race capability, continuously move from one
   reachable building to the next without searching for irrelevant forces.
5. **Improve the next strike.** When no terminal strike is currently feasible,
   prefer actions that reduce credible time to the next building destruction
   while preserving Supalosa's defense, economy, construction, expansion, and
   retreat commitments.

The canonical boundary case is explicit: one reachable enemy building plus
one hundred enemy tanks that cannot intercept the strike still requires an
immediate attack on the building. Conversely, a single blocking unit that can
stop the strike or win the base race may outrank the building temporarily.

## Feasibility and target ranking

The implementation may declare a building strike feasible only from public
estimates of compatible attacker availability, path reachability, travel time,
damage time, enemy interception, and own-building survival. Unknown or invalid
inputs fail closed to the frozen V5 or exact-Supalosa fallback.

Among feasible buildings, rank lexicographically by:

1. destruction that ends the game;
2. destruction that removes production, deployment, or blocking fire;
3. shortest credible time to physical destruction; and
4. target stability when estimates are effectively tied.

The overlay must concentrate adequate compatible damage on one objective.
Spreading attacks across buildings is permitted only when doing so shortens
the certified time to the literal win under the same survival constraints.

## Liveness and revocation

A strike remains live only while at least one prespecified physical progress
signal improves: target health, attacker distance to a valid firing position,
attacker arrival, or building destruction. After a frozen no-progress interval,
the controller must retry an approach, change the approach point, replace
incompatible attackers, select another building, or revoke the overlay.

Reconsider immediately after a building is destroyed, a blocker enters the
interception path, a base-race estimate changes, an attacker becomes
unavailable, or enemy production/deployment capability reappears.

## Required causal evidence

The causal screen must distinguish at least these mutually interpretable
mechanisms:

- final-building strike with irrelevant forces bypassed;
- blocker removal followed by building focus;
- helpless multi-building sweep; and
- active-resistance surplus strike with protected Supalosa missions.

For each activation, record public-state feasibility inputs, selected target,
protected and leased units, blocker classification, command liveness, building
damage and destruction times, revocation reason, and exact fallback events.
Competitive outcomes may evaluate a fully frozen rule but may not select its
thresholds or retrospectively redefine which enemy forces were relevant.

This clarification was fixed without inspecting a state-audit game or sealed
V5 outcome.
