# Chrono Divide research execution playbook, version 2

Status: **operational lessons and prospective development rules**

Recorded: 2026-08-15 UTC

This document consolidates the project's research-process lessons before the
next outcome-bearing experiment. It does not change a frozen campaign, unblind
sealed evidence, or claim that the current policy beats Supalosa. Prospective
tactical rules remain hypotheses until they pass the gates below.

## Objective and non-negotiable endpoint

The engineering objective is to produce a releasable policy that reliably
defeats the pinned external Supalosa bot across countries and reciprocal starts.
The scientific objective is to explain which policy mechanism causes that
improvement under a reproducible evaluation protocol.

A literal win occurs only when the opponent owns zero surviving buildings as a
result of physical destruction. Army advantage, score, attack count, surrender,
sale, capture, an engine finish flag, or a favorable state at the tick cap is
not a win. Draw reduction matters only when draws are converted into literal
wins rather than relabeled.

## The controller's decision problem

Enemy buildings are the terminal objective. Enemy forces are instrumental:
they should be fought only when fighting them is a faster or necessary path to
destroying the remaining buildings.

At every closeout decision, estimate complete missions rather than ranking a
single nearby target:

1. **Direct building mission:** reach a compatible building, survive relevant
   interception, and deal enough damage to destroy it.
2. **Blocker-then-building mission:** remove only the force that makes the
   direct mission infeasible, then resume the same building mission.
3. **Force-clearance mission:** remove a larger opposing force only when doing
   so is predicted to make subsequent building kills feasible or faster—for
   example, when eliminating the army makes several buildings free targets.
4. **Search or capability mission:** when no building is known, reachable, or
   damageable, keep Supalosa's ordinary combat active while searching or
   producing the missing movement or damage capability.

Choose the feasible mission with the shortest conservative time to zero enemy
buildings. Time to the next building destruction is a useful local proxy, but
it must not reward a quick kill that strands the army or removes the capability
needed to reach the remaining buildings. Do not choose force clearance merely
because the enemy army is valuable or close. Do not choose a suicidal building
attack merely because buildings define the endpoint.

The target hierarchy is therefore state-dependent, not a fixed instruction to
attack either buildings or forces in every state:

1. **Take a terminal building kill whenever it is feasible.** If destroying the
   selected building reduces the opponent to zero buildings before relevant
   interception can stop the strike, no surviving enemy army can outweigh that
   action. The game ends on the building kill.
2. **Remove only the forces that prevent a near-term building kill.** When an
   interceptor, route blocker, or base threat makes the building mission fail,
   suppress the minimum relevant subset and immediately resume the committed
   building mission.
3. **Clear the army when doing so creates free building kills.** If no building
   can currently be destroyed safely and eliminating the opposing combat force
   makes one or more buildings defenseless, force clearance is a valid terminal
   subgoal. It must be justified by the resulting building missions rather than
   by unit-value destruction alone.
4. **Never idle after gaining an advantage.** Once relevant opposing forces are
   gone, surviving buildings are free objectives and must be searched for,
   reached, and destroyed without regroup loops or a retained post-victory
   reserve.

This is the **finish-advantage principle**: destroy forces to create or protect
building access, then convert that access into physical building destruction.
Conversely, bypass even a very large army when it cannot affect a feasible
last-building strike. Armed-force destruction and building destruction are not
co-equal score objectives; the former is useful only insofar as it changes the
probability or completion time of the latter.

The comparison must be counterfactual: estimate what happens if the strike
group attacks the building now, if it removes only route-relevant blockers
first, and if it clears the opposing army first. Count an enemy unit as relevant
only when it can intercept the strike, block the route, destroy a capability
that the strike requires, or prevent a subsequent building kill. This avoids
the common failure mode in which combat looks productive while terminal
progress stops.

### Final-building rule

When exactly one enemy building remains, building destruction has
lexicographic priority:

- If a compatible detachment can reach and destroy it before relevant
  interception defeats the detachment, attack immediately.
