# Fresh dual complete-population action-resource audit V1

Frozen: 2026-09-05, after technical completion of execution V2 and before any
V2 scientific outcome, transition, endpoint-effect, or gate field was read

## Purpose

This protocol fixes the descriptive action-resource analysis for the complete
2,700-game fresh dual-endpoint population. It asks how much of the public
action interface each policy consumed, whether that use differed across
methods and experimental strata, and whether zero-health building targets were
requested. It does not test policy strength, attribute causal efficacy to an
action pattern, or alter any frozen competitive gate.

The existing audit records whole-game totals. It does not retain per-call
timestamps or ordered call records. Consequently this analysis cannot estimate
rolling action bursts, same-update conflicts, overwritten intentions, or a
safe reservation size for a unified arbiter. Those questions require a new,
prospectively frozen, outcome-blind timestamped diagnostic before M1 code is
designed.

## Locked evidence

Only execution V2 under this exclusive root is eligible:

`research-evidence/fresh-dual-endpoint-v1/execution-v2-full-retry-a1`

Execution V1 is excluded because its scheduler gate failed. No V1 cell or
outcome may enter a count, estimate, plot, or interpretation.

The eligible execution is bound to:

- array `24832312`: exactly 2,700 task records, all `COMPLETED 0:0`;
- finalizer `24832313`: `COMPLETED 0:0` under `pi_jss233/day`;
- source commit `d97166ec25227c291718b73db6b6ea82a8f4e456`;
- manifest SHA-256
  `113dffc0c9a9b4238aa849ce5840538e46ddf80a7787fe1f1a38a6fefe0feed8`;
- aggregate SHA-256
  `2016d85685f7ebc3c104fcd164ebbbb922c9d2098f8b59bf461e6a78c8a32dcf`;
- `games.csv` SHA-256
  `1bf6562561fcf96ab125fa45098716016a5ed854f911b08da146c08aed2d96bd`;
- `outcomes.csv` SHA-256
  `2efb13f3c841cfa9d6640d1d69881d59ee3d58d14be52f9f90aac1172000f31a`;
- `transitions.csv` SHA-256
  `065873831ed3c28daf93a67dd0d16d86729c1d315e15ca6d39cdfc12c676788b`;
- `endpoint-effects.csv` SHA-256
  `e9b210095e896233fd1fd26d85f06eeae50fc9d57d134488ca2c1ad0d1e02183`;
- `gates.json` SHA-256
  `defce89afb068579f591e8b527c649aac7de55622f5456b6588c2199686d0dc4`;
- `scheduler.csv` SHA-256
  `d2823deb1c32d5272acd96b02479b53832d35d059c6749307f3d83785c3c4f33`;
- candidate runtime-tree SHA-256
  `c2bfaf67767ef675fbce2f6c00c6164d77f93a2f58501cd9f4424175996598fc`;
- pinned external-Supalosa runtime-tree SHA-256
  `34349919500c8019f9d9b1c2b2a7e2269dd57dde6b3414216bb6336e02977199`; and
- the runtime, lockfile, quadtree, priority-queue, map, opponent, and policy
  hashes already bound and independently checked at V2 prelaunch.

Before analysis, software must rehash every named finalizer file, validate its
sidecar/marker, validate the complete manifest identities, and independently
reconcile the scheduler table. Any mismatch fails the audit without producing
scientific output.

## Source fields

For every game, obtain from the replay-verified V2 cell:

- `updates`, arm, opponent, map, country, candidate start, opponent start,
  candidate slot, repeat, pair identifier, and requested engine seed;
- action-audit `callCount`;
- the complete `bySideAndMethod` map;
- zero-health-building-target request count, first and last diagnostics, and
  `bySideAndRulesName`; and
- action-audit SHA-256.

The cell value must equal the corresponding replayed final ledger value and
the scalar `actionCalls`, `corpseTargetRequests`, and `actionSha256` fields in
`games.csv`. Every one of the 2,700 cells must pass. Missing keys are zeros,
not missing observations, only after the complete fixed method vocabulary is
validated.

