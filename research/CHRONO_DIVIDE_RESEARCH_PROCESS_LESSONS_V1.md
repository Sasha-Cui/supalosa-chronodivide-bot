# Chrono Divide research-process lessons, version 1

Status: operational procedure recorded during Method-v5 execution
Recorded: 2026-08-13 (UTC)
Scope: empirical policy development, evaluation, evidence preservation, and paper preparation

## Purpose

The project objective is not to manufacture a positive claim. It is to develop a
policy that reliably defeats the pinned external Supalosa bot under the actual
game rule, and then establish that result on fresh, sealed evidence. A literal
win occurs only when physical destruction leaves the opponent with zero owned
buildings. Advantage, score, surrender, sale, capture, engine finish flags, and
a favorable terminal state at the tick cap are not wins.

This document consolidates the procedures that make that objective both more
credible and more efficient.

## Practices that are working

1. **Define the endpoint before observing results.** Endpoint v4 resolves edge
   cases symmetrically, including simultaneous destruction and a win by surviving
   units after the winner's own base has been destroyed.
2. **Separate software gates, open development, and sealed evaluation.** Wrapper
   equivalence and all-country capability checks do not inspect outcomes. Open
   families support policy development but not paper claims. Fresh development
   and confirmation remain sealed until their gates authorize access.
3. **Fail closed.** A campaign is analyzed only after every planned shard
   completes cleanly. Missing games, duplicate launches, unauthorized accounts,
   endpoint violations, source changes, or partial completion block advancement.
4. **Bind results to exact provenance.** Every result must identify the source
   commit and runtime tree, external baseline commit and runtime tree, map and
   campaign hashes, policy hash, seed, country, physical slot, Slurm account,
   array task, and controller job.
5. **Use paired and broad evaluation.** Common seeds and reciprocal slots reduce
   nuisance variance. All nine countries prevent an Iraq-only result from being
   mistaken for a general policy improvement.
6. **Run cheap tests before expensive simulation.** Compilation, unit tests,
   script syntax, baseline identity, and outcome-blind country smoke tests should
   precede a large campaign.
7. **Keep the paper downstream of the evidence.** Claims, abstract wording,
   tactical screenshots, and mechanism narratives are written only after the
   relevant primary result and uncertainty analysis are complete.

## Process corrections

### Replace frequent manual polling with milestone monitoring

Repeated scheduler checks add noise without improving decisions. During a
healthy campaign, inspect only compact operational quantities:

- scheduler counts by state;
- expected versus materialized shard directories and final summaries;
- missing, duplicate, or failed task IDs;
- nonempty stderr count;
- exact account and dependency state; and
- controller completion and artifact hashes.

Estimate remaining duration after the first representative wave completes, then
poll at intervals appropriate to that estimate. Notify only on stage completion,
failure, anomalous throughput, or required user input.

### Never print large evidence artifacts directly

Large JSON files can contain deeply expanded engine state and overwhelm useful
output. Inspect them with schema-aware extractors that print keys, counts,
commitments, pass/fail fields, and selected aggregate rows. Raw artifacts remain
immutable on disk and are opened in full only by audited analysis code.

### Maintain a single experiment ledger

Create one append-only, machine-readable ledger with one row per campaign or
gate. Each row should contain:

- experiment and protocol version;
- scientific purpose and outcome-access class;
- source, baseline, campaign, policy, and input hashes;
- expected launches and resource request;
- array, controller, and dependent job IDs;
- scheduler account and terminal states;
- start/end timestamps and compute consumed;
- result, gate, and analysis artifact paths and hashes; and
- advancement decision with the rule that produced it.

This ledger should be generated from manifests and Slurm rather than manually
reconstructed.

### Do not mutate a checkout used by an active frozen array

Even documentation-only commits change the Git revision seen by later array
tasks. While a campaign is active, keep the tracked checkout exactly at the
campaign's source commit. Stage notes or proposed changes outside the checkout,
record their hashes, and apply them only after the array and dependent controller
have reached terminal states.

### Diagnose mechanisms, not individual games

Do not tweak a policy because of a memorable loss or draw. A new method version
must address a population-level failure class supported by open-training
telemetry. Prespecified classes are:

