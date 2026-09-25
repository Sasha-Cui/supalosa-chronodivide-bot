# D1: independently audited negative development result

2026-09-25. Internal research documentation, not a manuscript or deployment approval.

## Executive answer

Retain unchanged StrongBot. Removing the shared command cap improved pooled performance relative to failed capped V2, but did not pass the frozen broad mechanism filter and did not improve over unchanged StrongBot. The absolute Advanced gate also failed. Stop arbitration as the primary performance direction; no ceiling search or repeated variants. M2 remains incomplete.

All 200 blocks / 600 competitive games completed once. Independent audit 27472280 reconstructed both endpoint observers from every retained ledger and reproduced all tables, action summaries, 18 bootstrap streams and frozen gates. The repaired auditor passed technical verification; that does not make the bot a scientific success.

## Configuration contract

| Knob | Frozen choice / status |
| --- | --- |
| Default policy | Unchanged deployed StrongBot; arbiter disabled; retain |
| Diagnostic arms | Original capped V2 (115/900) and unbounded D1 (explicit null ceiling); neither authorized for deployment |
| Changed component | Shared order/debug rolling admission only; essential lane remains uncapped; no new tactics |
| Population | 200 blocks; Supalosa 120 / Advanced 80; all 25 strata, Americans/Africans, both slots and reciprocal first-two starts |
| Endpoints / horizon | Corrected live-owned v6 primary, passive v5; immutable first results; 24,000 updates |
| Observation contract | Public api_full_state; no fog-of-war parity claim |
| Uncertainty | 18 named SHA-256 streams × 200,000 replicates, sorted lower index 20,000 |
| Untested here | Nine-country confirmation, fresh replication, strategic production/composition/mission improvements |

