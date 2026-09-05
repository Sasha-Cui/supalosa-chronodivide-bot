# Fresh dual-endpoint V2 complete result and independent audit

Date: 2026-09-05

## Disposition

Execution V2 is technically complete and scientifically interpretable.
Milestone M0 is closed.

The complete population supports reliable within-map superiority and dominance
of deployed StrongBot over pinned Supalosa on HFO LE. It does not support a
Peak strategy improvement, superiority to RA2Web Advanced, or general
reliability across the map suite.

Execution V1 remains an immutable scheduler failure. No V1 outcome was
inspected, and no V1 observation is pooled with V2.

## Immutable identities

- V2 array: `24832312`
- V2 finalizer: `24832313`
- independent audit: `24920955`
- account/partition: `pi_jss233/day`
- V2 source:
  `d97166ec25227c291718b73db6b6ea82a8f4e456`
- independent analysis source:
  `ce0a6eb0d106b2d74aca22cd2ecbce307f49236d`
- independent program SHA-256:
  `6526f4939340edb1d5b92886676d18a32fd3b9e39dc1126695d7e83b050d83ba`
- manifest SHA-256:
  `113dffc0c9a9b4238aa849ce5840538e46ddf80a7787fe1f1a38a6fefe0feed8`
- candidate runtime-tree SHA-256:
  `c2bfaf67767ef675fbce2f6c00c6164d77f93a2f58501cd9f4424175996598fc`
- external Supalosa runtime-tree SHA-256:
  `34349919500c8019f9d9b1c2b2a7e2269dd57dde6b3414216bb6336e02977199`
- RA2Web Advanced bundle SHA-256:
  `81d8797b6dd1371ba2dcbd79e25df8b42254290c820159e121a82650fd97a143`

The exclusive evidence root is:

`/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/fresh-dual-endpoint-v1/execution-v2-full-retry-a1`

## Technical integrity

The V2 array contains exactly 2,700 unique task records. Every task is
`COMPLETED 0:0`, used one CPU on `day` under `pi_jss233`, and has zero
restarts. The finalizer is `COMPLETED 0:0`. All 2,700 exclusive cell markers,
case sidecars, compressed-ledger sidecars, scheduler identities, assignments,
maps, seeds, and endpoints reconcile.

The finalizer streamed and replayed:

- 2,700 cells and ledgers;
- 80,117,573 updates;
- 8,167,512 ledger records;
- 28,819,853,386 uncompressed ledger bytes; and
- 324,452,880 compressed ledger bytes.

There were zero forwarded resignations. The largest compressed game ledger was
896,888 bytes.

Independent audit job `24920955` completed in 25 minutes 46 seconds with
eight CPUs and empty stderr. It independently:

- rehashed the source, manifest, runtime trees, transitive dependencies,
  game API, 335 assets, 15 maps, opponent bundle, finalizer outputs, every
  cell, and every compressed and decompressed ledger;
- regenerated and exactly matched 1,838 outcome rows, 107 transition rows,
  25 corrected endpoint-effect rows, and every nested gate;
- emitted 2,700 action-game rows, 81,000 game-side-method rows, 153,036
  stratified summaries, and 234 paired contrast rows; and
- validated the A1 action-hash multiplicity contract: 2,520 distinct values,
  exactly 180 values with multiplicity two, and no higher multiplicity. Every
  repetition is one exact deployed/strategy_both Peak pair.

## Artifact hashes

| Artifact | SHA-256 |
| --- | --- |
| V2 aggregate | `2016d85685f7ebc3c104fcd164ebbbb922c9d2098f8b59bf461e6a78c8a32dcf` |
| V2 games | `1bf6562561fcf96ab125fa45098716016a5ed854f911b08da146c08aed2d96bd` |
| V2 outcomes | `2efb13f3c841cfa9d6640d1d69881d59ee3d58d14be52f9f90aac1172000f31a` |
| V2 transitions | `065873831ed3c28daf93a67dd0d16d86729c1d315e15ca6d39cdfc12c676788b` |
| V2 endpoint effects | `e9b210095e896233fd1fd26d85f06eeae50fc9d57d134488ca2c1ad0d1e02183` |
| V2 gates | `defce89afb068579f591e8b527c649aac7de55622f5456b6588c2199686d0dc4` |
| Independent audit | `479519cb4c928d6a99a880ea3912f05817e4ad80839a3fb39c9f7de25b1ea186` |
| Independent action games | `d8ab61408aa401e988221143e98fcafe2fd0deb1de0d0be8aa6ef626f5a7df27` |
| Independent action methods | `e25072d007f69c0603a6da6841c454fb1754c5b5d2dbfbd8e21c7599628b74c4` |
| Independent action summaries | `8acb90fd3aff054f0231faa51c0554a4a58b5f391c562491bb5b2f3c1247917a` |
| Independent action contrasts | `10707af4923fd597dabf46bc4fa8e37216572dfa45236b99cebee35473f2be23` |
| Ledger V2 | `0e4e5199e5a07ee19e28bab4a8af04240670a6a7a7d7a25823df664fade77eac` |

