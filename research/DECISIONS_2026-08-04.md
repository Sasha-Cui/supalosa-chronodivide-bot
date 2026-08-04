# Research decisions and confirmatory protocol draft

Status: **draft, not yet frozen**. This document records owner decisions made
on 2026-08-04 and the protocol consequences. It becomes the confirmatory
protocol only after the seed, simulator-fidelity, map-family, power, and
allocation gates pass and the analysis implementation is hashed.

## Owner decisions

- The project owner wrote StrongBot and is the sole currently identified author.
  The author's publication name and any additional contributors remain to be
  recorded before manuscript submission.
- Supalosa is the only independent opponent currently available. All claims
  must therefore be explicitly conditional on this pinned opponent version.
- The owner has not manually inspected the candidate map pool. Map eligibility
  and splitting will be determined by hashes, provenance, source references,
  historical-run references, and automatically computed structure descriptors,
  without opening test outcomes.
- The owner authorizes release of StrongBot and the original research code,
  manifests, metadata, analysis, and results. Third-party Chrono Divide code,
  Supalosa code, Red Alert 2 assets, and maps remain subject to their own rights;
  the release must link to or hash them unless their licenses or authors permit
  redistribution.
- The owner plans to contact Supalosa's author and the Chrono Divide author when
  a paper-ready draft exists.
- All experiment compute must be submitted through Slurm under `pi_jss233`.
  The active `prio_btk22` persistent job is unrelated and must not be used or
  cancelled. This study requires CPU, not GPU, unless its methodology changes.
- The study should be engineered for a credible positive result. Development
  and validation may be used to improve the method, but sealed test outcomes
  may not be used to select the claim, method, split, hyperparameters, or stopping
  point. A failed confirmatory result will be reported as such.

## Venue decision

The provisional primary target is the Soft Computing Applied to Games special
session at EvoApplications 2027. The official deadline is 2026-11-01, papers
are limited to 14 LNCS pages plus references, and EvoStar 2027 is hybrid. The
2027 online-presenter instructions are not yet posted, so submission is
conditional on written confirmation that presentation may be remote. The
internal paper-ready deadline is 2026-10-20.

EXAG 2026 is excluded because accepted work is presented in person. ICAART 2027
is only a fallback if its organizers give written permission for remote
presentation. FDG 2027 remains a watch-list fallback if its eventual call
confirms hybrid participation.

## Positive claim to test

Primary hypothesis:

> Under equal launched-simulation tuning budgets, a coordinate-free,
> map-structure-conditioned StrongBot configuration has higher macro-average
> match score than a single global StrongBot configuration on unseen map
> families against a pinned Supalosa reference bot.

For held-out map families \(f=1,\ldots,F\), the primary contrast is

$$
\Delta = \frac{1}{F}\sum_{f=1}^{F}
\left(S_{\mathrm{conditioned},f}-S_{\mathrm{global},f}\right),
\qquad
S = \frac{W+0.5D}{N}.
$$

The confirmatory success criterion is a two-sided 95% interval, clustered over
map family and optimizer run, that excludes zero in the positive direction. The
design is powered at a true \(\Delta=0.05\); 0.05 is the smallest effect used for
prospective power planning, not an additional point-estimate threshold. Requiring
both \(\widehat{\Delta}\geq0.05\) and rejection at a true effect of 0.05 would
cap joint success near one half under a symmetric unbiased estimator, so those
criteria must not be conflated. The achieved estimate and its practical
magnitude will always be reported.

A prespecified supporting endpoint asks whether the conditioned policy beats
Supalosa: its macro score must have a lower 95% family-and-optimizer-clustered
bound above 0.50. The paper will not use the word "beats" unless that endpoint
passes.

## Method constraints

- The confirmatory conditioned policy may use only automatically computed,
  coordinate-free structure descriptors such as dimensions, resource topology,
  connectivity or choke summaries, and spawn symmetry.
- It may not consume filenames, hashes, map IDs, absolute coordinates, or
  hand-authored test-map profiles.
- Existing automatic map-ID profiles and exact-coordinate tactics are disabled
  for every confirmatory global and conditioned policy evaluation.
- The global and conditioned policies receive the same launched-attempt budget.
- Ten independent optimizer runs are evaluated for the primary methods; no
  best-run selection is allowed after testing. Five-run development screens may
  be used only before the protocol and policies are frozen.
- Matches are blocked on engine seed, map family, reciprocal physical start,
  and faction assignment. Map families and optimizer runs, not raw games, are
  the replication units for the primary interval.
- Existing profiles and exact tactics are evaluated only as development-map
  upper bounds and mechanism evidence.

## Prespecified comparisons

1. Global pooled StrongBot configuration.
2. Descriptor-conditioned StrongBot configuration (primary method).
3. Shuffled-descriptor capacity control.
4. Leave-one-feature-group-out ablations for geometry/connectivity,
   economy/resources, and spawn/symmetry.
