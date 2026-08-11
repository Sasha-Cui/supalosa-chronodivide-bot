# Method-v3 prospective empirical program

Status: **frozen before the first method-v3 outcome-bearing launch**.

Frozen on: **2026-08-11**.

This program supersedes the submission path, but not the immutable evidence,
of method v2. Method v2 remains a completed pilot: it improved a generic
StrongBot reference but did not establish reliable superiority over Supalosa.
No method-v2 test-family game may be selectively rerun or relabeled as
method-v3 confirmation.

## Research target

Method v3 asks whether one coordinate-free StrongBot policy can defeat the
pinned, independently loaded Supalosa bot reliably across map families and all
nine supported countries. A win requires the engine's short-game condition:
destruction of every enemy building. Terminal material never counts as a win.

The primary engineering target is conversion rather than survival. In the
opened method-v2 confirmatory games, 180 of 256 champion games reached the
18,000-tick cap. Of those draws, 132 ended with more candidate combatants, 109
with a lead of at least ten combatants, and 86 with both a lead of at least ten
and at most twelve enemy buildings remaining. These are post-outcome pilot
diagnostics only. They motivate method v3 but are not method-v3 evidence.

Two code-level facts are also fixed pilot motivation:

- the selected method-v2 policy enabled the all-in mission while retaining
  `disbandExistingAttacks=false`, even though attacking missions lock their
  units; and
- the generic closeout controller did not activate before tick 18,000, the
  evaluation cap.

Method v3 will test whether explicit attack preemption, earlier building
elimination, anti-structure production, and systematic search convert these
states into actual wins. This is a prospective hypothesis, not a conclusion.

## Opponent, countries, and observation interface

- Opponent: the same committed independent Supalosa revision and runtime used
  by method v2 unless a prospective amendment is committed before any v3 game.
- Countries: all nine values exposed by `Countries`. The primary matchup is a
  country mirror: candidate and Supalosa receive the same country. This yields
  five Allied and four Soviet strata without faction asymmetry.
- Policy sharing: one policy is frozen for every country. Side-specific unit
  names may be resolved from rules and country side, but country identity may
  not select a map, coordinate route, or hand-authored map profile.
- Map profiles: `defaultMapProfiles=false` and `exactMapTactics=false` in every
  v3 arm.
- Observation: the primary environment is the public Chrono Divide bot API
  exposed to both agents. Full-state API calls already occur in the pinned
  Supalosa implementation and therefore are not silently represented as
  fog-of-war-only play. Method v3 must log the candidate's observation mode.
  A visible-enemy-only finisher ablation is required before paper claims about
  tactical search or partial observability.

## Allowed policy-development mechanisms

The search may change only coordinate-free mechanisms and scalar parameters:

1. preempting or disbanding locked attack missions when a closeout begins;
2. the minimum tick, army size, observed threat, reserve size, and hysteresis
   for entering or leaving closeout mode;
3. prioritizing construction, production, power, defensive, economic, and
   remaining buildings;
4. assigning attackers to one or more building targets by capability and
   distance;
5. remembering previously observed building locations and sweeping
   low-coverage map sectors when no target is available;
6. switching late production from rush mass toward tanks, artillery, or other
   units that can damage ground structures;
7. the construction-yard sell time or disabling the sale; and
8. country-agnostic scouting, defense reserve, and order-refresh parameters.

Exact map names, hashes, start coordinates, routes, placement anchors, or
test-family identities are forbidden policy inputs. New interfaces must have
deterministic parsing, canonical serialization, tests, and structured event
logging before cluster scaling.

## Map population and role construction

The method-v3 population is built from technically compatible RA2/Chrono
Divide map families that were not assigned to a method-v2 train, development,
or test role. Compatibility may inspect loading, starts, warnings, progress to
a fixed early tick, terrain, and object metadata. It may not run either policy
to an outcome.

Families are deduplicated before roles are assigned. Eligible families are
ranked by

`SHA-256("chrono-divide-method-v3-role-v1\0" + family_id)`.

The first 16 are open training families, the next four are development wave A,
the next four are development wave B, and the next 16 are sealed confirmatory
families. Later eligible families are ordered substitutes. Fewer than 40 clean,
distinct eligible families blocks this design and requires a prospective
amendment before gameplay.