## Frozen summaries

Compute, separately for candidate and opponent sides:

1. total public action calls per game;
2. calls per 900 game updates;
3. call counts and rates for every fixed public action method;
4. `orderUnits` share of calls;
5. zero-health-building target requests per game, per 900 updates, and per
   `orderUnits` call; and
6. fraction of games with at least one zero-health-building target request.

Report each quantity by:

- arm and opponent;
- map, map family, and HFO revision where applicable;
- country, candidate start, opponent start, and candidate slot; and
- endpoint-defined duration and outcome strata only as explicitly labeled
  post-outcome descriptions, never as pre-treatment causal effects.

For every grouping report `n`, arithmetic mean, median, interquartile range,
minimum, maximum, and the complete denominator. Never drop a zero-call game.
Heavy-tail plots must show the complete empirical distribution rather than
only a mean bar.

## Comparisons and weighting

The primary action-resource contrasts are within the frozen paired case:

- candidate side minus opponent side for each arm/opponent cell; and
- non-control arm minus its frozen control for the same opponent and case
  wherever the manifest contains both observations.

Report raw differences and duration-normalized differences. Duration
normalization is descriptive because policy actions may change game length.
Do not treat it as a mediator-adjusted causal estimand.

To expose population sensitivity, report three distinct summaries without
selecting among them:

1. game-weighted across all eligible games;
2. equal-weighted over `mapId,country,candidateStart` clusters; and
3. equal-weighted over the five physical-topology families, first averaging
   revisions within HFO and South Pacific and then averaging families.

No heterogeneous all-map mixture receives a universal-performance claim.

## Uncertainty

For paired mean differences, use a deterministic cluster bootstrap with
10,000 replicates and seed `620260905`. Resample the complete
`mapId,country,candidateStart` clusters with replacement within each reported
map or family stratum and keep every observation inside a sampled cluster.
Report percentile 90% and 95% intervals. For an all-map equal-family summary,
resample clusters within each family and preserve equal family weights.

Also report the exact empirical fraction of paired differences that are
positive, zero, and negative. Confidence intervals are descriptive and cannot
override, replace, or rescue any frozen competitive gate.

## Integrity and exclusions

The audit must fail closed unless:

- all 2,700 games and 2,700 unique action hashes are accounted for at their
  exact manifest indices;
- both sides expose the complete fixed public action-method vocabulary;
- action totals equal the sum of `bySideAndMethod` counts;
- all zero-health target subtotals reconcile;
- no forwarded resignation exists; and
- independent summaries reproduce the finalizer's global action-call and
  corpse-target totals exactly.

No observation may be removed because it is long, short, a draw, an unusual
map, a weak country/start, an outlier, or inconvenient to a proposed method.
Any necessary data repair requires a new immutable analysis revision and a
preserved failure record; it may not silently edit V2 evidence.

## Outputs

Write a new immutable audit directory containing:

- `action-games.csv`, one row per game with reconciled totals;
- `action-methods.csv`, one row per game, side, and fixed method;
- `action-summaries.csv`, all prespecified group summaries;
- `action-contrasts.csv`, paired contrasts and bootstrap intervals;
- `corpse-targets.csv`, reconciled rule-name summaries;
- `audit.json`, identities, checks, counts, frozen seed, and interpretations;
- SHA-256 sidecars for every output; and
- `COMPLETE`, written only after every check and output succeeds.

The tracked result document must distinguish exact facts from interpretation
and must state prominently that whole-game counts cannot identify action
bursts or establish why a policy won.

## Advancement

Completion closes the action-resource portion of M0. It does not complete M1.
M1 next requires a separate outcome-blind diagnostic that records timestamped
action intents and engine-bound batches, followed by a frozen technical gate
for the unified intent arbiter, strict terminal race, and symmetric observation
firewall. Competitive development may resume only after those interfaces pass
their preregistered technical checks.