- closeout never activates;
- enemy buildings are not discovered or remembered;
- available attackers cannot damage the remaining target;
- targets are unreachable by the assigned units;
- required finishing units or prerequisites are produced too late;
- orders churn or remain stale;
- the home base collapses after overcommitting attackers; and
- progress occurs but the tick cap arrives before final destruction.

Terminal building counts, progress timing, reachability, capability requests,
production completion, search coverage, order refreshes, and home-defense state
should distinguish these mechanisms.

### Make aggression objective-directed rather than indiscriminate

The literal objective is the opponent's last building, not the destruction of
every opposing combat unit. A policy can therefore be highly active and still
make the wrong decision by fighting an irrelevant army, while a policy that
temporarily attacks a blocking force may be taking the shortest path to the
objective. The prospective closeout controller must implement the following
observable-information hierarchy:

1. If a remembered or visible enemy building has a compatible, reachable strike
   force, select one best finishing target and concentrate that force on it.
   Do not load-balance attackers across several buildings. Enemy army size alone
   must not veto a credible last-building strike; this includes the limiting
   case of one exposed building and an otherwise overwhelming enemy army.
2. Retain only a bounded defensive reserve. The presence of nearby enemies may
   change which units are reserved, but it must not pause the whole closeout
   layer when some units can still execute a feasible building strike.
   Once observable terminal evidence establishes one remaining enemy building,
   the survival of our own final building must not veto an otherwise feasible
   strike: the literal endpoint permits surviving mobile units to finish after
   their own base falls. Base survival and strike survival are different safety
   questions and must be represented by separate certificates.
3. If no building strike is currently feasible because the target is unknown,
   unreachable, or cannot be damaged by available units, do not issue futile
   building orders. Continue Supalosa's ordinary combat policy against forces
   that block access while the closeout layer searches, remembers targets, and
   requests the missing movement or damage capability.
4. Once opposing forces no longer obstruct access, collapse available force on
   the remaining buildings. Until a physical endpoint or tick cap, every
   closeout interval must be explainable as target attack, blocker-clearing by
   the base policy, active search, capability production, or bounded home
   defense. Passive waiting is a controller defect, not a tactic.

The force-versus-building choice should therefore be represented as a terminal
race rather than a fixed target-class preference. For every feasible building
strike, compare a conservative time-to-destruction certificate against a
conservative time-to-interception or force-collapse certificate. If the building
can be eliminated first, commit the compatible strike group to the building
even when a much larger enemy army survives elsewhere: destroying the final
building ends the game. If the strike would fail, clear only the minimum
route-blocking or damage-capable force needed to make it feasible and then
resume building focus immediately. When opposing armed forces are absent or
cannot affect the route, every reachable building is free terminal progress and
must be attacked without a regroup delay.

Continuous offense is an invariant, not an instruction to issue arbitrary
attack orders. At each closeout decision, every combat-capable unit must be in
one of a small number of observable roles: building strike, minimum blocker
clearance, bounded defense, active search, or movement toward a requested
capability. Repeated regroup or predecessor-fallback decisions without a change
in target feasibility, local threat, or capability state are order-liveness
failures. A prospective controller should measure and cap those transitions,
preempt stale fallback orders, and preserve a committed terminal target until
the target disappears, becomes unreachable, or the race certificate reverses.

This rule is prospective and was supplied from the game's stated win condition,
not selected by comparing policy outcomes from the invalid Method-v5 campaign.
It must be tested causally with at least a distributed-target versus focused-
target ablation and a global-threat-pause versus bounded-reserve ablation.

The associated telemetry should report target identity, visible versus
remembered status, compatible and assigned attacker counts, target hit points,
focus concentration, reserved unit count, home-threat count, reason no strike
was feasible, time since opponent-building damage, search coverage, and engine
termination cause. Aggregate diagnostics should include physical win rate,
nonliteral engine-termination/stalemate rate, time to first and final building
destruction, time between building-damage events, and the fraction of active
combatants assigned to the selected building. These quantities distinguish
productive aggression from order churn.

