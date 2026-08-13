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

### Preserve a clean selection boundary

Select and freeze one policy using complete open-training evidence before fresh
evaluation. Do not repeatedly tune against fresh Development A/B results until a
positive result appears. If a development gate fails, any further refinement
must return to permanently open families under a newly frozen protocol version.

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

## Core lesson

Rigor and speed are aligned. Fewer ad hoc runs, compact monitoring, explicit
causal diagnoses, immutable source boundaries, and decisive advancement gates
reduce wasted simulation and make a genuinely positive result more likely to
survive review.