- Ignore enemy units that neither block the route nor intercept the strike.
  One reachable building versus 100 tanks elsewhere is a building attack: the
  building kill ends the game.
- If a relevant force makes the strike fail, clear the minimum relevant force
  and immediately resume the committed building mission.
- Do not retain a post-victory reserve. Threats to our own base do not veto a
  feasible final-building kill, although threats to the strike group do matter.

### Continuous-offense invariant

"Keep attacking" means verified progress toward building elimination, not
repeated command issuance. Every usable combatant must have an observable role:
building strike, minimum blocker clearance, bounded defense, active search, or
movement toward a missing capability.

Progress is physical building damage or destruction, relevant-blocker damage or
destruction, certified route improvement, completed search coverage, or
creation of a missing capability. Regroup loops, repeated fallback without an
active predecessor-owned mission, and repeated orders without physical or
certified progress are liveness failures.

The policy must expose the distinction in telemetry. For every closeout mission,
record the estimated direct-building completion time, blocker-first completion
time, force-clearance completion time, selected mission, selected target,
route-relevant forces, time since last physical progress, and reason for every
replan. In particular, measure last-building opportunity latency: the ticks
between the first feasible terminal strike and the attack order, and between the
attack order and physical destruction. Frequent stalemates with an army capable
of attacking are policy failures, not acceptable neutral outcomes.

Every mission therefore needs a bounded no-progress deadline. On expiry, clear
the stale commitment, permit active predecessor control for a bounded interval,
and replan. A fallback is valid only if it actually owns and commands units; a
fallback label alone is insufficient evidence of activity.

## Process lessons consolidated

### 1. Prove intervention before estimating outcomes

The most expensive mistake is running a large competitive screen for a policy
whose intended branch rarely executes or does not own relevant units. Before
any outcome screen, deterministic tests and a live outcome-blind gate must prove
that the policy:

- issues the intended building and blocker orders;
- differs causally from exact Supalosa in the intended state;
- leaves nonintervened units under active Supalosa control;
- supports every country and reciprocal slot;
- recovers from stale or ownerless fallback; and
- serializes enough telemetry to distinguish action from labels.

### 2. Diagnose population-level mechanisms

Do not redesign the policy around one memorable draw, win, or screenshot.
Aggregate open-development telemetry should identify a repeated failure class:
missing target knowledge, incompatible attackers, unreachable routes, late
capability production, irrelevant force diversion, stale orders, ownerless
fallback, overcommitted defense, or insufficient time to complete destruction.
One version should address one dominant class wherever possible.

### 3. Keep selection and confirmation separate

Open-development families may guide policy changes. Fresh development and
confirmatory families remain sealed until their prespecified technical and
positive-signal gates authorize access. Never tune repeatedly against a fresh
family until a positive result appears. Never selectively rerun
outcome-bearing games after seeing their outcomes.

### 4. Preserve exact provenance and complete populations

Each result must bind source and runtime commits, external baseline identity,
map and campaign hashes, policy hash, seed, country, physical slot, Slurm
account, array task, controller job, and output commitments. Analyze only after
all expected tasks complete cleanly. Missing tasks, duplicate launches, mixed
source revisions, wrong accounts, endpoint violations, and partial populations
fail closed.

### 5. Keep the frozen checkout frozen

Do not change tracked files while a frozen array or its controller is active.
Stage notes and prospective code outside the checkout, then apply them after the
frozen jobs terminate. This prevents documentation or unrelated edits from
silently changing the revision observed by late-starting tasks.

### 6. Use milestone monitoring

Monitor scheduler counts, materialized shards, completion markers, nonempty
stderr, account identity, controller state, and artifact hashes. Avoid frequent
manual polling and avoid printing large raw evidence artifacts. Use compact,
schema-aware summaries and notify on completion, failure, anomalous throughput,
or needed input.

### 7. Make the paper downstream of evidence

Protocols, metrics, claim boundaries, and selection rules are written before
outcomes. The abstract, superiority claim, mechanism narrative, and annotated
game screenshots are written only after the primary comparison and uncertainty
analysis are complete. Screenshots illustrate telemetry-supported tactics; they
do not substitute for population evidence.

