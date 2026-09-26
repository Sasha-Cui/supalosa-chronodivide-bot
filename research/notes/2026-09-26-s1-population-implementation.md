# S1 population analysis and result-validation checkpoint

Follow-up: the [runtime checkpoint](2026-09-26-s1-runtime-implementation.md)
records implemented storage/registration/provenance foundations and the later
388-check development pass. Stage-envelope/runner/submission integration and
all formal gates remain pending.

Updated 2026-09-26 UTC, before any S1 engine initialization or study observation.
The prospective S1 protocol is unchanged. This note supersedes the earlier
population-analysis/episode-schema-pending checkpoint, not the still-missing
provenance, registration, stage execution or formal gates.

## Implemented modules

Five new driver training modules are additive; historical D1/OD1 sources and
evidence are unchanged:

- `strategicS1Results.ts`: exact canary/smoke/diagnostic episode schemas,
  fixed ordered canary comparisons, nested structured action diagnostics,
  source-bound technical assertions and full retained-payload replay.
- `strategicS1CrossLedger.ts`: bounded streaming supplemental endpoint schema
  and cross-channel validation. Header names/24,000 horizon/empty observer
  state/initial engine, finite sorted building identities and literal engine
  booleans are checked. Strategic samples match endpoint sample clocks,
  positive-health public-world buildings, defeat flags and positive-tick
  event windows. Both positive-world and live-self building counts are
  retained separately rather than assumed interchangeable.
- `strategicS1Distributions.ts`: deterministic exact-frequency distributions,
  explicit observed/unavailable/domain denominators and missingness reasons.
- `strategicS1Descriptions.ts`: complete per-case public economy, queues,
  inventory, unit/weapon availability, missions, membership differences,
  dispersion, order/target categories, events and building trajectories.
- `strategicS1Population.ts`: fail-closed exact 200-case reconstruction and
  source-bound replay of all 200 endpoint plus 200 strategic ledgers, with
  every predefined group and all complete descriptive outputs.

These are runtime integrity implementations, not an independent auditor.
The final independent all-population audit must not import these production
validators or analysis modules as its purported independent reconstruction.
No raw action arguments are reconstructed. Tick-zero events were not retained
by the separate endpoint ledger; those retained strategic startup events
remain source-bound rather than independently cross-reconstructed. Discarded
canary/smoke payloads likewise have source-bound assertions only.

## Exact descriptive conventions

The input contains exactly the full frozen assignments and one diagnostic
episode per case, with no unknown assignment fields, duplicates, replacement
cases, subset option or partial result. All source-bound episode identities,
both payloads, action counts, first-result/evaluation objects, sampling clocks,
country and analysis digests must validate before a complete result returns.

There are 72 predefined group rows: overall; two opponents; 25 opponent-map
strata; 15 maps; two countries; two factions; two slots; two directions; five
topologies; all five statuses and all three W/D/L outcomes for each of v5/v6.
Empty status/outcome groups remain with zero cases and unavailable rates,
not disappearing or gaining fabricated measured-zero observations. Every
group carries the same diagnostic metric catalog, W/D/L/status/time data,
screen coverage and action totals. Every family partitions all 200 cases.
The 25 strata each contain eight cases.

All metric frequency tables are retained, with quantiles at zero-based
sorted index min(n-1, floor(q*n)), without interpolation. Pooled summaries
weight observations in the declared sample/unit/mission/window domain;
they are not time-weighted averages. Equal-case mean distributions are
reported separately so a longer observed episode does not silently become
an equal-weight case. Unavailable values carry reasons and denominators.

The observed catalog includes per-rule and per-type inventories, queue item
rules, and mission type/priority groups. Complete-census absence of a catalog
entry is a measured zero and is filled to the full sample denominator.
Missing optional fields and empty unit/mission domains are never imputed
as zero. Known purchase-value subtotals accompany missing-unit counts and
are not combat-strength estimates. Credits are balance snapshots, not income.
Mission ages remain sampled lower bounds; first/gapped membership differences
remain unavailable with distinct reasons, not invented lifecycle events.
Raw membership occurrences, unique IDs, live-owned members, stale IDs and
duplicate occurrences remain separate.

Action method/order/target totals and rates use actual advancing-update
denominators, including startup calls in the numerator. Startup-window
per-update rates are unavailable because that window has zero advancing
updates. Window distributions and aggregate rates are distinct measures.
All four unchanged screens retain per-case runs, positive incidence,
eligible/unknown sample counts and reasons; reasons can overlap. Four
periodic samples span 900 updates but do not prove continuous truth.
Unobserved flags do not establish absence of a bottleneck.