5. Equal-launched-budget random search versus the current evolutionary search.
6. Clean pinned Supalosa reference and Supalosa self-play bias checks.

Secondary comparisons and error decompositions will be labeled exploratory
unless explicitly added before the protocol is frozen. Multiple secondary
comparisons will use a prespecified correction or simultaneous interval method.

## Readiness implementation state on 2026-08-04

- Explicit uint32 engine control and identity-separated candidate/baseline bot
  RNG streams are implemented and unit-tested against the pinned API. Slurm job
  21291720 passed the fresh-process replay gate under authoritative account
  `pi_jss233`: all ten seed-424242 processes produced the same 73-record
  normalized trace (SHA-256
  `448b3ed3ef2e46b82848b90d9e8a820ce2864dea0e7aeaf1004cfa58c86da873`),
  while seed 424243 produced a different trace. All eleven matches were
  tick-cap draws, so this is reproducibility evidence rather than gameplay
  evidence.
- The outcome-blind map catalog groups 333 files and 313 hashes into 145
  conservative families. Tier A's maximally strict rule leaves 7 provisional
  families. Tier B, which distinguishes administrative inventories from
  adaptive exposure, excludes 18 adaptively evidenced families and leaves 127
  provisional families, 124 with load-pass metadata. No test family is selected.
- The assumption-only power tool uses no outcomes. Under its current conservative
  variance settings, 26 test families, 10 optimizer runs, and 8 paired blocks
  give simulated power 0.80885 for a true five-point effect and require 8,320
  component games for the final primary comparison. The 26 x 10 x 8 design has
  2,080 statistical block contrasts; each averages two reciprocal-start method
  contrasts, and each method contrast requires two component games. This
  accounting correction does not change simulated power because the analysis
  unit remains the reciprocal-start-averaged block contrast.
- The earlier user-level submission limit cleared without using or cancelling
  unrelated allocation work. Job 21291720 completed under `pi_jss233`,
  QOS `normal`, partition `devel`, in 12 minutes 8 seconds. Two preceding
  launcher-only attempts (21291567 and 21291713) failed at time zero before any
  game because the compute-node shell did not expose the module function; the
  final script pins its Node runtime dependency paths directly.

## Readiness gates before a sealed test exists

1. **Passed (job 21291720):** an explicit engine seed is recorded in every
   manifest, and 10/10 fresh same-seed processes produce identical normalized
   traces.
2. **Passed (job 21291720):** different requested seeds demonstrably change
   the normalized trace.
3. Valid reciprocal spawn pairs are enumerated before outcomes are generated;
   no outcome-dependent rejection sampling is allowed.
4. Required map sections load beyond tick 1, warning policy is frozen, and
   accepted-game technical failures remain below 1% in diagnostics.
5. Exact and near-duplicate map families are grouped before splitting. No map
   family referenced by StrongBot source or adaptive historical runs can enter
   the test split.
6. Under the current conservative assumption model, at least 26 independent
   eligible test families, 10 primary optimizer runs, and 8 paired blocks exist.
   The resulting 8,320 component-game draft design has 2,080
   reciprocal-start-averaged block contrasts and simulated power 0.80885 for a
   0.05 effect (20,000 prospective simulations; no outcomes used). These
   counts may be recalibrated from development-only variance before protocol
   freeze, but never from sealed-test outcomes. The test-family selection
   generator, eligible-pool hash, config, and a prospective seed commitment are
   committed before seed reveal. The exact split is generated only after the
   source, policies, and protocol are frozen.
7. The fixed 800-launch development signal phase passes every technical gate
   and its single prespecified family-macro contrast has a one-sided 80% lower
   clustered confidence bound above zero. This is a permissive futility screen,
   not confirmatory evidence or a paper claim.
8. A design-stage power simulation estimates at least 80% power for the 0.05
   primary effect under the authorized attempt budget.
9. Source, dependency, map, split, protocol, and analysis hashes are frozen.
10. `sbatch --test-only` and every scientific manifest identify `pi_jss233` as
    the authoritative Slurm account. No fallback account is allowed.

If a development or validation gate fails, the method may be revised without
opening test outcomes. Once any test outcome is opened, the fixed-count test is
completed and reported regardless of direction; it is never stopped early for
a favorable result.

## Immediate execution sequence

1. **Completed:** explicit engine-seed control and deterministic fresh-process
   replay gate.
2. **Completed:** machine-readable, outcome-blind map provenance/reference/
   structure inventory.
3. Adjudicate family grouping and define eligible development/validation/test
   pools without running StrongBot on candidate test maps.
4. Implement global and coordinate-free conditioned configuration interfaces.
5. Run at most 1,000 diagnostic attempts under `pi_jss233` and calibrate
   runtime, failure, start, warning, variance, and power assumptions.
6. Freeze the protocol and authorize a 10,000-attempt first stage.
7. Scale to 30,000--45,000 launched attempts only if the preregistered
   validation and infrastructure gates pass.