### 8. Optimize the research loop, not just the game policy

Use the cheapest artifact that can answer the current question. A deterministic
state test should establish a decision rule; a short outcome-blind live gate
should establish ownership, execution, and telemetry; only a complete
competitive population should estimate win probability. Do not pay for a large
outcome screen to discover an interface error, an unexposed branch, or an idle
fallback.

Each development version should state one dominant population-level failure
class and one intended causal repair before implementation. Keep the predecessor
and exact Supalosa as simultaneous controls. If a version fails its frozen
positive gate, use the complete open-development aggregate to select the next
mechanism, assign a new version and fresh seeds, and preserve the failed version
without selective reruns. Confirmation data remains untouched throughout this
loop.

Prefer fail-closed arrays with one immutable manifest, small homogeneous shards,
structured progress telemetry, and a dependent controller that is incapable of
aggregating a partial population. Monitor milestones rather than individual
game outcomes. This makes scheduler failures cheap to diagnose and prevents
research decisions from being driven by whichever games finish first.

## Staged empirical ladder

### Gate A: deterministic decision tests

At minimum, cover:

- one reachable final building with 100 irrelevant tanks;
- a final building protected by genuinely lethal route interceptors;
- an exposed multi-building base for which army clearance is slower than a
  direct building kill;
- a defending army whose removal makes later buildings free targets;
- unknown, unreachable, and incompatible building targets;
- expired building and blocker missions;
- fallback with and without a unit-owning predecessor mission; and
- exact disabled-overlay equivalence with Supalosa.

### Gate B: live outcome-blind exposure

Across all nine countries and both physical slots, establish legal deterministic
orders, branch exposure, actual unit ownership, progress bookkeeping, deadline
recovery, active nonintervened units, and exact control equivalence. Do not
serialize or inspect winners, scores, or terminal building counts.

### Gate C: open-development competitive screen

Use paired seeds, reciprocal starts, all countries, an exact Supalosa control,
and narrow causal ablations. Measure literal win/loss/draw counts, paired effect,
time to building destruction, nonliteral termination, target concentration,
building-damage gaps, blocker time, and liveness failures. Advance only under a
frozen positive rule.

### Gate D: fresh and sealed confirmation

Freeze the selected policy before fresh evaluation. Confirm on multiple map
families, seeds, countries, and reciprocal starts with family-clustered
uncertainty. Unblind only after technical completeness. Run explanatory
ablations after fixing the primary result.

## Current checkpoint

- The V35 open-development population is permanently invalid without outcome
  access. Its live technical evidence exposed an ownerless predecessor-fallback
  state, so it cannot support a policy claim.
- V37-R2 completed its frozen 18-cell outcome-blind gate under Slurm account
  `pi_jss233`. It exposed both predecessor-owned fallback and no-owner recovery,
  with no incomplete traces or ownership-loss recovery failures.
- V37-C1 completed a fresh 72-trace, all-nine-country, reciprocal compatibility
  gate. It established intervention exposure, physical building and blocker
  progress, exclusive scheduling, objective-race allocation, handoff behavior,
  and exact disabled-overlay compatibility without reading outcomes.
- The frozen V37 540-game open-development campaign completed under Slurm
  account `pi_jss233` as array `22302207`. All 90 shards completed cleanly and
  produced exactly 180 games for each of exact external Supalosa, V34, and V37.
  The original controller `22302260` failed on a key-order-sensitive commitment
  comparison; the prospective validator repair was tested in `22304967`, and a
  provenance-safe aggregation repair was tested in `22305093`. Controller
  `22305107` then aggregated the existing complete population without rerunning
  any game.
- V37 failed its frozen positive gate. Exact external Supalosa produced
  34 wins, 113 draws, and 33 losses; V37 produced 6 wins, 98 draws, and 76
  losses. The paired family-macro literal-score effect was -0.1972 and all ten
  leave-one-family-out effects were negative. This is affirmative evidence
  against the broad V37 takeover policy, not an inconclusive partial run.