The analysis explicitly sets policyComparison=false,
policySelectionAuthorized=false and independentAudit=false. No superiority
filter, historical win-rate comparison, causal estimate or automatic choice
of an intervention was introduced.

## Verification and preserved failures

Current formatted-source build and **368 development checks passed**:
329 Vitest assertions across 33 files plus 39 Node checks. All failures,
pending/todo/skipped/cancelled tests are zero. These are pure/synthetic
records and fake-game adapter checks: zero real engine initializations,
zero advancing study episodes and no formal S1 gate or Slurm submission.

Final regression:
`research-evidence/strategic-diagnostic-s1/development/population-final-bWnYrr/result.json`,
8,385 bytes, SHA-256
`e7383e371fbf0c6e5031b9e593454130f598d385831db2196a2652297a559c86`.

Twenty-three new population/result/distribution assertions plus one adapter
integration assertion cover all five endpoint statuses, complete 200-case
population and 72 groups, exact reordering determinism, empty categories,
missingness/zero distinctions, weighting, strict nested projections, both
ledger replays, rehashed country/building/event/horizon tampering, injected
initial outcomes, and fail-closed incomplete/duplicate/corrupt populations.
The existing adapter's fake getAllUnits now respects the public rules filter;
production gameplay and historical endpoint modules were not changed.

Preserved development attempts:

- `population-1AiXDX`: build failed on explicit map-element typing and a
  synthetic Object.fromEntries conversion; no tests or engine initialization.
- `population-LNAGR5`: build passed; cross-ledger tests exposed fake APIs
  ignoring getAllUnits' rules filter, so synthetic legacy building records
  included vehicles. Only the fake APIs were fixed. Failed reports and all
  source versions remain preserved; full-population checks skipped after
  their setup failed and were not represented as passes.
- `population-NtapSC`: build and all 36 then-current new/adapter assertions
  passed before the final source review.
- `population-regression-uDAdli`: full 367-check formatted-source pass before
  adding the initial-header regression, SHA-256
  `a7d568e86d084436feb079bd443e94ffe93b94b54da8cf8545d4ea3246ba04f5`.
- `population-final-1hfAZ4`: build passed; 328 assertions passed and one
  failed because the new test incorrectly expected the embedded replay to
  accept a preloaded header result. It already rejects that header. All
  bound sources/reports/logs are preserved. The corrected test demonstrates
  that low-level record replay alone is insufficient and that both embedded
  replay and full S1 validation reject the forged input. No gate was relaxed.
- `population-final-bWnYrr`: complete current 368-check pass.

Two local tool-script quoting SyntaxErrors prevented their respective patch
commands from executing at all; corrected quoting succeeded. During final
patch review, a split declaration and duplicate test block were corrected
before build/test. No observation or source-bound job ran in intermediate
editing states; controller events are preserved with the development evidence.

## Serialization probe and remaining harness work

The reproducible full synthetic probe used 200 cases, 400 retained-ledger
replays, 3,560 samples /3,200 periodic samples, 72 groups and 540 metric
definitions. It serialized all output to 55,109,610 bytes, without truncation,
in about 12.9 seconds for this fixture. Node process maximum RSS was 423,304 KiB.
This is not a guarantee of real-game/finalizer resource use.

Probe receipt:
`development/population-probe-TJesb2/result.json`, 1,191 bytes, SHA-256
`1bc36df674572457bceb39693e010c943c0eb8de79201b5b72b37ca5183d8122`;
synthetic analysis digest
`3d683c3cffb26e6cb782e04d0160cd584cce7fec223d67e21beeca7a8d61d96d`.
Only the compact receipt/digest was written; its generator is the retained
synthetic fixture and compiled source bound by the final regression.

The frozen 32 MiB limit is for each whole main game artifact and is unchanged.
The future finalizer must account prospectively for the larger complete
aggregate in its publication/readback limits and 24 GiB allocation. Do not
reuse a 32 MiB per-game reader for this aggregate, silently drop frequencies
or groups, or expand the frozen per-game limits. Keep exactly 416 execution
files; any later report exports live outside that namespace.

Still missing before any formal gate: source/runtime/provenance and exact
full registration context, complete stage-envelope schemas, selector and
runner/finalizer integration, pure-gate program, immutable submission helper
and CPU Slurm wrappers. The new episode validators must be called at all
publication/readback boundaries. Reconstruct all factory/default/firewall
options, exact assignments and historical consumed identities, with tests,
before source freeze and the prescribed formal gate order.

No S1 initializer, real game, intent or job exists; the fresh seed reservations
still require the complete collision audit. No policy improvement is claimed.
The original deployed policy and manuscript remain unchanged; M2 is unachieved.
