# Fresh dual-endpoint remeasurement v1

Status: prospectively frozen design before competitive outcomes. This is
measurement revalidation of unchanged policies, not new policy training or
authorization to reinterpret old results. The corrected endpoint must first
pass the interface checks below. No paper conclusions are assumed.

## Objective and prerequisite

Determine how the legacy world-building endpoint (v5) and corrected
live-owned endpoint (v6) differ on fresh, complete competitive cohorts, and
reassess the existing HFO, Peak, transfer and Advanced claims under v6.

Prerequisite: the complete combatant-owned gate, aggregate SHA
0f8525c2874c8fc99c04ba121687e03c76a1a3a86675b80d95b4af75c79034ba,
audited in research/results/2026-09-03-combatant-owned-gate-a1-pass.md.
Its neutral predecessor and every failed attempt remain preserved.

V6 uses the already tested positive-health self-owned building snapshot.
Reuse v5's strict event attribution and completion rules: capture, sale,
unattributed cleanup and resignation cannot become physical victories.
Simultaneous physical elimination stays a draw. Missing engine-end evidence
fails technically. Keep v5 source and metadata immutable, and give v6 its own
version/specification hash and separately named class/module.

Before competitive use, test lifecycle sequencing, metadata versioning,
malformed data, simultaneous elimination, engine-finish truth tables, cap
handling and symmetric resignation suppression. Replay all 40 retained
combatant-gate streams through the new class without creating games; check
its physical decisions against the already audited candidate decisions.
This interface replay does not invent missing native defeat flags.

## Frozen policies and inputs

Do NOT repair StrongBot's corpse filtering in this study. Do not train,
select parameters, revive V8 rejects or alter tactics while outcomes accrue.

- Deployed StrongBot: freeze the actual imported runtime tree before launch
  and require it to match the previously audited 232-file SHA
  c2bfaf67767ef675fbce2f6c00c6164d77f93a2f58501cd9f4424175996598fc.
  Preserve the existing deployed factory/options, not an assumed fork-default
  approximation. Pin all helper and dependency files in the manifest.
- Peak champion: existing strategy_both arm only (macro scope both, tactical
  scope weak_only), against the deployed weak_only/weak_only control, using
  the exact existing peakProfilePolicies factory. This is not a new winner
  selected after remeasurement.
- Supalosa: external package commit
  165b77a71d0cf5ebd27c65b19d0486bcbae78d0f, clean and runtime-hashed.
- RA2Web Advanced: client 218fb800614295119e25040986b175fee4c3670f,
  release 0.84.1-r1d35349-dd6a17b9c, bundle SHA
  81d8797b6dd1371ba2dcbd79e25df8b42254290c820159e121a82650fd97a143,
  freeze-manifest SHA
  a405c0fc6d1d6541f965582c9b53be0bfd01c0c68f4d0f340e1a5ae37671aa5d.
  Pin the existing validated adapter; no V8 synthesized controller is used.
- Engine: original game-api 0.75.0 SHA
  dd398f5c8c2b4c3e3d6eb0f9ca6d7549bf70fee16c5950cd8902616ac922497d
  and validated explicit-start runtime SHA
  4ad4a5dd7a6a8ae53a7e671a29d7dd0a5fbad1916d94e52c69c9eda133a30f0c.
  All map/asset bytes stay unchanged and are hash-verified.

Settings: credits 10000; no crates, superweapons or starting units; MCV
repacks enabled; shortGame=false; gameSpeed=6; buildOffAlly=false;
multiEngineer=false (the pinned default); maximum 90000 updates. Both
participants use the same country. Canonical countries are the existing HFO/
multi-map order: Americans, Alliance, French, Germans, British, Africans,
Arabs, Confederation, Russians. Explicitly store names and ordinals.

## Historical version boundary

Historical raw-cell manifests record bot root-runtime hashes
d9b8dc71cbb232cb8691776301b04c86b9e5bbc9d882c682223f37550a50cee3
for HFO and
bf77d57ddc007ad1a618b1af135ee43556615814d71f29860f7db474eb4aef30
for Peak, not the current c2bf... tree. Those generic manifests alone do not
prove the historical imported package bytes were identical to either root.

Therefore this study evaluates the CURRENT frozen runtime and the existing
profile contrast in the historical population designs; it is not claimed to
be a byte-for-byte recreation of the old policies. Record actual import paths,
runtime hashes and factory options explicitly. Only the within-game v5/v6
contrast isolates endpoint effects. Historical before/after differences can
also reflect versions, seeds and sampling and must not be attributed entirely
to this metric repair.

The objective is the declared literal opposing-attribution all-live-building
criterion, not a claim that every native game mode uses identical victory
rules. The engine and its native rules are not changed.

## Complete population: 2700 games

