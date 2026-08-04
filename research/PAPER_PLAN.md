# Paper formulations and study design

## Direction selected on 2026-08-04

The selected implementation direction is a positive, falsifiable variant of
candidate direction 1: under equal launched-simulation budgets, test whether a
coordinate-free, map-structure-conditioned StrongBot configuration improves
held-out-family macro score over one global StrongBot configuration against the
pinned Supalosa bot. Existing map-ID profiles and exact-coordinate tactics are
development-only upper bounds and are disabled in the confirmatory contrast.

The study is intentionally conditional on one opponent. It will not claim broad
game-AI superiority. The complete draft endpoint, minimum effect, validation
qualification gate, venue choice, release decision, and compute constraint are
recorded in `DECISIONS_2026-08-04.md`; that document is not frozen until the
seed, fidelity, map-family, power, and allocation gates pass.

## Candidate direction 1 — configuration-induced specialization

**Working title:** *From Map-Specific Tuning to Robust Scripted Agents:
Cross-Context Evaluation in a Real-Time Strategy Game*

**Principal claim to test.** Under a fixed launched-simulation budget, map/start-specific
configuration improves in-context performance but degrades held-out-map or
worst-group performance relative to pooled or robustness-aware configuration.

**Evidence already available.** The code contains explicit profiles,
coordinate-specific tactics, and roughly 1,100 training directories concentrated
on HFO and a few repeatedly inspected hard maps. Performance varies strongly by
map/start in preserved artifacts. This establishes motivation and feasibility,
not the claim.

**Missing evidence.** A clean baseline; family-disjoint train/validation/test
maps; multiple opponent contexts; equal-launched-budget configurators; independent
optimizer repetitions; explicit logged engine seeds and trace validation; sealed tests;
and clustered uncertainty.

**Essential baselines.**

1. Clean pinned upstream Supalosa.
2. Untuned generic StrongBot with automatic profiles and exact-map tactics off.
3. Development-only per-map profiled upper bound; never tune it on a sealed map.
4. Random search under the same launched-attempt budget.
5. The current seeded evolutionary search under the same budget.
6. A standard configurator such as SMAC, irace, or NTBEA.
7. Pooled mean-score tuning; add worst-group/CVaR tuning only if implemented
   before the test set is opened.

**Required ablations.** Automatic profiles on/off; exact-coordinate tactics
on/off; map identity versus map features; per-map versus pooled objective;
training-set diversity at fixed launched-attempt count; candidate and opponent physical
start; country matchup; draw/tick cap; and clean versus shared-package baseline.

**Likely reviewer objection.** “This is ordinary overfitting by a hand-coded bot
in one proprietary game.” The answer must be a preregistered, equal-launched-budget
study showing a mechanism across disjoint map families and opponent contexts,
not a leaderboard result.

**Contribution type.** Empirical and analytical. This is the recommended
primary direction.

## Candidate direction 2 — a reproducible scripted-agent evaluation testbed

**Principal claim to test.** A version-pinned Chrono Divide protocol exposes
material ranking reversals that single-map or unpaired evaluation misses, and
provides a useful low-cost testbed for configuration robustness.

**Evidence already available.** Headless games are inexpensive (about 20
CPU-seconds in the broad campaign); 196 map paths and a programmable bot API
exist; the audit found concrete provenance, duplicate-map, baseline, and
start-pairing failures that a benchmark can repair.

**Missing evidence.** Verified map-family metadata, simulator fidelity tests,
explicit seed control, multiple agents, a stable task schema, a maintenance
plan, and legal permission to redistribute maps and game assets.

**Essential baselines.** Clean upstream, generic candidate, current profiled
candidate, at least one additional independently authored agent if compatible,
and simple fixed/random policies where meaningful.

**Required ablations.** Number of map families, start orientations, opponent
families, repeat counts, seed availability, map warnings, ranking stability,
and macro versus micro aggregation.

**Likely reviewer objection.** “The benchmark cannot be reproduced or
redistributed because it depends on proprietary Red Alert 2 content and
unlicensed packages.” Release original orchestration, patches, hashes,
metadata, and aggregates only unless rights holders grant permission.

