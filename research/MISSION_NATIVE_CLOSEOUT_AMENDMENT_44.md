# Mission-native closeout amendment 44: V34-R1 pass and frozen V35 liveness repair

## Scope

This amendment closes the allocation-stage technical gate and freezes the next
causal mechanism before its implementation or any outcome-bearing run. It does
not inspect a winner or score, open a development outcome screen, authorize a
confirmatory family, or support a paper claim.

## Complete V34-R1 evidence

The validator-only V34-R1 gate ran exactly once as Slurm job `22262232` from
commit `a8b65fc1e45777bd6d10a1ef5d954ffdffc87e0d` under account `pi_jss233`.
It completed with exit `0:0` in `00:11:36`, used one CPU, and reached maximum
resident memory `524620K`. The immutable artifact is:

`research-evidence/mission-native-closeout/outcome-blind-all-country-gate-v34-r1/22262232/all-country-gate-v34-r1.json`

Its SHA-256 is
`db1b6cd682f8aff4f51297e68e8bedd90ce3cba9e17971347a8b5bcd900991f6`,
and the job wrote `PASS_MISSION_NATIVE_CLOSEOUT_ALL_COUNTRY_GATE_V34_R1` to
`COMPLETE`.

All 72 outcome-free traces and all 18 country-slot cells were present. Every
row passed, direct external and disabled-adapter traces were exactly equal in
18 of 18 cells, enabled repeats were deterministic in 18 of 18 cells, and the
enabled policy changed commands in 18 of 18 cells. There were no global or row
validation errors and no serialized winner or score fields. One direct control
cell and its exact disabled counterpart each recorded eight resignation
attempts; both enabled repetitions recorded zero. This is the prospectively
allowed matched-control case.

The fresh-seed mechanism measurements were:

- 876 preterminal composition-blocked evaluations;
- 12 certified launches, all 12 followed by physical building damage;
- 12 launch handoffs and 7,205 hit points of enemy-building damage;
- 1,412 objective-race allocations, including 453 bounded blocker screens;
- queue-adapter execution with 347 events, 59 paused queues, and 1,676 deferred
  queue observations; and
- zero destructive production reservations.

These measurements establish a reproducible technical allocation mechanism,
not a competitive improvement over Supalosa.

## Remaining liveness defect

V34-R1 can continue issuing an aggressive-looking building or blocker order
without bounding the time since irreversible progress. Existing
`target_stalled` telemetry observes every visible building independently and
retargets among them; it does not certify that the currently committed complete
mission is progressing, does not count physical blocker damage, and cannot
release the strike to ordinary Supalosa combat for a bounded recovery interval.

The next change therefore addresses liveness only. It does not change V34's
activation, production, target priority, route model, objective-race decision,
bounded allocation, or terminal-building priority.

## Victory-objective doctrine

Chrono Divide awards victory when every enemy building is destroyed; eliminating
the enemy army is neither necessary nor sufficient. The closeout policy therefore
uses a lexicographic decision rule rather than a generic seek-and-destroy rule:

1. destroy a reachable enemy building whenever the strike can proceed;
2. attack an enemy force only when it blocks the route, intercepts the strike,
   threatens to destroy the force required to finish the building, or otherwise
   prevents committed building damage; and
3. return to building damage as soon as that blocker is cleared or bypassable.

Consequently, a reachable last building outranks even 100 surviving off-route
tanks: destroying that building ends the game immediately, whereas fighting those
tanks adds risk and delay without advancing the literal victory condition. At the
opposite extreme, when surviving forces prevent access to several buildings, the
policy may first clear the minimum relevant force so the remaining structures
become uncontested targets. The empirical question is not whether the policy is
always more aggressive; it is whether this building-directed, blocker-bounded
aggression converts advantageous states into wins without sacrificing the strike
force to relevant defenders.

## Frozen V35 mechanism

V35 inherits the complete V34 policy and adds exactly four fields:

- `physicalProgressDeadlineFallback: true`;
- `buildingNoProgressDeadlineTicks: 300`;
- `blockerNoProgressDeadlineTicks: 240`; and
- `predecessorFallbackTicks: 180`.

The 300/240/180 timing values are inherited from the already frozen
progress-certified objective policy and are fixed before V35 live evidence.

The committed mission clock starts with its first objective order. It resets
only on one of four public-complete-state facts:

1. positive physical damage to the committed building;
2. destruction of the committed building;
3. positive physical damage to the committed route/interception blocker; or
4. destruction of that blocker.

Repeated attack orders, target labels, changes of blocker identity, changes of
target while the former target remains alive, and raw movement do not reset the
clock. Route-distance improvement and search coverage are not yet admitted
because V35 has no sealed certification interface for them.

If the current action is a building strike and the clock reaches 300 ticks, or
the current action is blocker clearance and it reaches 240 ticks, V35 must:

1. emit one deadline event with the committed target, blocker, last certified
   progress tick, deadline, and released unit identifiers;
2. clear target and blocker commitment and disband the overlay mission;
3. suspend all building-elimination production, readiness, and combat missions;
4. remove only exclusive overlay production requests, without deleting normal
   predecessor requests;
5. leave released combatants under ordinary external Supalosa mission control
   for exactly 180 ticks; and
6. emit a replan event and evaluate a fresh complete building mission after the
   cooldown.

The final building remains the lexicographic objective. A deadline is not an
enemy-army sweep: it is a bounded release to active predecessor combat followed
by a fresh building plan. After replanning, off-route forces remain bypassed and
only route/interception threats may receive the bounded screen.

## Required V35 proof

Before an outcome screen, V35 must pass:

- pure threshold, damage-reset, destruction-reset, and target-switch tests;
- a pure final-building case with 100 off-route tanks and a distinct lethal
  route-blocker case;
- exact disabled-policy identity and enabled same-seed determinism;
- live physical-progress, deadline, overlay suspension, active-predecessor, and
  replan telemetry;
- all-country and reciprocal-slot support with no resignation by the enabled
  candidate or baseline;
- preservation of every V34-R1 allocation and queue-safety invariant; and
- a complete fresh 72-trace outcome-blind matrix with one immutable artifact.

If the live matrix does not expose the deadline mechanism across both factions
and reciprocal slots, V35 fails closed; tests alone are insufficient. Only a
complete V35 technical pass may open the prespecified development-only outcome
screen.
