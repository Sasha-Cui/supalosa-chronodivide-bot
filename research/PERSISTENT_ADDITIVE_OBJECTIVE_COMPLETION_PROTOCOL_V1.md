# Persistent additive objective completion, prospective protocol v1

Status: **frozen before outcome-bearing evaluation; implementation and outcome-blind compatibility in progress**  
Frozen: 2026-08-14 UTC  
Evidence role: permanently open development only; never a paper performance claim

## Research question and literal objective

Can a coordinate-free controller layered on the exact pinned external Supalosa
bot turn unfinished positions into literal wins by maintaining building-directed
pressure while preserving Supalosa's useful economy, production, scouting,
defence, and ordinary attacks?

The terminal objective is physical destruction of every enemy-owned building.
Enemy-force destruction is instrumental, not a second victory condition. A
favourable army, more attack orders, material advantage, engine defeat, sale,
capture, surrender, or survival to the tick cap is not a win.

The policy therefore uses the following lexicographic rule:

1. Attack a reachable enemy building with a compatible detachment whenever the
   building can be advanced toward or damaged.
2. If exactly one enemy building remains, release the terminal reserve and
   commit every compatible reachable combatant to it. Enemy forces outside the
   strike route and threats to the candidate's base do not veto this attack.
   This includes one remaining building versus one hundred off-route tanks.
3. If a force physically intersects a stalled strike route, clear only the
   minimum selected route blocker, then immediately resume the same building.
4. If no current unit can reach and damage a building, or a bounded
   multi-building lease makes no route, building, or blocker progress, return
   those units to unchanged Supalosa control for a bounded interval and replan.
5. At every decision cycle each combatant remains under one of: building
   strike, minimum route-blocker clearance, bounded home reserve, or unchanged
   Supalosa control. There is no global wait state.

## Mechanism motivated by completed open evidence

Progress-certified v2 did not advance. Its safe exact-one hybrid converted two
paired draws to wins without degrading a paired control result, but it activated
in only 46/180 games and changed too few outcomes. The broader count-five arm
degraded existing wins. Its telemetry also showed many nominally eligible units
rejected by the prediction adapter and long physical no-progress intervals.

Source inspection identified a separate execution defect: Supalosa's mission
controller runs every three ticks before the wrapper strategy, while v2 refreshed
objective orders only every twelve ticks. A Supalosa mission could therefore
overwrite an objective order on the next cycle and retain control for most of
the interval. Version 1 addresses this executor conflict rather than repeating
the v2 target-ranking sweep.

## Frozen controller interface

The canonical policy schema is version 5 in
`persistentObjectiveCompletionPolicy.ts`. It requires:

- the declared `public_complete_state` game interface already available to
  both bots, kept reference-separated from endpoint adjudication;
- exact Supalosa first on every strategy update, followed by the objective
  layer on the same three-tick cadence;
- target-specific command compatibility based on a positive current
  anti-ground weapon/armor relation and a reachable firing perimeter;
- prediction and command eligibility as separate concepts, so an unrelated
  special secondary mechanic cannot suppress an ordinary usable weapon;
- full compatible force only at exact enemy-building count one;
- a bounded leased surplus detachment above count one, with locked missions,
  local home defenders, harvesters, and dogs excluded;
- physical building damage, blocker damage, or route-distance reduction as the
  only liveness signals;
- bounded building, blocker, lease, and fallback clocks; and
- deterministic telemetry for target identity and armor, rejected unit type and
  reason, mission assignment and lock, current action, reachability, selected
  attackers, order type, route progress, and physical damage.

The controller may use a public exact object identifier to issue `Attack`, but
may not inspect endpoint state, future state, opponent code or strategy state,
map-family roles, country-specific constants, or game outcomes.

## Outcome-blind compatibility gate

No outcome-bearing screen may launch until all of the following pass:

1. Node 20 type checking and the complete repository test suite.
2. Exact disabled-wrapper action and state-trace identity with the independently
   loaded external Supalosa package.
3. Deterministic direct-order reassertion after Supalosa every three ticks.
4. A one-building plus 100-off-route-tanks test that attacks the building with
   the full compatible force.
5. A matched route test that attacks only the intersecting blocker after the
   building route stalls.
6. Multi-building tests that never lease a locked mission or a protected local
   home defender.
7. Two deterministic live runs for all nine countries and both reciprocal
   physical slots, with nonempty objective-command exposure, legal actions,
   next-cycle movement/attack observations, and no resignation.
8. Per-country telemetry that identifies every rejected rules name and reason,
   distinguishes ordinary usable weapons from unrelated special mechanics, and
   reports selected, delegated, idle, moving, and attacking counts.

The live gate stops at a fixed tick and records no winner, score, endpoint, or
terminal aggregate. An early finish fails closed rather than being inspected.

## Frozen open-development arms

All arms use the exact external Supalosa core, all nine countries, both
reciprocal slots, common paired seeds, and the same open map-family population.
The implementation will emit exact canonical hashes before launch.

1. `external_control`: overlay disabled.
2. `persistent_terminal_only`: persistent exact-one full-force rule; no earlier
   assault lease.
3. `idle_additive_fallback`: terminal rule plus a small unassigned-idle lease;
   stalled routes return to Supalosa without explicit blocker targeting.
4. `available_additive_fallback`: arm 3 may lease any unassigned compatible
   unit.
5. `unlocked_additive_fallback`: arm 4 may also lease compatible units from an
   unlocked mission, but never a locked or protected home unit.
6. `unlocked_additive_route`: arm 5 plus minimum route-blocker clearance after
   a certified building-route stall.

The common multi-building scope begins at tick 3,600, applies at 2--16 current
enemy buildings, caps the detachment at eight units and one third of compatible
force, retains four ordinary reserve units, and requires at least two own
buildings. These values are development hypotheses, not claimed optima.

## Population, analysis, and advancement

The first screen uses the ten permanently open families already declared for
terminal-policy development, nine country mirrors, two reciprocal slots, and a
fresh seed block never used by a previous campaign. It contains 1,080 games:

$$
10\text{ families}\times 9\text{ countries}\times
6\text{ arms}\times 2\text{ slots}=1{,}080.
$$

Every planned game is outcome-bearing and indivisible. There are no selective
retries. No policy outcome is loaded until every shard, event stream, endpoint
record, scheduler row, source/runtime commitment, and launch count passes one
fail-closed technical gate.

Enabled arms are ranked by the minimum Allied/Soviet literal-win probability,
then equal-family literal-win probability, win-minus-loss probability, country
breadth, draw probability, median literal-win tick, and canonical policy hash.
The first ranked arm advances only if:

- its one-sided family-clustered 80% lower bound for literal-win probability is
  above 0.50;
- literal wins exceed losses overall;
- Allied and Soviet pooled literal-win point probabilities each exceed 0.50;
- wins exceed losses in at least seven of nine countries;
- its paired family-macro literal-win effect over external control is positive;
- favourable paired conversions exceed degradations of external-control wins;
  and
- every technical, endpoint, information-boundary, and intervention-exposure
  gate passes.

Failure returns development to the same permanently open population under a
new prospective version. It does not authorize a weaker paper claim, fresh-
family tuning, selective reruns, early access to sealed outcomes, confirmatory
evaluation, or paper writing.