**Contribution type.** Benchmark/resource and evaluation methodology. Viable
only after the licensing and fidelity gates.

## Candidate direction 3 — diversity-aware robust policy configuration

**Principal claim to test.** An optimizer that allocates launched-simulation budget
toward underperforming context groups yields better held-out worst-group
performance than mean-fitness GA, random search, SMAC, irace, and NTBEA.

**Evidence already available.** The trainer, simulator, map-dependent failure
modes, and adaptive human campaign provide implementation ingredients.

**Missing evidence.** There is no new algorithm yet, no formal objective, no
equal-launched-budget implementation, and no comparison to standard configurators.

**Essential baselines.** Random search, current GA, SMAC, irace, NTBEA, pooled
mean tuning, group-DRO/CVaR-style objectives, and development-only per-map policies.

**Required ablations.** Acquisition/allocation rule; context sampling; risk
level; diversity regularizer; warm starts; mutation priors; training budget;
and optimizer seed.

**Likely reviewer objection.** “The proposed optimizer is ad hoc and gains come
from extra games or privileged map knowledge.” Budget accounting and a
predeclared objective are mandatory.

**Contribution type.** Methodological. No-go until an actual algorithm and
multi-domain or very broad game evidence exist.

## Related-work and novelty map

Evolutionary tuning of scripted RTS behavior is established. Young and Hawes
(2012) used a case-injected genetic algorithm to learn StarCraft goal-priority
profiles. Earlier and later game-AI work evolved controllers, strategy
parameters, build orders, and action abstractions. Standard algorithm
configuration methods such as SMAC and irace, and game-oriented NTBEA, are
therefore required comparisons rather than optional extras.

The closest collision is Fernández-Ares et al. (2012), which evolved bots for
map types and selected among them with online map characterization, outperforming
a general offline-trained bot. Map-conditioned portfolios versus a generalist
are therefore prior art; the opening is leakage-controlled held-out/worst-family
evaluation and mechanism decomposition.

The defensible novelty is not “using a genetic algorithm to tune an RTS bot.”
It is the following claim, if the new study supports it:

> An exact-provenance, family-disjoint evaluation shows and decomposes how
> context-specific configuration of a scripted RTS agent changes in-context,
> held-out, and worst-group performance under equal launched-simulation budgets.

Closest literature should be organized into four groups in the paper:

1. Search, planning, and scripted agents for RTS games.
2. Evolutionary and automated configuration of game-playing agents.
3. Generalization, overfitting, and evaluation across levels/maps/opponents.
4. Benchmark reproducibility, paired evaluation, and uncertainty under
   deterministic or dependent game simulation.

A verified bibliography with primary-source links is maintained separately
before manuscript submission. The current repository has no `.bib` file; one
should be generated only after every citation is checked.

## Confirmatory protocol

### Unit of context and split

Define a context as
`(map family, physical start orientation, country matchup, opponent policy)`.
The map family—not the filename—is the split unit. Build families by exact hash,
source metadata, normalized map name, revision lineage, and manual layout
inspection. Exact copies and revised HFO/OTMQ/other variants stay in the same
family.

Freeze a machine-readable split before tuning:

- training families: optimizer access;
- validation families: method/hyperparameter selection;
- test families: sealed until all policies and analysis code are frozen.

No existing HFO, Malibu, Pinch, Peak, Watering Hole, OTMQ, Tikal, or other map
that drove a code patch may be called untouched test data. They are development
families. A genuinely held-out test requires map families not used in any
adaptive campaign.

A per-map tuned policy is not a zero-shot baseline on a sealed family. Keep
such upper bounds on training/validation maps, or run a separately labeled
transductive protocol with preregistered within-map tuning and evaluation
blocks; exclude that result from held-out-generalization claims.

### Randomness and pairing

The pinned game API 0.75.0 exposes no public game seed. The old harness therefore
derived an internal Mersenne Twister seed from game ID `"0"` and wall-clock
epoch seconds; four fresh unseeded processes produced four terminal signatures.
Those calls establish uncontrolled variability, not independent replicates.