Ledger V2 has eight canonical entries: one hash-bound legacy V1 snapshot, the
V1 failure, the V2 execution, four scientific components, and the independent
action audit. Full artifact verification passes. Ledger V1 was not modified.

## Central HFO LE result

The v6 live-building endpoint gives:

| Games | Wins | Draws | Losses | Win rate | One-sided Wilson lower 95% | Country/start lower 95% |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 720 | 642 | 32 | 46 | 0.8917 | 0.8711 | 0.8543 |

Every frozen superiority check passes:

- wins exceed losses overall and in every country;
- all nine country Wilson lower bounds exceed 0.5;
- all 36 country/start cells are strictly positive;
- every start, faction, and participant-slot Wilson lower bound exceeds 0.5;
- the pooled and equal-country/start lower bounds exceed 0.5.

Every frozen dominance condition also passes: point win rate is at least 0.80,
the pooled lower bound exceeds 0.75, and all 36 country/start cells are
strictly positive.

This is reliable evidence for HFO LE against the exact pinned Supalosa
implementation. It is not evidence for other maps, Advanced, fog parity, or a
universal game-playing method.

## Peak result

Both arms produced exactly:

| Arm | Wins | Draws | Losses |
| --- | ---: | ---: | ---: |
| deployed | 141 | 12 | 27 |
| strategy_both | 141 | 12 | 27 |

All 180 paired score differences are zero. More strongly, every pair has the
same action hash, uncompressed ledger hash, v5 result, and v6 result. The
strategy_both improvement gate therefore fails. The positive absolute record
belongs to deployed StrongBot as well and cannot be attributed to the frozen
strategy change.

## RA2Web Advanced result

| Candidate against Advanced | Wins | Draws | Losses | Win rate |
| --- | ---: | ---: | ---: | ---: |
| deployed StrongBot | 74 | 20 | 266 | 0.2056 |
| external Supalosa | 188 | 22 | 150 | 0.5222 |

The paired StrongBot-minus-Supalosa score difference is (-0.3194).
StrongBot fails every absolute superiority and dominance gate and both paired
improvement gates. External Supalosa has wins greater than losses at the point
estimate but does not pass the stringent frozen reliability gate.

Advanced remains unsolved. No rejected V4–V8 arm is revived by this result.

## Fresh 13-map transfer screen

The v6 per-map results are:

| Map | N | W | D | L | One-sided Wilson win lower 95% |
| --- | ---: | ---: | ---: | ---: | ---: |
| HFO BvB | 36 | 18 | 0 | 18 | 0.368 |
| HFO Corners | 72 | 39 | 4 | 29 | 0.445 |
| HFO Corners B | 72 | 45 | 5 | 22 | 0.528 |
| HFO Corners B Golden | 72 | 35 | 11 | 26 | 0.391 |
| HFO Golden | 108 | 60 | 2 | 46 | 0.477 |
| HFO LvL | 36 | 29 | 0 | 7 | 0.677 |
| HFO Original | 144 | 84 | 5 | 55 | 0.515 |
| HFO RvR | 36 | 24 | 10 | 2 | 0.530 |
| HFO TvT | 36 | 16 | 0 | 20 | 0.317 |
| Pacific Heights | 72 | 20 | 46 | 6 | 0.200 |
| South Pacific | 72 | 14 | 50 | 8 | 0.129 |
| South Pacific two-start | 36 | 12 | 22 | 2 | 0.220 |
| Tour of Egypt | 108 | 33 | 4 | 71 | 0.238 |

