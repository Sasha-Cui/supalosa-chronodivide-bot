# Terminal-race open-development protocol, version 1

Status: **prospectively frozen before implementation and before any version-1
outcome-bearing launch**
Frozen: 2026-08-13 UTC
Evidence role: permanently open development only; never a paper claim

## Motivation and evidence boundary

The complete 1,800-game building-first campaign passed its technical gate but
did not advance. Array `22129384` and controller `22129385` produced a frozen
analysis with SHA-256
`4ed4f15802893bf465bfe6dd93178b7ad9948426b03b3e1141c79ce5b6512129`.
The full arm went 69/223/68 and had a paired family-macro score effect of
-0.0028 relative to the exact Supalosa control. The complete-population
diagnostic has SHA-256
`bab7ee2edfc602d53468d184b6800483884580cc5bbeabe3c2f1cc310b7910c5`.

The diagnostic identified two population-level bottlenecks. First, the full
arm issued a building strike in only 69/360 games; 121 games emitted only
`no_capable_strike_group` decisions. Second, its friendly adapter rejected
mobile units when they possessed role-irrelevant special mechanics such as
vehicle crushing or an infantry deploy option, even when an ordinary current
weapon had a conservative positive anti-building calibration. This is an
adapter-role mismatch, not outcome-selected parameter tuning. Enemy-threat
upper bounds must remain fail-closed for special mechanics.

The same diagnostic also showed why unconditional aggression is inadmissible.
The blind persistent-liveness arm issued many more building orders but went
52/232/76. By contrast, the full arm's 69 games with at least one certified
building strike contained 27 wins, 42 draws, and zero losses. That association
is descriptive and selection-confounded, but it motivates testing a minimum
certified strike detachment while leaving all other units under Supalosa's
ordinary combat policy.

## Research question

Can a generic terminal-race controller increase literal wins against the exact
pinned Supalosa bot by:

1. certifying an ordinary anti-building weapon independently of role-irrelevant
   unit mechanics;
2. enumerating current enemy buildings through the same public complete-state
   `GameApi` class already available to the pinned opponent; and
3. assigning only a minimum sufficient detachment to a building when its
   conservative time to destruction precedes a conservative lethal intercept,
   otherwise delegating force clearance to Supalosa?

The hypothesis is prospective. A result from this screen may select a policy
for fresh development but cannot support a paper claim.

## Literal endpoint and opponent

- Endpoint: version 5, opponent-attributed physical destruction of every
  currently enemy-owned building.
- Sale, capture, ownership change, cleanup, unspawn, surrender, engine defeat,
  score, and material advantage are not wins.
- A clean engine termination without the literal endpoint is a separately
  labeled draw; a tick-cap episode is a draw.
- Opponent and control: the exact independently loaded, hash-pinned Supalosa
  package and runtime used by the completed building-first campaign.
- Candidate construction: run Supalosa's unmodified `DefaultStrategy` first on
  every update. The terminal controller may overwrite orders only for its
  selected strike or blocker detachment. Every other unit retains Supalosa's
  ordinary order.

## Information interfaces

Two declared interfaces are compared:

- `visible_memory`: own state, currently visible enemies, remembered enemy
  buildings and threats, public map geometry and starts, visibility, and
  reachability. This is the completed campaign's interface.
- `public_complete_state`: the public `GameApi.getAllUnits()` view used in the
  general Chrono Divide bot interface. It may identify current enemy buildings
  and combatants, but it may not access the endpoint adjudicator, destruction
  attribution, future state, opponent internals, or any family role label.

The second interface is not represented as fog-of-war play. It is included as
a fair matched-interface environment condition because the pinned Supalosa
implementation already receives this API class. Visible-memory remains a
required causal ablation. The endpoint evaluator and policy must remain
reference-separated in code and provenance.

## Terminal-race rule

At every eligible interval:

1. Rank currently known enemy buildings by an existing commitment with observed
   progress, conservative completion time, strategic removal value, distance,
   and object ID.
2. Form a friendly lower bound using only an ordinary current weapon whose
   damage, armor verses, rate of fire, projectile travel, ammunition, movement,
   and reachable firing perimeter are calibrated. Ignore additional positive
   mechanics in that lower bound. Vehicle crushing and a deploy option alone
   cannot invalidate an ordinary weapon. Units without an ordinary certified
   anti-building contribution remain excluded.
3. Form enemy upper bounds conservatively. Hidden uncertainty under
   `visible_memory` and every uncalibrated special threat continue to fail
   closed. Public complete state removes hidden-location uncertainty but does
   not convert an uncalibrated special attack into an ordinary one.
4. If the building can be destroyed before lethal route interception, assign
   the minimum sufficient compatible detachment and preserve its target until
   destruction, invalidation, lack of progress, or reversal of the certificate.
5. If direct completion is infeasible, clear only the minimum certified
   blocking set when a finite blocker-then-building route exists. Otherwise
   issue no overlay order and leave force combat to Supalosa.
6. With exact evidence of one remaining building, own-base destruction does not
   veto a feasible finishing strike. An unrelated enemy army is not a blocker.