The audit branch now validates the exact 0.75.0 runtime markers and supplies an
explicit uint32 engine seed through a scoped seed-to-epoch compatibility wrapper.
It also gives candidate and baseline separate identity-keyed Mulberry32 streams
during every synchronous bot callback, because the public external-bot
`GameApi.generateRandom*()` path delegates to process-global `Math.random`.
Candidate draw counts therefore cannot perturb Supalosa's stream, and swapping
agent-array slots does not swap participant streams. All global and callback
state is restored in `finally`, and concurrent seeded games fail closed.

One `seedBlockIndex` is reused for both reciprocal candidate slots. Paired mode
forbids rejection-based start filters; valid seed-to-start assignments must be
enumerated before outcome generation. The packaged `seed_replay_gate_v1`
passed in Slurm job 21291720 under authoritative account `pi_jss233`: all ten
fresh processes had identical normalized traces for seed 424242, and the
seed-424243 trace differed. This closes the deterministic fresh-process
randomness gate for evaluated source revision
`57b81f9ea4345edd2e955d1e1c6d343abba6c85b`. It does not close the remaining
map-fidelity, family-adjudication, split, or policy-interface gates, and the
eleven tick-cap draws from this test are not gameplay evidence.

### Outcomes and inference

Primary game score:
$$
S = \frac{\mathrm{wins} + 0.5\,\mathrm{draws}}{N}.
$$

The primary policy contrast is the family-macro conditioned-minus-global
difference against the same pinned Supalosa bot. Within each optimizer run and
map family, first average the paired score difference over the eight frozen
engine-seed/reciprocal-start blocks, then weight the 26 test families and 10
primary optimizer runs equally:
$$
\Delta = \frac{1}{FR}\sum_{f=1}^{F}\sum_{r=1}^{R}
\left(S_{\mathrm{conditioned},fr}-S_{\mathrm{global},fr}\right).
$$

The confirmatory criterion is a two-sided 95% interval entirely above zero.
The draft design is prospectively powered at a true \(\Delta=0.05\); five
points is the power alternative, not an additional observed-estimate threshold.
The analysis method and critical-value rule will be frozen after
development-only variance calibration and before any sealed-test outcome is
opened. The current design calculation uses a finite-cluster two-way CGM
statistic over map family and optimizer run; a family/run cluster bootstrap and
a mixed-effects model are prespecified sensitivities, not replacements selected
after seeing the result.

A supporting endpoint asks whether conditioned StrongBot itself scores above
0.50 against Supalosa with its family-and-run clustered lower 95% bound above
0.50. Only then may the paper say it "beats Supalosa." Report W/D/L counts,
micro score, every family estimate, worst-family score, and a predeclared
discrete 20% family-level CVaR. Duration, material, error categories, faction
sensitivity, and tick-cap survival are secondary. No game-level binomial
interval is the primary uncertainty estimate, and the single opponent is a
fixed evaluation target rather than a sampled opponent population.

### Error decomposition

Predeclare failure categories using logged state rather than post-hoc anecdotes:

- MCV deployment or early build failure;
- economy/harvester collapse;
- production bottleneck;
- early defensive collapse;
- attack launch failure;
- pathing or unreachable target;
- closeout failure with military advantage;
- tick-cap stalemate;
- map parsing/rules warning or execution failure.

Add trace-derived timing for first refinery/factory/attack, economy curves,
army composition, known enemy state, and terminal material. Validate automatic
labels on a stratified manual sample.

### Contamination and fidelity checks

- SHA-256 every map and package; publish hashes.
- Group exact duplicates and revision families before splitting.
- Search source for coordinates and start signatures matching test families.
- Fail a run when required map sections/events are invalid; do not silently
  accept tick-1 construction.
- Run candidate/baseline identity and package-isolation tests.
- Freeze source commit, lockfile, game API, map manifest, split, and analysis
  plan before test execution.
- Keep test summaries append-only and deny optimizer access to their directory.

## Minimum viable workshop study

Target a scoped map-generalization claim, not a universal game-AI claim.

- Provisional 50-family split: 16 training, 8 validation, and 26 sealed
  test families. The unusually broad test panel is required by the current
  conservative power model; development-only variance may change the counts
  before protocol freeze.
- One pinned Supalosa opponent, with every claim explicitly restricted to this
  opponent version.
