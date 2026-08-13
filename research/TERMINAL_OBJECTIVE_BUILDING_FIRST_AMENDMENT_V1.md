# Terminal-objective building-first amendment, version 1

Status: **frozen before amended source execution**

Frozen: 2026-08-13 UTC

## Why the amendment is required

The literal endpoint permits a player's surviving units to destroy the
opponent's final building after that player's own final building has already
fallen. During a source-level review prompted by the stated limiting case—one
exposed enemy building and 100 enemy tanks—the pre-execution controller was
found to require the candidate's own final base to survive until an otherwise
feasible final-building strike completed. That veto contradicts the endpoint.

Array `22125520` and controller `22125521` were cancelled immediately. Forty
shards reached `run_start` and emitted one `launch_counted` event each, but zero
episodes completed, zero summaries or completion markers were written, and no
outcome was inspected. Their campaign and operational artifacts remain
preserved and are inadmissible for policy selection or paper evidence.

## Prospective decision rule

When observable terminal evidence establishes one remaining known enemy
building:

1. A direct strike is issued if the assigned force is predicted to destroy the
   building before route-intercepting forces make the strike infeasible.
2. The size of an enemy army that neither intersects the route nor attacks the
   strike force does not veto the building strike.
3. Destruction of the candidate's own final base does not veto the strike,
   because base survival is not part of the literal win condition.
4. If route-intercepting forces make the direct strike infeasible, clear only
   the minimum blocking set for which a finite blocker-then-building plan is
   available, then resume the building objective.
5. If terminal evidence is absent, bounded defense of the candidate's final
   base remains available; this amendment does not create an indiscriminate
   all-in policy.

Strike-route and base-survival safety certificates are therefore separated.
The amendment adds deterministic tests for (a) one final building versus 100
irrelevant tanks, (b) a truly blocking force, and (c) preservation of
nonterminal base defense.

## Execution boundary

After compilation and tests, exact-baseline equivalence and the outcome-free
all-country live-bridge smoke gate are rerun under `pi_jss233`. The amended open
campaign uses a new output root and a disjoint engine-seed base. No artifact or
plan from array `22125520` is reused.