### Treat engine stalemate as an observed failure mode, not a win

Source inspection after the invalid `mf_hills` shards established that Chrono
Divide has an internal stalemate detector with a ten-minute no-progress grace
period. When it fires, the engine can mark both combatants defeated, remove
ordinary assets, and finish while wall-class buildings remain owned. Endpoint
v4 correctly refused to call this a literal win, but classified the condition as
a technical failure because it had no explicit nonliteral-termination state.

The prospective endpoint repair must keep physical, opponent-attributed
destruction of the final enemy building as the only win. A clean engine finish
that has defeated at least one combatant but has not established that endpoint
is recorded separately as a nonliteral termination and scored as a draw under
the strict endpoint; an engine finish with no defeated combatant and no literal
endpoint remains a technical failure. This repair prevents routine engine
semantics from invalidating a whole campaign without laundering stalemate into
success. The policy goal remains to drive this draw class toward zero through
continuous, objective-directed progress.

### Preserve a clean selection boundary

Select and freeze one policy using complete open-training evidence before fresh
evaluation. Do not repeatedly tune against fresh Development A/B results until a
positive result appears. If a development gate fails, any further refinement
must return to permanently open families under a newly frozen protocol version.

### Require intervention exposure before another outcome screen

The complete terminal-race version-1 open-development campaign passed every
technical gate but did not improve on Supalosa. Its exact control produced 38
wins, 115 draws, and 27 losses in 180 games; the prespecified selected arm
produced 36 wins, 114 draws, and 30 losses. The mechanism telemetry explains why
another parameter-only screen would be wasteful. In the three public-state arms,
104,737 of 183,932 decisions were `predecessor_fallback` and another 39,684 were
`regroup`; only 37,821 were building or terminal strikes. The dominant fallback
reason was an uncalibrated relevant enemy mechanic, not the absence of an enemy
building or an inactive controller.

This creates a new pre-outcome requirement. A proposed controller must pass an
outcome-blind intervention-exposure gate on every country before it enters a
large screen. That gate must establish, from live orders and telemetry rather
than policy labels, that:

- a compatible reachable combatant can be assigned to each ordinary building
  target supported by its country;
- the candidate's issued unit orders measurably differ from the exact baseline
  in the intended tactical state;
- an exposed last building receives a direct attack even when an arbitrarily
  large enemy force exists away from the strike route;
- a force on the route is attacked only when removing it is necessary for the
  building mission to remain feasible;
- units excluded from the building detachment retain active Supalosa orders;
- the fractions of eligible and capable combatants commanded, delegated,
  idle, moving, and attacking are all reported; and
- persistent fallback, regroup, or no-order states fail the gate unless an
  explicit capability, reachability, or visibility defect explains them.

Passing an information-boundary smoke test is not enough. The previous smoke
proved that the bridge ran and emitted valid records, but did not prove that it
controlled enough units or changed the relevant actions. Future preflights must
test causal command exposure before spending on outcome estimation.

### Make the win condition the controller's lexicographic objective

The controller should minimize time to physical elimination of the opponent's
remaining buildings. Enemy-force removal is instrumental, never an independent
terminal objective. The prospective decision order is:

1. If an enemy building can be destroyed by a reachable compatible detachment
   before route interception destroys that detachment, attack the building.
2. If it is the last enemy building, ignore threats to our base and enemy forces
   outside the strike route. Even one building versus one hundred unrelated
   tanks is a building strike because physical destruction ends the game.
3. If a force makes the strike route infeasible, clear the minimum blocking
   force, then immediately resume the same committed building mission.
4. If no current unit can damage or reach any building, preserve Supalosa's
   force combat while actively searching or producing the missing capability.
5. Until a literal endpoint or tick cap, passive regrouping is forbidden when a
   compatible building strike, blocker-clear action, or active search exists.

This hierarchy must be exercised continuously, not activated only after an
arbitrary late tick. Activation time, target concentration, force-interruption,
and safety-certification are distinct causal components and should be ablated
separately. In particular, a global fail-closed safety certificate must not let
one difficult-to-model enemy unit veto an otherwise feasible attack. Uncertain
forces may veto only when their observable position and reach intersect the
strike route before predicted building destruction; otherwise they are
irrelevant to that decision.