[Machine-readable configuration contract](https://ood-bouchet.ycrc.yale.edu/pun/sys/dashboard/files/fs//nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot/research/results/2026-09-25-command-budget-d1/data/contract.json).

## Primary result

Within each population, higher score is better. Bold marks the highest policy score, including ties. W/D/L are separate counts, not a scalar ranking.

| Population (N/arm) | Unchanged W/D/L; score | Capped V2 W/D/L; score | Unbounded W/D/L; score |
| --- | --- | --- | --- |
| Overall (200) | **70/81/49; 55.25%** | 49/92/59; 47.50% | 68/76/56; 53.00% |
| Supalosa (120) | **46/42/32; 55.83%** | 34/50/36; 49.17% | 41/44/35; 52.50% |
| Advanced (80) | **24/39/17; 54.38%** | 15/42/23; 45.00% | 27/32/21; 53.75% |

[All populations, both endpoints, status counts and first-result-time summaries](https://ood-bouchet.ycrc.yale.edu/pun/sys/dashboard/files/fs//nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot/research/results/2026-09-25-command-budget-d1/visual_tables/populations_full_audit.csv). Score = (wins + 0.5 × draws) / games; literal-win rate = wins / games.

## Paired effects and uncertainty

![All paired score means and one-sided lower bounds](https://ood-bouchet.ycrc.yale.edu/pun/sys/dashboard/files/fs//nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot/research/results/2026-09-25-command-budget-d1/visual_figures/paired-score-bounds.png)

| Contrast | Population | Score delta (pp) | 90% lower (pp) |
| --- | --- | --- | --- |
| Unbounded − V2 | Overall | +5.50 | +2.00 |
| Unbounded − V2 | Supalosa | +3.33 | -0.83 |
| Unbounded − V2 | Advanced | +8.75 | +2.50 |
| Unbounded − unchanged | Overall | -2.25 | -4.00 |
| Unbounded − unchanged | Supalosa | -3.33 | -5.42 |
| Unbounded − unchanged | Advanced | -0.63 | -4.38 |
| V2 − unchanged | Overall | -7.75 | -10.75 |
| V2 − unchanged | Supalosa | -6.67 | -10.42 |
| V2 − unchanged | Advanced | -9.38 | -14.38 |

Higher deltas and lower bounds favor the named treatment. These are different reference contrasts, not alternative uncertainty estimators to select between. [All 18 bounds, cluster counts and reproducible sampling/statistic digests](https://ood-bouchet.ycrc.yale.edu/pun/sys/dashboard/files/fs//nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot/research/results/2026-09-25-command-budget-d1/visual_tables/uncertainty_full_audit.csv).

The primary unbounded-minus-V2 overall score lower is +2.00 pp, but its Supalosa lower is −0.83 pp and its five-topology lower is −3.13 pp. Thus the frozen broad budget-removal diagnostic fails. The secondary unbounded-minus-unchanged score is −2.25 pp overall, −3.33 pp versus Supalosa and −0.625 pp versus Advanced. Advanced literal wins increased from 24 to 27, but losses increased from 17 to 21: more wins alone does not satisfy score or safety requirements.

A failed positive-lower-bound gate does not itself prove universal harm. These are open-development decision filters, not family-wise confirmatory tests. Benchmark strata are not independent topologies; five topology groups are few, and the four country/direction clusters are sensitivity descriptions only.

## Map breadth

![Every opponent-map stratum in all three contrasts](https://ood-bouchet.ycrc.yale.edu/pun/sys/dashboard/files/fs//nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot/research/results/2026-09-25-command-budget-d1/visual_figures/all-stratum-score-deltas.png)

| Opponent / map | Unchanged score | V2 score | Unbounded score |
| --- | --- | --- | --- |
| pinned_supalosa__hfo-le | **62.50%** | 50.00% | 56.25% |
| pinned_supalosa__peak | 68.75% | **81.25%** | 62.50% |
| pinned_supalosa__hfo-original | **50.00%** | 43.75% | **50.00%** |
| pinned_supalosa__hfo-golden | **62.50%** | 50.00% | 50.00% |
| pinned_supalosa__hfo-corners | 50.00% | **56.25%** | 50.00% |
| … all 25 rows linked below … | … | … | … |
| ra2web_advanced__hfo-corners-b-golden | **50.00%** | 31.25% | **50.00%** |
| ra2web_advanced__hfo-bvb | **62.50%** | 37.50% | 50.00% |
| ra2web_advanced__hfo-lvl | 43.75% | **50.00%** | 43.75% |
| ra2web_advanced__hfo-rvr | **43.75%** | 37.50% | 31.25% |
| ra2web_advanced__hfo-tvt | 75.00% | 50.00% | **87.50%** |

Higher policy score is better; bold marks every tied maximum within a row. The table is a fixed first-five/last-five excerpt, while the figure shows all 25 strata. [Complete 25-stratum policy results and three contrasts](https://ood-bouchet.ycrc.yale.edu/pun/sys/dashboard/files/fs//nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot/research/results/2026-09-25-command-budget-d1/visual_tables/strata_full_audit.csv).

Unbounded-minus-unchanged point scores are negative in 11, zero in 9, and positive in 5 of 25 strata. No cell was excluded, rerun, or selected to rescue the failed pooled decisions.

## Frozen gates

| Frozen decision | Result | Reason |
| --- | --- | --- |
| Budget-removal mechanism | FAIL | Supalosa score lower −0.83 pp is not above zero |
| Improvement over unchanged | FAIL | Overall score −2.25 pp; lower −4.00 pp; additional safety failures |
| Absolute Advanced eligibility | FAIL | Literal-win Wilson lower 27.36% is not above 50% |

Failed mechanism checks: supalosaScore. Failed policy-improvement checks: overallScore, overallLiteralWin, advancedScore, supalosaNoninferiority, supalosaMapSafety, americansNonnegative, africansNonnegative, slot0Nonnegative, slot1Nonnegative. Failed absolute check: pooledWilsonWinAboveHalf. [Every prespecified gate, including passes](https://ood-bouchet.ycrc.yale.edu/pun/sys/dashboard/files/fs//nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot/research/results/2026-09-25-command-budget-d1/visual_tables/gates_full_audit.csv).

## Transitions, subgroups, and measurement

### Unbounded − V2

| Transition | Count (overall v6) |
| --- | --- |
| W->W | 39 |
| W->D | 8 |
| W->L | 2 |
| D->W | 22 |
| D->D | 59 |
| D->L | 11 |
| L->W | 7 |
| L->D | 9 |
| L->L | 43 |

### Unbounded − unchanged

| Transition | Count (overall v6) |
| --- | --- |
| W->W | 60 |
| W->D | 6 |
| W->L | 4 |
| D->W | 7 |
| D->D | 69 |
| D->L | 5 |
| L->W | 1 |
| L->D | 1 |
| L->L | 47 |

### V2 − unchanged

| Transition | Count (overall v6) |
| --- | --- |
| W->W | 36 |
| W->D | 26 |
| W->L | 8 |
| D->W | 13 |
| D->D | 58 |
| D->L | 10 |
| L->W | 0 |
| L->D | 8 |
| L->L | 41 |

Transition counts are descriptive, with no common higher/lower-is-better direction. [All contrast/endpoint/group transition matrices](https://ood-bouchet.ycrc.yale.edu/pun/sys/dashboard/files/fs//nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot/research/results/2026-09-25-command-budget-d1/visual_tables/transitions_full_audit.csv); [All map, country, faction, slot, direction and combined subgroup tables](https://ood-bouchet.ycrc.yale.edu/pun/sys/dashboard/files/fs//nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot/research/results/2026-09-25-command-budget-d1/visual_tables/all_tables_full_audit.csv).

V5 overall W/D/L: Unchanged 69/82/49; Capped V2 49/92/59; Unbounded D1 67/77/56. V6 remains primary. First-result ticks differ between v5/v6 in Unchanged 1; Capped V2 0; Unbounded D1 1 episodes. [All within-arm v5→v6 status/WDL transitions](https://ood-bouchet.ycrc.yale.edu/pun/sys/dashboard/files/fs//nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot/research/results/2026-09-25-command-budget-d1/visual_tables/measurement_full_audit.csv). Complete leave-one-topology-out and time distributions remain in [analysis.json](https://ood-bouchet.ycrc.yale.edu/pun/sys/dashboard/files/fs//nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot/research/results/2026-09-25-command-budget-d1/data/analysis.json).

## Action and deferral diagnostics

| Measure (descriptive) | Unchanged | Capped V2 | Unbounded |
| --- | --- | --- | --- |
| Observed updates | 3,503,065 | 3,765,375 | 3,481,604 |
| Candidate order calls | 313,259 | 234,996 | 293,686 |
| Order calls / 900 observed updates | 80.48 | 56.17 | 75.92 |
| Budget-denial updates | Not measured | 378,388 | 0 |
| Denied unit-ID occurrences | Not measured | 2,785,087 | 0 |
| Updates above reference 115 | Not measured | 0 | 871,747 |
| Maximum rolling order/debug calls | Not measured | 115 | 1296 |

Counts and rates here are descriptive: neither higher nor lower is inherently better, so they are not ranked. Rates divide by actual observed updates, not the horizon or first-result tick. Disabled arbiter diagnostics were not measured; missing telemetry is not zero. Deferred unit IDs count occurrences rather than unique units. Unbounded excursions above reference 115 are permitted, not cap violations.

[Every action/diagnostic group](https://ood-bouchet.ycrc.yale.edu/pun/sys/dashboard/files/fs//nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot/research/results/2026-09-25-command-budget-d1/visual_tables/actions_full_audit.csv); [All 600 episode-level action summaries](https://ood-bouchet.ycrc.yale.edu/pun/sys/dashboard/files/fs//nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot/research/results/2026-09-25-command-budget-d1/visual_tables/action_episodes_full_audit.csv). Budget removal changes trajectories as well as commands, so aggregate call counts do not establish a causal combat explanation. The retained ledger lacks full economic/army-composition/mission telemetry for diagnosing the next strategic bottleneck.

## Audit, failures, and accounting

Study source: `18dde712dac64b2f76ec5c91c4e87a7140db78a1`. Array 27365752, finalizer 27365753, independent audit 27472280 all completed on pi_jss233/day with one CPU and zero restarts. All 200 raw task identities and 600 launches were reconciled. [All 603 comparison allocation/batch/extern records](https://ood-bouchet.ycrc.yale.edu/pun/sys/dashboard/files/fs//nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot/research/results/2026-09-25-command-budget-d1/visual_tables/scheduler_full_audit.csv).

Comparison plus finalizer used 95.102 allocated CPU-hours (elapsed × CPU, not process CPU; excludes prior gates and audits). Finalizer elapsed 234 seconds. Independent audit elapsed 277 seconds, process CPU 237.848 seconds, MaxRSS 352,556 KiB.

Independent reconstruction: 600 ledgers, 1,538,730 records, 4,656,843,200 plain bytes, 57,073,138 compressed bytes. Maximum triplet 788,657 bytes; exactly 416 execution files. Limits remain 11 MiB gzip/arm, 512 MiB plain/arm, 4 MiB per ledger record and 32 MiB per triplet.

Exact launch ledger: 205 D1 zero-update definitions; 24 canary + 3 discarded-payload smoke + 600 competitive = 627 advancing episodes. Prior zero-update initializations 1,810; cumulative 2,015. Prerequisites: pure 27170183 (301 checks); selector 27185755; selector audit 27205041; canary 27213486/27213487; canary audit 27219415; smoke 27233318; smoke audit V2 27359254.

Preserved auditor failures: smoke audit 27335931 failed on an undefined hash helper; complete audit 27381273 failed on an incorrect scalar assumption for the structured zero-health-target summary. Both were corrected only in separately versioned offline auditors. Audit V2 passed 46 synthetic checks before the full 600-ledger reconstruction. No game was replayed by the engine. Initial array-parser and Slurm RSS-unit assumptions, rejected patch attempts, journals and exact repairs are also preserved.

[Complete-auditor failure and preservation receipt](https://ood-bouchet.ycrc.yale.edu/pun/sys/dashboard/files/fs//nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/unified-intent-arbiter-v2/d1/independent-audit-failure-v1.json); [Smoke-auditor failure receipt](https://ood-bouchet.ycrc.yale.edu/pun/sys/dashboard/files/fs//nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/unified-intent-arbiter-v2/d1/smoke-audit-failure-v1.json); [Complete independent auditor V2 and outputs](https://ood-bouchet.ycrc.yale.edu/pun/sys/dashboard/files/fs//nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/unified-intent-arbiter-v2/d1/independent-audit-v2). Historical OD1 selector failure and sealed V1 M2 population remain untouched.

The independent audit imports no production endpoint/analysis/finalizer/game modules. It reconstructs full observer first-results and evaluations from retained public building/events, not a new game simulation. Public action/state and per-update telemetry sequences were not retained beyond counts/digests. Their summaries are checksum-bound, not independently replayed raw actions. Smoke/canary payload-discard assertions likewise are not reconstruction of discarded games.

## Limits and next decision

D1 was informed by the complete negative OD1 result. It is development evidence, uses only Americans/Africans and first-two reciprocal starts, and tests Advanced on one topology. Do not compare these 24,000-update rates directly with historical 90,000-update results as identical populations. No favorable contrast/map/horizon, selective rerun, or ceiling search is authorized.

Retain the confirmed deployed policy. The next study must prospectively measure strategic production, force composition, attack coordination and mission completion under the permitted observation contract. Missing measurements require fresh registered identities and technical noninterference gates. Diagnose first, then test one supported policy change directly against unchanged StrongBot. Fresh broad validation and replication remain required before deployment or paper claims.

## Artifact index and reproduction

[Full 200-block identities with source/job/map/artifact hashes](https://ood-bouchet.ycrc.yale.edu/pun/sys/dashboard/files/fs//nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot/research/results/2026-09-25-command-budget-d1/visual_tables/identities_full_audit.csv); [Full lineage and absolute source paths](https://ood-bouchet.ycrc.yale.edu/pun/sys/dashboard/files/fs//nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot/research/results/2026-09-25-command-budget-d1/visual_tables/lineage_full_audit.csv); [Generated file checksums](https://ood-bouchet.ycrc.yale.edu/pun/sys/dashboard/files/fs//nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot/research/results/2026-09-25-command-budget-d1/artifact-index.json).

Aggregate SHA-256 `8bd48913a5353ef830b965f862876cd2d814599b7341314310b2d56caf2da14b` — [immutable complete aggregate](https://ood-bouchet.ycrc.yale.edu/pun/sys/dashboard/files/fs//nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/unified-intent-arbiter-v2/d1/execution-v1/finalizer/record.json). Independent audit SHA-256 `6f9e3f0ec79965d52c1e07cd9fe532d7f8e2e87fc95e672bd22d2d70ce254c4c`; controller verification `96d3bb74741509a8cab86f45d6d45040c3f8ff87f0177f3bfc48a6320e3a5f79`.

Internal report only. The manuscript and deployment configuration were not edited. Rebuild with Node 20.13.1 and the existing project canvas dependency:

```bash
cd /nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot
node research/scripts/build-d1-result-report.mjs
node research/scripts/validate-d1-result-report.mjs
```