All method-v2 families are open pilot/development material, but none can enter
the new development waves or sealed confirmatory set. Family identity and
content commitments are frozen before v3 training outcomes are inspected.

## Development stages

### Stage 0: deterministic technical tests

Unit tests and small no-outcome simulations must establish policy
serialization, country compatibility, start reciprocity, target selection,
mission preemption, building-memory invalidation, sweep coverage, trace
logging, and zero coordinate-bearing configuration. Failure blocks gameplay.

### Stage 1: mechanism screen on opened evidence populations

Use the opened method-v2 families and the 16 v3 training families. Compare at
least the method-v2 champion configuration, preemption alone, early closeout
alone, their combination, target-priority variants, sweep variants, production
variants, and sell-yard variants. Every scheduled reciprocal block is
indivisible. No outcome-bearing game is selectively rerun.

Rank mechanisms first by equal-family-and-country win probability, then by
win-minus-loss margin, lower-tail family-country win probability, draw rate,
and time to win. Terminal building counts are training diagnostics and never
outcomes.

### Stage 2: bounded parameter optimization

Run at least five deterministic search seeds from the best Stage-1 mechanism.
Use successive halving and common reciprocal seed blocks. A draw receives a
negative conversion penalty in the training-only utility; a true win always
outranks every draw, and every draw outranks every loss. The exact bounded
utility, search space, launch budget, and tie rules must be committed before
the first optimizer launch.

### Stage 3: two fresh development waves

Freeze a small finalist set before wave A. Wave A may select one candidate by
the prespecified rule. Wave B evaluates only that candidate and the frozen
method-v2 starting policy. Wave-B outcomes are opened once. Failure permits
more work only on training families; wave B cannot be reused as fresh evidence.
A new wave requires new prospectively assigned families.

The sealed confirmatory plan may be generated only if the selected v3 policy
passes all of the following on wave B:

- one-sided 80% family-clustered lower bound for win probability above 0.50;
- Allied and Soviet pooled point win probabilities both above 0.50;
- wins exceed losses in every country stratum; and
- one-sided 80% upper bound for draw probability below 0.40.

## Confirmatory design and success gates

The frozen champion is evaluated once on 16 sealed map families, all nine
country mirrors, four engine-seed blocks, and both reciprocal candidate slots:
1,152 games. Every map-country-seed block is indivisible and both slots share
the engine seed. Any technical failure blocks outcome access until the entire
campaign is reconciled; outcome-bearing games are not selectively rerun.

The primary estimand gives equal weight to every family-country cell. Method v3
supports the claim "reliably beats Supalosa" only if all gates pass:

1. the one-sided 95% family-clustered lower confidence bound for actual win
   probability is greater than 0.50;
2. Allied and Soviet pooled win probabilities are each greater than 0.50 and
   wins exceed losses in every individual country;
3. the one-sided 95% upper confidence bound for draw probability is below
   0.35; and
4. all technical, accounting, seed, slot, policy, map, and opponent-runtime
   commitments reconcile with zero unexplained launch or failure.

Score (win 1, draw 0.5, loss 0), decisive-game win rate, win time, surviving
buildings, terminal army, country effects, and family effects are secondary.
They cannot rescue a failed primary gate. Confidence intervals use family
clusters with a small-sample correction; country- and slot-stratified
nonparametric bootstrap and seed sensitivity are required robustness checks.

## Required ablations after a positive gate

If and only if the champion passes confirmation, run common-seed ablations on
opened training/development families for:

- attack preemption;
- early closeout timing;
- building target priority;
- map sweep and remembered targets;
- finisher production;
- construction-yard sale; and
- public-API versus visible-enemy-only finisher observation.

These are mechanism diagnostics, not additional confirmatory tests. Annotated
screenshots may illustrate only behaviors supported by logged decisions and
must be labeled illustrative rather than quantitative evidence.

## Stop rules and claim boundary

- Do not open confirmatory outcomes before every shard is technically clean.
- Do not add test-map profiles, country-specific test fixes, exact routes, or
  post-hoc games after outcome access.
- Do not write a positive paper conclusion before uncertainty analysis passes.
- If the absolute win, breadth, or draw gate fails, report failure internally
  and return to a newly prospectively defined development population. The
  failed confirmatory population is permanently open and ineligible for a
  future confirmatory claim.

Until these gates pass, there is no v3 paper result and no defensible claim that
StrongBot reliably beats Supalosa.