### Develop the live bot and evaluation bridge together

An evaluation-only order overlay is useful for causal diagnosis, but it can
hide integration failures and is not by itself the final algorithmic artifact.
After a mechanism survives open development, the same force-versus-building
logic must live in the releasable bot's mission controller with deterministic
configuration and telemetry. The research bridge and the public bot should
share a pure decision core, while tests verify that both implementations produce
the same tactical action for the same state. This avoids writing a paper about
an evaluator-side intervention that users cannot run as the submitted agent.

## Standard operating procedure

### Phase 1: freeze and preflight

1. State the research question, endpoint, policy information boundary, baseline,
   population, ranking rule, advancement rule, and failure policy.
2. Freeze exact files and hashes before outcome-bearing execution.
3. Compile and run focused plus full tests.
4. Run exact-baseline-equivalence and outcome-blind cross-country capability
   gates.
5. Estimate launches, concurrency, CPU/GPU hours, memory, storage, and expected
   wall time.

### Phase 2: execute

1. Confirm no duplicate active job and use only `pi_jss233` for simulation.
2. Submit an immutable array with exclusive outputs.
3. Submit a dependent `afterok` controller that verifies the complete population
   before analysis.
4. Preserve the tracked source revision throughout the active array.
5. Monitor operational health without inspecting partial outcomes.

### Phase 3: reconcile

1. Reconcile every expected task ID against `sacct`, result directories,
   summaries, event ledgers, stderr, account, and source commitments.
2. Refuse selective reruns of outcome-bearing games. Repair prospectively under a
   new version if the campaign is technically invalid.
3. Run the frozen analyzer once on the complete population.
4. Record the advancement decision and exact artifact hashes in the ledger.

### Phase 4: refine or advance

- If no policy advances, use only open-training aggregate diagnostics to choose
  one causal intervention, freeze a new version, and run a complete all-country
  screen.
- If a policy advances, run the full outcome-blind fresh-map compatibility gate,
  freeze Development A, Development B, and confirmation roles, then proceed
  through their prespecified positive gates without role changes.

### Phase 5: confirm and explain

1. Run one sealed confirmatory population with reciprocal slots, multiple seeds,
   all nine countries, and family-cluster uncertainty.
2. Require the frozen overall and country-level positive criteria and zero
   endpoint violations.
3. Run prespecified component ablations only after the primary result is fixed.
4. Select screenshot episodes deterministically from the completed result set.
   Annotate only tactics corroborated by policy telemetry and event logs.
5. Write the paper from the completed evidence, including negative results and
   limitations that materially constrain the claim.

## Immediate application to the current program

- A later pre-execution review of the terminal-objective controller found that
  its final-building branch still conditioned a feasible strike on the survival
  of the candidate's own last base. Array `22125520` and controller `22125521`
  were cancelled after 39 seconds. Forty shards emitted `run_start` and one
  `launch_counted` event each, but zero episodes completed, zero summaries or
  completion markers were written, and no outcome was inspected. Their
  artifacts are preserved but inadmissible. The prospective repair separates
  strike-route safety from home-base safety and tests the explicit one-
  building-versus-100-tanks case.

- Method-v4 completed 4,752 technically clean open-training games but no arm met
  its advancement rule. Attack-order reparameterization alone was insufficient.
- Method-v5 preserves the exact Supalosa strategy and adds a generic,
  visibility-limited closeout controller for memory, search, reachability,
  production, stale-order preemption, and home defense.
- Outcome-blind jobs `22088754` and `22088755` passed exact wrapper equivalence
  and all-nine-country capability smoke checks on source commit `c50b256`.
- Open-training array `22088782` and fail-closed controller `22088783` are the
  authoritative first Method-v5 execution attempt. No partial policy ranking was
  authorized or performed.
- During this process review, compact scheduler reconciliation detected that
  tasks 19, 22, and 25 had completed their 16 launches but deliberately exited
  with code 2. All failures occurred on open family `mf_hills` and had the same
  technical reason: the engine declared the game finished while both players
  still owned buildings, so endpoint v4 could not assign a literal winner.