- The dominant V37 failure was premature, broad mission takeover. It activated
  in 150 of 180 games, usually near tick 3,924 with roughly balanced armies,
  preempted ordinary Supalosa attack missions in every activated game, and
  often exposed the candidate base. Terminal-building prioritization itself
  was not the observed problem: all five V37 games that reached its terminal
  priority state were wins.
- Permanently open prior evidence identifies a narrower foundation. The V4
  final-building hybrid converted two exact-Supalosa draws into wins without
  converting any win or draw into a loss (28/119/33 versus 26/121/33 over 180
  paired games). The remaining 18 exposed final-building draws repeatedly
  issued orders without physical progress.
- Trace and source inspection found a concrete liveness defect in those draws:
  an enemy building known through complete public state but not currently
  visible receives a direct attack-by-ID order. The engine appears to ignore
  that order, so units neither move to reveal the building nor damage it. The
  next prospective mechanism is visibility-aware terminal assault: attack-move
  to exact coordinates while the building is unseen, then switch to direct
  attack once it becomes visible. This retains the narrow final-building gate
  and hybrid clearance of genuinely route-relevant blockers.

These statements are engineering checkpoints, not evidence that V37 improves
win probability. V37 materially underperformed Supalosa. The V4 draw-to-win
transitions and the unseen-target defect justify the next open-development test,
but they do not establish that the proposed repair will beat Supalosa.

## Definition of done before paper writing

The empirical program is ready for a superiority paper only when all of the
following hold:

1. A releasable policy passes deterministic and live all-country technical
   gates with no hidden evaluator-only behavior.
2. It beats exact Supalosa under the frozen literal endpoint on complete,
   paired, reciprocal evidence, with wins exceeding losses and the
   prespecified confidence bound excluding no improvement.
3. The result is not an Iraq-only effect and is evaluated on more than one map
   family or environmental condition.
4. Draw reduction is explained by increased physical building completion rather
   than relabeling nonliteral terminations.
5. Narrow ablations support the proposed causal mechanism.
6. Every table, figure, and annotated screenshot is traceable to an immutable
   manifest, configuration, job ID, and evidence artifact.

If these conditions do not hold, the next action is further open development or
a candid no-go decision—not paper rhetoric.

## Immediate execution order

1. Implement the single V5 repair to the narrow V4 final-building hybrid:
   attack-move to an exact unseen building's coordinates and switch to direct
   attack only when visible. Preserve exact Supalosa behavior outside the
   terminal gate.
2. Add deterministic tests for visible, exact-unseen, remembered, unreachable,
   blocker-protected, and one-building-versus-100-irrelevant-tanks states. Prove
   the intended order and ownership change before any outcome screen.
3. Pass a fresh all-nine-country, reciprocal, outcome-blind live gate. Require
   legal orders, actual unit ownership, direct evidence of exact-unseen movement,
   visible-target handoff, physical progress, and active predecessor behavior
   outside the intervention.
4. Freeze a complete paired open-development comparison with three simultaneous
   arms: exact external Supalosa, the V4 final-building hybrid, and V5. Use fresh
   seeds, reciprocal starts, all nine countries, multiple open map families, a
   fail-closed controller, and no selective reruns.
5. Advance only if V5 passes the prospectively frozen positive rule: positive
   family-clustered literal-score effect versus exact Supalosa, more wins than
   losses overall and across both factions, broad country support, higher wins
   and fewer draws than both controls, and no negative leave-one-family-out
   effect. Otherwise diagnose the complete population and make one new
   mechanism-specific open-development revision.
6. After a policy passes, freeze it and run fresh multi-family, all-country
   confirmation plus uncertainty analysis and narrow causal ablations of
   visibility-aware approach, blocker clearance, and terminal-only activation.
7. Extract annotated screenshots only from traceable confirmed games, including
   a direct terminal bypass, a necessary blocker clearance, a force-clearance
   transition to free buildings, and an exact-unseen approach-to-visible handoff.
   Then write the paper around the measured result and supported mechanism.