| Cohort | Unique configurations | Policy arms | Games |
|---|---:|---:|---:|
| HFO LE central remeasurement | 720 | deployed StrongBot vs Supalosa | 720 |
| Peak frozen-profile comparison | 180 | deployed and strategy_both vs Supalosa | 360 |
| All 13 transfer maps | 900 | deployed StrongBot vs Supalosa | 900 |
| HFO LE Advanced crossplay | 360 | deployed StrongBot and external Supalosa vs Advanced | 720 |

No cohort or map may be dropped or substituted after outcomes. These are
2160 unique case configurations before multiplying policy arms. Repeated
arms and reciprocal slots are deliberate pairing, not additional independent
samples.

HFO LE map cd_chrono_4_heck_freezes_over_le.map, SHA
e4dfc736a6355e0e68d4681e4d67419516e6bb94549e2d42880c9414e95e2e8d.
Match the historical opposite-start population:
(39,82) <-> (151,119), (88,34) <-> (88,157).
Central cohort: 10 fresh repeats per country/start/slot, exactly 720 games.
Advanced cohort: 5 repeats per country/start/slot, 360 cases per arm.

Peak map cd_2_peak_of_perfection.map, SHA
440715dc154ac10b4b922159824140d40c48990311c6838345b66958f3b3a442.
Starts (37,73) and (118,73), reciprocal; 5 repeats per country/start/slot,
180 cases per arm. Preserve the weak-start invariance check on all 90 pairs
at (37,73).

Transfer maps are exactly the 13 entries of MULTIMAP_V2_MAPS in
multiMapRobustnessV2ExplicitTechnical.ts, preserving every registered name,
file hash, family and start count. Use the canonical FIRST amendment-3
allocation (job 24602339, SHA
5a838bd9cb3edf06df288914ad5cea60b61983f29d183a1efdeb5a3c90e3295e)
and zero-update census (SHA
5715eef27a8dc0b4b24f3ea2909c83ef2d15c3ea546a7c16b9b3a61b1583d1c5)
only to reproduce the 900 screen configurations' physical country/start/
opponent-start/slot assignments. Replace every seed and case identity.
Do not use old census screen flags, old game outcomes or confirmation cases
as a fresh cohort. Verify paired slots share the registered opponent start.

## Fresh seed reservation and outcome-blind selection

Proposed fresh namespace: 3300000000 through 3304999999.

- Central: base 3300000000.
- Peak: base 3301000000.
- Transfer: base 3302000000 plus mapIndex*10000.
- Advanced: base 3303000000.
- Compatibility canaries: base 3304000000.

Within each map/cohort, enumerate country, candidate start and repeat in
lexicographic numeric order. Both slots and all arms of a paired case share
the same engine seed; increment the seed once per such pair group. Actor
callback RNG identities remain candidate/opponent, independent of slot or
arm. Names, options and actual seeds are recorded.

Before any initialization, perform and preserve a metadata-only collision
audit against previous campaign manifests, seed reservations and declared
reserved namespaces. Do not read sealed competitive outcomes for this audit.
Disclose the audit's coverage and exclusions; do not claim universal archive
coverage. Any overlap or unresolved reservation blocks launch and requires a
pre-outcome amendment, never a silent seed shift.

An outcome-blind zero-update selector must validate exactly 2160 unique
configurations with passive bots, exact map/start/country/slot coverage,
paired seed assignments, no rejected-case replacement, zero updates and no
outcome fields. Freeze a complete 2700-game arm-assignment manifest plus all
source/runtime/asset/policy hashes before competitive execution.

## Passive paired endpoints, not altered gameplay

Run one physical simulation per game with independent v5 and v6 observers.
Each observer's FIRST terminal or cap result is immutable. Once one observer
finishes, stop updating that observer but do not feed its result to either
policy. Continue unchanged gameplay only to finish the other observer or reach
native termination/the common 90000-update cap. Thus both measurements refer
to prefixes of the same deterministic policy/world trajectory.

Never freeze agents, remove units, change rewards or alter actions after the
first observer finishes. Native termination without valid completion evidence
is a technical failure. Symmetrically suppress and audit both bots' quit
requests; require zero forwarded resignations. Preserve all technical failures.

Keep a compressed reconstructable building-state/event stream, preferably
delta encoded, with initial state, every building change and relevant event,
all native completion-state changes and final/cap markers. Stream writes must
be bounded-memory and checksum protected. Verify reconstructing skipped
unchanged intervals cannot hide an eligible zeroing transition. Keep each
observer's complete event certificate, first result and update.

Record passive diagnostics: first and accumulated live/world building-count
discrepancy, retained zero-health building types, and direct object-target
orders aimed at zero-health buildings. Do not alter those orders or filter
the agent's observations. Zero direct-object requests does not prove absence
of corpse-related policy effects: ground orders and strategy thresholds are
not covered by that diagnostic. Treat all such associations as descriptive.

## Compatibility before expensive games

