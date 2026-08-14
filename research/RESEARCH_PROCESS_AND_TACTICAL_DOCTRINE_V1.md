# Research process and objective-race doctrine, version 1

Status: **prospective development doctrine; frozen before outcome-bearing evaluation**

Frozen: 2026-08-14 UTC

## Purpose and claim boundary

This note consolidates the process lessons from the completed continuous-offense
open-development campaign and translates the literal Chrono Divide win condition
into testable controller rules. It is a development specification, not evidence
that the new rules improve win probability. No result from a future campaign may
be used to rewrite this version or retroactively reinterpret a failed arm.

The endpoint is literal destruction of every enemy building. Destroying enemy
forces is useful only insofar as it makes that endpoint faster or feasible.
Surviving the tick cap with a favorable army, producing more attacks, reducing
enemy unit count, or forcing a nonliteral engine termination is not a win.

## Lessons for the research process

1. **Start from the competitive predecessor.** The exact pinned external
   Supalosa core is the default production, scouting, defense, and ordinary
   combat policy. The frozen macro champion is retired as the base of new
   objective-policy experiments because it was already materially behind the
   external self-control in open development.
2. **Require causal isolation.** Each campaign includes an exact external
   self-control, a disabled-overlay equivalence control, and narrowly different
   enabled arms. Timing, target choice, force diversion, reserve release, and
   progress deadlines are not changed simultaneously without explicit
   ablations.
3. **Prove behavior before measuring outcomes.** Pure decision tests and an
   outcome-blind live compatibility gate must demonstrate the intended action,
   exact disabled behavior, intervention exposure, all-country support,
   reciprocal-slot support, legal commands, and deterministic traces before an
   outcome-bearing campaign launches.
4. **Scale evidence in stages.** Run type checks and pure tests first, then one
   small Slurm smoke test, then the frozen open-development screen. Do not spend
   a full campaign to discover a path, module-identity, command-validity, or
   telemetry defect.
5. **Measure irreversible progress.** A repeated attack label or command is not
   evidence of progress. The controller clock advances only on physical building
   damage or destruction, committed-blocker damage or destruction, certified
   route improvement, completed search coverage, or creation of a missing
   capability. The initial implementation certifies the first two and fails
   closed on the others until they have sealed interfaces.
6. **Make nonprogress actionable.** Every overlay mission has a finite no-damage
   deadline. When it expires, the overlay yields for a bounded interval to the
   unchanged predecessor, clears its stale commitment, and replans. The fallback
   is active ordinary combat, not idling.
7. **Preserve complete evidence.** Count every launch and failure; use exclusive
   output roots, immutable manifests, exact source/runtime/map/policy hashes,
   scheduler job IDs, and one scheduled complete-population analysis. Never
   selectively retry games on the basis of outcomes or inspect a partial
   population.
8. **Let experiments change the paper.** Write protocols and claim boundaries
   before outcomes, but write the paper's empirical narrative only after the
   competitive and uncertainty gates finish. A null result changes the method
   decision; it does not become a positive claim through rhetoric.

## Tactical doctrine

### 1. Buildings define the terminal objective

At every intervention point, rank a *complete mission* ending in destruction of
an enemy building. Its cost includes travel, compatible building damage,
necessary blocker clearance, and a penalty for abandoning a committed mission.
Do not rank a nominally nearby building first when its lethal route makes its
complete mission slower or infeasible.

### 2. Enemy forces are obstacles, not a second victory condition

An enemy force is cleared when at least one of the following is certified:

- it physically blocks all usable firing routes to the selected building;
- it will destroy the assigned strike group before that group can destroy the
  building; or
- in a nonterminal state, it will remove an indispensable capability before a
  feasible building mission completes.

Otherwise the force is bypassed. Eliminating an enemy army can make later
building destruction free, but it is worthwhile only when that clearance has a
lower complete objective cost than the available building-first mission.

### 3. The final building gets lexicographic priority

When exactly one enemy building remains and a compatible strike can reach and
destroy it before relevant interception, issue the building attack with the full
compatible force. This remains true if 100 enemy tanks survive elsewhere on the
map or are attacking the candidate's base: destroying the last building ends the
game. Off-route forces do not veto or delay that strike.

If a force actually prevents the final strike from completing, clear only the
minimum route/interception blocker set and immediately resume the same building
mission. The terminal reserve is zero; every compatible available combatant may
contribute to the winning attack.

### 4. Multiple buildings require an objective race, not blind focus fire

Before the final-building state, compare exposed building missions with
blocker-then-building missions. Prefer direct building damage whenever it is
feasible. Clear forces when doing so opens the route, preserves the strike
capability, or is predicted to reduce the complete time to the next building
destruction. Re-evaluate after physical damage, destruction, a deadline, or a
material route change; do not oscillate every order tick.

### 5. Continuous offense means verified forward progress

The controller should almost never reach a stalemate merely because an old
target or blocker order is being repeated. A mission is healthy only while it
continues to cause certified physical progress within its deadline. On expiry:

1. record whether the stalled mission was a building strike or blocker clear;
2. clear the stale commitment;
3. let the exact predecessor fight for a bounded interval; and
4. rank a fresh complete building mission.

This rule distinguishes persistent aggression from command spam. Draw reduction
is evaluated by literal wins, win time, building-destruction trajectories, and
deadline recovery—not by the raw number of attack orders.

## Required pre-outcome tests

The next implementation and compatibility gate must establish all of the
following before any performance unblinding:

- exact disabled-overlay trace identity with pinned Supalosa;
- direct final-building priority with 100 off-route enemy tanks;
- blocker clearance when the same tanks occupy or lethally intercept the route;
- zero reserve for the exact final-building race;
- full-mission target ranking, including blocker and switching costs;
- building and blocker no-damage deadline expiry followed by active predecessor
  fallback and replanning;
- no activation outside the declared final-building or guarded-low-building
  scope;
- deterministic, actionable orders for all nine countries and both reciprocal
  slots; and
- telemetry that distinguishes physical progress, stale fallback, target
  switching, reserve release, and complete-mission cost.

## Development ladder

The first causal screen will compare the exact external control with narrowly
defined overlays. The minimum useful ladder is: final-building direct attack,
final-building progress-certified hybrid, and guarded-low-building-count hybrid.
A no-deadline or effectively unbounded-deadline arm isolates the liveness
mechanism if the launch budget permits. All arms share the same literal endpoint,
fresh paired seeds, reciprocal starts, all nine countries, and open-development
families.

An enabled method advances only on the prospectively frozen positive signal and
technical gates. Confirmatory evaluation remains sealed until then. Reliable
superiority requires an absolute literal-win probability above one half with a
positive lower confidence bound, wins exceeding losses, positive paired effect
over exact Supalosa control, and nonfailure across the country strata specified
in the campaign protocol. Until those gates pass, the project has a development
method—not a paper claim that it beats Supalosa.
