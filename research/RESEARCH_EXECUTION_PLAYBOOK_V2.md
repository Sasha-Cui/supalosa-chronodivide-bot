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

Choose the feasible mission with the shortest conservative time to the next
building destruction. Do not choose force clearance merely because the enemy
army is valuable or close. Do not choose a suicidal building attack merely
because buildings define the endpoint.

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
- V36 adds bounded recovery from that ownerless state while leaving prior policy
  semantics unchanged when a predecessor owns units.
- V36-R1 array `22270897` passed its complete 18-cell outcome-blind technical
  gate, but none of its traces exposed the new no-owner recovery branch. It
  therefore established ordinary liveness but not the behavior specific to the
  V36 repair.
- V36-R2 is prospectively frozen to extend the live exposure horizon on fresh
  seeds. It must exhibit at least one exact no-owner recovery and remain clean
  across all planned cells before any competitive outcome screen.

These statements are engineering checkpoints, not evidence that V36 improves
win probability.

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

1. Finish V36-R2 outcome-blind no-owner exposure without inspecting outcomes.
2. Pass the broader V36 all-country reciprocal compatibility gate.
3. Run a fresh open-development comparison against exact Supalosa and the last
   valid predecessor policy.
4. Use complete aggregate diagnostics to decide whether the closeout mechanism
   improved literal wins and which failure class remains.
5. Iterate prospectively on open families until a frozen positive policy exists.
6. Only then enter fresh sealed confirmation, uncertainty analysis, ablations,
   screenshot extraction, and paper writing.