- Reciprocal physical starts and eight explicit engine-seed blocks per final
  family/run. Use one primary mirror-country matchup; add country sensitivity
  only if compatibility and budget gates pass.
- Global pooled, coordinate-free descriptor-conditioned, shuffled-descriptor,
  and equal-launched-budget random/evolutionary search conditions. Report
  existing map-ID profiles and exact tactics only as development-map upper
  bounds; add a standard configurator if integration is reliable.
- Ten independent optimizer runs for the primary global-versus-conditioned
  contrast; five-run screens are development-only.
- Approximately 1,000 launched simulation attempts per primary optimizer run,
  with every rejected creation, timeout, and failure charged to the budget.
  The draft 26-family by 10-run by 8-block final comparison contains 2,080
  reciprocal-start-averaged statistical block contrasts and 8,320 component
  games: two methods at each of two reciprocal starts. It has assumption-only
  simulated power 0.80885 for a five-point effect. The component-game accounting
  correction does not change power because the analysis unit remains the block
  contrast.
- Expected search plus diagnostic total: about 30,000–45,000 launched attempts,
  subject to recalibration before the protocol is frozen.

This supports a workshop paper only if the held-out effect is directionally
consistent across optimizer runs and map families, not merely significant
after pooling games.

## Strong archival study

- Sixteen or more map families: 8 train, 3 validation, 5 sealed test.
- Four to eight meaningfully different opponent policies or agent versions.
- Four physical start/order blocks where maps support them.
- At least four country matchup strata.
- Five optimizer seeds for MVP methods; ten for the primary comparison.
- Equal training budgets around 5,000 launched attempts/run.
- Generic, random search, GA, pooled, robust objective, and a development-only
  per-map upper bound that is excluded from zero-shot test claims; add at
  least two standard configurators.
- Sensitivity to split assignment, family construction, tick cap, map warning
  policy, and training-set diversity.
- Expected total: roughly 0.5–0.6 million launched attempts.

A general-ML claim would additionally need a second environment or a formal
result showing why the mechanism transfers beyond this bot/game.

## Paper outline

1. Introduction: context-specific tuning and the evaluation failure.
2. Chrono Divide task and scripted-agent configuration space.
3. Forensic motivation and threats found in prior practice.
4. Family-disjoint evaluation and exact provenance protocol.
5. Configuration methods and equal-launched-budget baselines.
6. Main in-context/held-out/worst-group results.
7. Mechanism ablations and error decomposition.
8. Reproducibility, licensing, limitations, and broader impact.
9. Related work and conclusion.

## Draft abstract (pre-results)

Scripted game-playing agents are commonly improved by tuning rules and
parameters on a small set of maps, yet reported performance may conflate agent
quality with map memorization, start position, opponent choice, and experiment
provenance. We propose to study this problem in Chrono Divide, a browser
reconstruction of Red Alert 2 with a headless bot API. A forensic reconstruction
of an existing stronger-bot project found extensive map-specific configuration
and 517 top-level HFO training runs. It also recovered a 192-game cross-map
campaign whose summaries contain 182 wins, 7 losses, and 3 draws, but whose
candidate revision is unrecoverable and whose nominal stock baseline shares
modified source; we therefore treat it as exploratory rather than evidence.
A 32-game, one-map infrastructure pilot subsequently validated clean-baseline
loading, exact runtime snapshots, physical-start swaps, structured manifests,
and profile/tactic ablation plumbing. Its large start interaction, uncontrolled
simulator seeding, and 12 tick-cap draws preclude a scientific effect claim.
Before confirmatory evaluation, we will expose and validate explicit engine
seeds, group duplicate and revised maps into disjoint families, seal held-out
contexts, and freeze analysis code. Under equal launched-simulation budgets,
the planned study will compare untuned, pooled, random-search, evolutionary,
and standard configuration
baselines, while restricting map-specific upper bounds to development data or a
separate transductive protocol. The final abstract will report preregistered
held-out and worst-family effects with family/optimizer-level uncertainty rather
than reuse historical win rates. Subject to asset permissions, we will release
original orchestration code, configuration manifests, hashes, runtime snapshots,
and aggregate results without redistributing proprietary game content.