- While classifying those failed shards, their compact summary records exposed
  shard-level aggregate win, draw, and loss counts. No policy-level ranking or
  advancement analysis was performed and the values were not used for policy
  development. Nevertheless, this was partial outcome access contrary to the
  frozen complete-population rule and independently disqualifies the attempt.
- Because the full campaign could no longer pass its frozen technical gate, the
  remaining array tasks and blocked controller were cancelled. Existing outputs
  were preserved, no selective outcome-bearing reruns were made, and the failed
  campaign cannot support policy selection or a paper claim.
- The appropriate next action is a prospective protocol repair based on the
  engine-finish mechanism, followed by new outcome-blind probes and a completely
  new campaign. The old partial population must not be combined with that run.
- This note was initially stored outside the tracked checkout to avoid changing
  the revision seen by later array tasks. It became eligible for a `main` commit
  only after the array and dependent controller were cancelled and reconciled.

- The amended terminal-objective open-development campaign on source commit
  `46309e66fdd086f75da3f85f829ca4f526a270f5` completed all 1,800 launches in
  Slurm array `22129384`; controller `22129385` passed the literal-endpoint
  technical gate with zero technical, endpoint, or information-boundary
  violations. Its immutable analysis artifact has SHA-256
  `4ed4f15802893bf465bfe6dd93178b7ad9948426b03b3e1141c79ce5b6512129`.
- The complete open aggregate did not advance. The full sufficient-strike arm
  produced 69 wins, 223 draws, and 68 losses (score 0.5014), versus 69 wins,
  225 draws, and 66 losses for the selected prior (score 0.5042). Its paired
  family-macro effect was -0.0028; the one-sided family-clustered 80% lower
  score-margin bound was -0.0078. These are development diagnostics, not paper
  claims.
- The complete mechanism ledger shows 172,391 regroup and 109,449 predecessor-
  fallback decisions, compared with 9,398 building strikes, 2,079 blocker
  clears, and only 222 terminal-candidate strikes. Event counts alone do not
  establish causality. In particular, a `regroup` or predecessor-fallback label
  means that the overlay delegated to Supalosa; it does not prove that the
  underlying units were idle. The labels reject the assumption that adding a
  terminal branch guarantees continuous terminal pressure, while also showing
  that future telemetry must measure the actual delegated unit state (idle,
  moving, or attacking) before diagnosing passivity.
- A complete-population diagnostic over all 1,800 episodes found that the full
  arm issued any certified building strike in only 69 of 360 games. Its
  friendly bridge rejected ordinary combat units whenever their rules also
  advertised role-irrelevant mechanics such as vehicle crushing or an infantry
  deploy option. The next open-development screen therefore isolates friendly
  role-specific calibration from observation and activation changes. This is a
  causal adapter repair supported by population telemetry, not a response to a
  hand-picked replay.
- The next protocol also distinguishes a visibility-and-memory interface from
  the public complete-state `GameApi` interface already available in the pinned
  bot environment. Public enumeration is described honestly as a matched-
  interface environment condition, never as fog-of-war play. It may identify
  current units and buildings but remains reference-separated from endpoint
  adjudication and destruction attribution.
- A state-based endgame trigger requires a transition guard. A map that starts
  with three buildings is not already in closeout merely because its exact
  count is at the threshold. Early activation is allowed only after a minimum
  tick and after the controller has observed the count fall from above the
  threshold. This avoids confounding endgame recognition with opening strategy.
- The prospective protocol is frozen in
  `research/TERMINAL_RACE_OPEN_DEVELOPMENT_PROTOCOL_V1.md`. It compares six
  prespecified arms on wholly new open seeds and requires a literal-win
  probability above 0.50 with positive Allied, Soviet, country, and paired
  evidence before advancement. This strict target reflects the practical
  objective rather than lowering the criterion after a null result.

## Core lesson

Rigor and speed are aligned. Fewer ad hoc runs, compact monitoring, explicit
causal diagnoses, immutable source boundaries, and decisive advancement gates
reduce wasted simulation and make a genuinely positive result more likely to
survive review.
