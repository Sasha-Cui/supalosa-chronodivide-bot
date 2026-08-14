# Tactical target arbitration amendment, version 1

Status: **prospective doctrine; frozen before implementation and outcome-bearing evaluation**

Frozen: 2026-08-14 UTC

## The decision the policy must make

Chrono Divide is won by destroying every enemy building. Enemy armed forces are
not a parallel objective. They matter only when fighting or bypassing them
changes whether, or how quickly, the next enemy building can be destroyed.

Persistent aggression therefore means persistent progress toward building
elimination. It does not mean continuously selecting the nearest enemy unit.

## Lexicographic terminal rule

When exactly one enemy building remains:

1. If a compatible strike group can reach and destroy the building before
   relevant interception makes the strike fail, attack the building immediately.
2. Ignore enemy forces that do not block the route, intercept the strike group,
   or otherwise prevent completion. This includes the limiting case of one
   reachable building and 100 surviving tanks elsewhere: destroy the building
   and win.
3. If enemy forces make the strike infeasible, clear only the smallest relevant
   blocker or interceptor set, then resume the same building attack immediately.
4. Do not reserve forces for a future state after the final building is gone.

The number, value, or proximity of irrelevant enemy units must never override a
feasible final-building kill.

## Preterminal rule

When multiple enemy buildings remain, compare complete plans rather than
individual targets:

- **Direct building plan:** travel to a compatible building, survive relevant
  interception, and deal the damage needed to destroy it.
- **Blocker-then-building plan:** eliminate only the forces preventing that
  building plan, then destroy the building.
- **Force-clearance plan:** eliminate a larger enemy force only when doing so is
  predicted to make one or more subsequent building eliminations faster or
  feasible—for example, when removing the opposing army leaves its buildings
  undefended.

Choose the feasible plan with the shortest conservative estimate of time to the
next building destruction. A force-clearance plan is not justified by combat
advantage alone. Conversely, blindly attacking a building is not justified when
the assigned strike group will be destroyed before causing useful building
damage.

## Progress and replanning

Each committed plan has a bounded no-progress deadline. Progress is physical
building damage or destruction, relevant blocker damage or destruction, or a
verified route improvement—not repeated orders or combat animations. On expiry,
clear the stale commitment, permit bounded predecessor control, and replan.

Replan after a target is destroyed, relevant interception changes materially,
the assigned force becomes incompatible, or the no-progress deadline expires.
Do not oscillate between units and buildings on every controller tick.

## Required outcome-blind evidence

Before measuring wins, the live compatibility gate must serialize enough public
state to establish:

- whether the state is terminal-building or preterminal;
- the selected plan class and building objective;
- which enemy units, if any, were classified as relevant blockers;
- the estimated completion time for each feasible plan class;
- every transition from blocker clearance to building attack;
- physical building and relevant-blocker progress; and
- deadline expiry, predecessor fallback, and replanning.

Deterministic tests must cover a reachable final building with 100 irrelevant
tanks, a final building protected by genuinely lethal interceptors, an exposed
building versus a removable defending army, and a building attack that stalls
and must be replanned.

## Claim boundary

This note specifies intended behavior; it is not evidence that the behavior
reduces draws or beats Supalosa. Those claims require prospectively frozen,
paired, reciprocal-slot experiments and uncertainty estimates after all
technical gates pass.