After v6 interface tests, run four fixed outcome-blind canary configurations:
deployed StrongBot/Supalosa on HFO LE; strategy_both/Supalosa on Peak;
deployed StrongBot/Advanced on HFO LE; external Supalosa/Advanced on HFO LE.
Use Americans, candidate slot 0, West/opposite on HFO and (118,73)/(37,73)
on Peak, seeds 3304000000..3304000003, excluded from all cohorts.

For each, run a v5-only reference and passive dual-observer variant on the
same seed for exactly 6000 updates, yielding eight technical canary games.
Compare normalized full-world trajectory and public-action hashes exactly.
Require source/runtime/policy identities, valid compressed output, no
unexpected runtime/early-finish failure, and zero forwarded resignation.
Inspect only technical integrity, not W/D/L or policy strength. A failed
canary blocks the 2700-game stage; preserve it and amend prospectively.

## Frozen analysis and uncertainty

Score wins=1, draws=0.5, losses=0, with all draw subtypes retained. Analyze v6
as the intended live-building endpoint and retain v5 as the paired legacy
measurement. For every cohort, map, arm, country, faction, start, slot and
country/start cell report both complete W/D/L tables, cap/nonliteral counts,
first-event times and all v5-to-v6 transitions, including unfavorable ones.

The primary endpoint-impact estimand is paired score(v6)-score(v5), NOT an
algorithmic improvement. Report pooled and equal-weight country/start
estimates with paired country/start-clustered uncertainty. Use one-sided 95%
Wilson win bounds (z=1.6448536269514722) and the existing disclosed t
approximation for country/start means (df=35, t=1.68957 for HFO; df=17,
t=1.73961 for Peak). Do not treat shared-arm/slot seeds as independent data.
Retain raw audit tables and clearly label approximate, fixed-strata inference.

Central superiority requires W>L overall and in every country; pooled and
36-cell lower bounds >0.5; every start/faction/slot Wilson lower >0.5;
at least 7/9 country Wilson bounds >0.5; at least 30/36 country/start
cells W>L with all remaining cells W>=L. Dominance additionally requires
point win rate >=0.80, pooled lower >0.75 and all 36 cells strictly positive.

Peak strategy_both must meet the original replication conditions: W>L and
pooled lower >0.5; positive paired score mean and its original 95% lower
(t=1.65341, df=179); positive starts/factions/slots; all countries noninferior
and at least seven positive; 18-cell lower >0.5; and exact weak-start paired
trajectory/outcome invariance. Additionally require a positive paired
country/start-clustered score-difference lower bound (df=17). This additional
condition accounts for shared pairing rather than weakening the old gates.

All 13 transfer maps remain a descriptive fresh transfer screen, not
confirmed general-map dominance from one repeat per cell. Report every map;
any subsequent policy development or confirmation requires a new protocol
and fresh cases. Never claim family-level robustness from favorable subsets.

Advanced superiority/dominance uses the same HFO-style absolute and stratum
requirements as above, with five repeats per cell. A claim of improvement
over external Supalosa additionally requires positive paired score mean and
positive country/start-clustered 95% lower bound. Report both arms even if
neither passes. No positive result, rescue of V8 or routing deployment is
presumed.

## Execution, resources and stopping rules

Use only pi_jss233 CPU day. Zero-update selection may be partitioned into
the 16 fixed cohort/map blocks with concurrency <=8. Canary pairs use one
worker per configuration, sequential reference/dual runs. Preserve all job
IDs, counts and immutable completion/checksum markers.

For the competitive stage, prefer a single array 0-2699%64, one game/task,
1 CPU/8 GiB/12-hour limit, no automatic requeue, with an afterok fail-closed
finalizer. Check scheduler array/submission limits first. Any necessary
operational sharding must be frozen before outcomes, preserve the exact
2700-game manifest, and maintain GLOBAL concurrency <=64.

Observed older runs used 199.4 CPU-hours for the 900-map screen and 29.1
CPU-hours for the 288-game confirmation. Plan approximately 500-1000 CPU-hours
for this broader dual-observer study; this is an estimate, not a guarantee.
Use durable project evidence storage, streaming compression, and a planned
storage envelope <=700 GiB / <=25000 new files. Do not repeatedly reinstall
dependencies or copy runtime assets. Validate storage/streaming assumptions
in canaries before scaling.

The complete cohort is the analysis unit: no partial competitive outcomes,
no interim map/arm selection, no source changes while any source-bound stage
runs, no paper writing, and no selective reruns. Finalize only after every
game and all technical checks complete. Preserve and disclose failures;
a prospective repair must not replace selected outcome-bearing games.

A completed study may justify a new policy experiment, such as a separately
controlled liveness filter, but does not itself authorize that change.
Historical scores remain untouched. The overall program is not complete
until the remaining map/opponent shortcomings and uncertainty are addressed.