Wins exceed losses on ten of thirteen maps, HFO BvB is tied, and HFO TvT and
Tour of Egypt are negative. This is a one-repeat-per-cell development screen,
not a per-map reliability confirmation. The water maps are especially
draw-heavy. HFO and South Pacific revisions are correlated members of two
topology families rather than independent maps.

## Endpoint remeasurement

Across all 2,700 games, v6 versus v5 produces 28 favorable score transitions,
2 unfavorable transitions, and 2,670 unchanged results, for a mean paired
measurement difference of (0.00481). These are endpoint-measurement changes,
not algorithmic improvements.

Changes occur in Peak, Pacific Heights, and both South Pacific revisions. Only
the South Pacific two-start map has a positive country/start-clustered
endpoint-effect lower bound. The all-row heterogeneous mixture has no
inferential confidence bound by design.

## Action-resource findings

Across both players and all games, the audit intercepted 31,276,009 public
action calls:

| Side | All calls | `orderUnits` calls | Order share |
| --- | ---: | ---: | ---: |
| StrongBot/candidate side | 27,826,646 | 26,300,453 | 94.52% |
| Opponent side | 3,449,363 | 2,206,839 | 63.98% |

The main complete-population rates are:

| Cohort/arm | Candidate calls per 900 updates, mean/median | Opponent mean/median |
| --- | ---: | ---: |
| HFO LE deployed vs Supalosa | 554.66 / 495.33 | 36.53 / 35.19 |
| HFO LE deployed vs Advanced | 664.80 / 583.56 | 31.98 / 29.57 |
| Supalosa reference vs Advanced | 46.18 / 45.33 | 30.28 / 28.11 |
| Peak deployed or strategy_both vs Supalosa | 132.84 / 121.76 | 41.72 / 40.71 |

For deployed StrongBot versus Advanced, the paired excess over external
Supalosa is 618.63 calls per 900 updates; the country/start-clustered
percentile-95% interval is [467.59, 777.17]. Nearly all of the difference is
`orderUnits`: 617.66 extra calls per 900 updates.

This is direct evidence of extreme command pressure at the public API
boundary. It is not yet evidence that command pressure caused losses, because
whole-game totals do not reveal simultaneity, overwrites, accepted engine
batches, or counterfactual performance.

The audit also found 256,955 zero-health-building target requests. Candidate
StrongBot produced 253,049 and opponents produced 3,906. Every request targeted
rules name `CAOILD`. Candidate requests were concentrated in:

| Map | Affected arm-game rows | Requests |
| --- | ---: | ---: |
| Pacific Heights | 27/72 | 208,171 |
| South Pacific | 14/72 | 29,286 |
| South Pacific two-start | 18/36 | 11,198 |
| Peak, both exact arms | 4/360 | 4,394 |

The concentration overlaps the draw-heavy water maps, which motivates an
outcome-blind timestamped target-validity and action-conflict diagnostic. It
does not establish that corpse targeting caused those draws.

Quit calls are counted at interception even though the experiment
symmetrically suppresses forwarding. Therefore raw total-call figures are
interface-request counts, not human APM, effective APM, or exact engine-bound
command counts.

## Claim boundary

Supported:

- reliable HFO LE superiority and dominance over pinned Supalosa under the
  declared API-full-state Chrono Divide bot environment;
- exact absence of a Peak strategy_both effect in this implementation;
- a valid negative Advanced comparison; and
- descriptive, complete-population map and action diagnostics.

Not supported:

- reliable superiority on all 15 maps;
- superiority to RA2Web Advanced;
- causal benefit from an intent arbiter, race certificate, or router;
- equal information use or fog-of-war parity;
- 15 independent topology replications;
- a new environment, general optimizer, or paradigm shift; or
- a submission-ready paper.

## Advancement

M0 is complete. M1 is authorized only for outcome-blind technical work:

1. record timestamped proposals and public action calls for both sides on fresh,
   fixed-horizon cases;
2. measure rolling total, order, and non-order call pressure without W/D/L;
3. freeze a conservative action budget;
4. implement and test `unified-intent-arbiter-v1`;
5. extend the strict staggered-damage/base-loss logic into a certified
   final-building race;
6. implement the symmetric full-state/fog-respecting observation firewall; and
7. pass deterministic all-topology technical gates before any new competitive
   development outcome is generated.

The current manuscript remains frozen.