7. With multiple buildings, retain conservative base defense. A remaining-
   building activation trigger may start the controller before its fixed tick
   only under `public_complete_state`, at or after tick 3,600, when the exact
   current count is at or below the frozen threshold, and after the controller
   has previously observed an exact count above that threshold. This transition
   guard prevents maps that start with few buildings from being mislabeled as
   terminal at game start.

Every overlay interval must be classified as building strike, minimum blocker
clearance, bounded base defense, active search, delegated Supalosa combat, or
capability absence. Repeated delegation is not called `regroup`; telemetry must
record whether candidate units are actually idle, moving, or attacking so that
command liveness is not inferred from an overlay label.

## Frozen arms

All arms share the completed controller's numeric parameters except where an
arm explicitly changes activation or refresh. Exact canonical policies and
hashes will be emitted by the implementation and frozen in the campaign.

1. `baseline_control`: exact Supalosa, overlay disabled.
2. `visible_conservative`: completed full policy, `visible_memory`, original
   all-specials-fail-closed friendly adapter, tick 7,200.
3. `visible_role_calibrated`: arm 2 with only the role-specific friendly lower
   bound.
4. `public_terminal_race_late`: arm 3 with `public_complete_state`, fixed tick
   7,200, and no count trigger.
5. `public_terminal_race_trigger`: arm 4 plus activation when the exact enemy
   building count has fallen from above three to at most three at or after tick
   3,600.
6. `public_terminal_race_rapid`: arm 5 with a three-tick order refresh and a
   180-tick liveness deadline instead of 12 and 600.

Arms 2--3 isolate adapter calibration. Arms 3--4 isolate observation. Arms
4--5 isolate the state-based endgame trigger. Arms 5--6 isolate refresh and
liveness. No arm may change production, economy, opening strategy, map profile,
country-specific scalar, or exact-map behavior.

## Population and schedule

- Families: the same ten permanently open families in campaign SHA-256
  `ea53ebad3590553840b56eb58d805925cb47c9920d69966cd9c3e2385704a02a`.
- Countries: all nine country mirrors, including five Allied and four Soviet.
- Slots: both reciprocal candidate slots under one common engine seed per
  family-country block.
- Seeds: a wholly new block beginning at `4150000000`; no launch or result from
  an earlier campaign may be reused or pooled.
- Schedule: 10 families x 9 countries = 90 indivisible shards; six arms x two
  slots = 12 launches per shard; 1,080 launches total.
- Tick cap: 24,000; `shortGame=false`; no outcome-bearing retry.
- Compute: CPU only, at most 40 concurrent shards, Slurm account `pi_jss233`.

## Outcome-free preconditions

Before the array launches:

1. commit and push a clean `main` source revision;
2. build the bot and driver and pass the full test suite;
3. causally test crusher, deploy-capable infantry, mixed ordinary/special
   weapons, unreachable targets, one building plus 100 irrelevant tanks,
   route blockers, multiple-building base defense, and minimum-detachment
   selection;
4. pass disabled-overlay exact trace equivalence on all nine countries;
5. pass an outcome-blind all-country smoke for every enabled arm, both slots,
   with information-boundary telemetry checked; and
6. freeze source/runtime, policy, campaign, map, seed, opponent, endpoint,
   allocation, and gate hashes.

## Complete-population gate and selection

No outcome is summarized before all 90 scheduler tasks, 1,080 launch records,
episode completions, endpoint records, telemetry records, and source/runtime
commitments reconcile with zero technical or information-boundary violation.
Partial evidence never advances and no outcome-bearing shard is selectively
rerun.

Enabled arms are ranked by:

1. minimum Allied/Soviet literal-win probability, descending;
2. equal-family literal-win probability, descending;
3. win-minus-loss probability, descending;
4. number of countries with wins exceeding losses, descending;
5. draw probability, ascending;
6. median literal-win tick, ascending; and
7. canonical policy hash, ascending.

The first ranked arm advances only if all of the following hold:

- its one-sided family-clustered 80% lower confidence bound for literal-win
  probability is above 0.50;
- its literal wins exceed losses overall;
- pooled Allied and Soviet literal-win point probabilities are each above 0.50;
- wins exceed losses in at least seven of nine countries;
- its family-macro paired literal-win effect over `baseline_control` is
  positive; and
- all launches and evidence boundaries are technically clean.

This is a strict development/futility gate aligned with the user's practical
objective. Failure returns development to the same open population under a new
prospective version; it does not authorize weaker claims or access to fresh or
sealed outcomes.

## Required diagnostics

The complete analyzer reports arm, family, country, faction, slot, and endpoint
aggregates; paired outcome transitions from the control; activation and first
strike ticks; time to first and final observed building damage; remaining
buildings; target commitment changes; certified and rejected attacker counts by
unit rules name and reason; direct-race and blocker certificates; selected
detachment size; delegated-unit action state; stale-order preemptions; and the
fraction of eligible combatants assigned to a building.

No single game may select a policy. Annotated screenshots remain downstream of
a positive fresh and confirmatory result and must be selected deterministically
from telemetry-supported episodes.
