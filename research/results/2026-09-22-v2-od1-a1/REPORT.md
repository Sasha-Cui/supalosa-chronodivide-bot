# V2 OD1 A1 — complete, independently audited negative development result

Date: 2026-09-22. Internal research record, not a manuscript or a deployment approval.

## Executive answer

Reject the V2 challenger and retain unchanged StrongBot. All 900 pairs (1,800 games) completed technically, and an independent implementation reproduced both endpoints from every ledger, all summary tables, every bootstrap digest, and all frozen gates. Technical success did not translate into improved play.

Across 900 games per policy, literal wins fell from **308 to 216**; draws rose from 404 to 471 and losses from 188 to 213. Both opponent-specific paired scores were worse. M2 is not complete and the manuscript remains frozen.

## Configuration and decision

| Component | Setting / status |
| --- | --- |
| Reference | Unchanged deployed StrongBot; arbiter explicitly disabled; retained |
| Challenger | V2 separated lanes; 115 order/debug calls per rolling 900 updates; rejected |
| Essential lane | Uncapped and measured; no forwarded resignations |
| Population | 900 pairs; 9 countries; 2 slots; reciprocal first two starts |
| Primary / secondary metric | Live-owned v6 / passive v5; immutable first results |
| Horizon | 24,000 updates; not the historical 90,000-update population |
| Component-specific effects | Untested here; only the complete V2 component was compared |

## Primary result

Compare policies within each row: higher score is better; bold marks the policy with the higher score (including ties). W/D/L are wins/draws/losses, not a scalar to optimize jointly.

| Population | Pairs | Unchanged W/D/L | V2 W/D/L | Score Δ | 90% lower |
| --- | --- | --- | --- | --- | --- |
| overall | 900 | **308/404/188** | 216/471/213 | -6.50 pp | -8.83 pp |
| supalosa | 540 | **201/184/155** | 140/239/161 | -6.20 pp | -8.98 pp |
| advanced | 360 | **107/220/33** | 76/232/52 | -6.94 pp | -10.97 pp |

Full audit: [population metrics](https://ood-bouchet.ycrc.yale.edu/pun/sys/dashboard/files/fs//nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot/research/results/2026-09-22-v2-od1-a1/visual_tables/populations_full_audit.csv). Source: [immutable aggregate](https://ood-bouchet.ycrc.yale.edu/pun/sys/dashboard/files/fs//nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/unified-intent-arbiter-v2/od1/execution-a1/finalizer/record.json).

## Map breadth

Complete map-stratum point effects are also shown in [the paired-score figure](https://ood-bouchet.ycrc.yale.edu/pun/sys/dashboard/files/fs//nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot/research/results/2026-09-22-v2-od1-a1/visual_figures/map-score-difference.png).

| Opponent / map | Unchanged score | V2 score | Δ |
| --- | --- | --- | --- |
| pinned_supalosa__hfo-bvb | **0.4583** | 0.4167 | -4.17 pp |
| pinned_supalosa__hfo-corners | **0.5278** | 0.4028 | -12.50 pp |
| pinned_supalosa__hfo-corners-b | **0.4861** | 0.4444 | -4.17 pp |
| pinned_supalosa__hfo-corners-b-golden | **0.5278** | 0.3194 | -20.83 pp |
| pinned_supalosa__hfo-golden | **0.6250** | 0.5000 | -12.50 pp |
| … full 25 strata linked below … | … | … | … |
| ra2web_advanced__hfo-le | 0.5417 | **0.5694** | +2.78 pp |
| ra2web_advanced__hfo-lvl | 0.4722 | **0.5139** | +4.17 pp |
| ra2web_advanced__hfo-original | **0.6528** | 0.5278 | -12.50 pp |
| ra2web_advanced__hfo-rvr | **0.5694** | 0.5556 | -1.39 pp |
| ra2web_advanced__hfo-tvt | **0.7222** | 0.6111 | -11.11 pp |

Compare policy scores within each row; higher is better and ties are bolded on both sides. This alphabetical first-five/last-five excerpt is not a favorable subset. [All 25 strata, W/D/L, statuses and effects](https://ood-bouchet.ycrc.yale.edu/pun/sys/dashboard/files/fs//nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot/research/results/2026-09-22-v2-od1-a1/visual_tables/strata_full_audit.csv).

Point score changes were negative in 20 of 25 strata and positive in 5. Favorable cells do not rescue failed pooled or safety gates; none authorizes deployment.

## Uncertainty and frozen gates

| Grouping | Clusters | Score Δ | One-sided 90% lower |
| --- | --- | --- | --- |
| overall | 25 | -6.50 pp | -8.83 pp |
| supalosa | 15 | -6.20 pp | -8.98 pp |
| advanced | 10 | -6.94 pp | -10.97 pp |
| topology | 5 | -6.50 pp | -7.58 pp |
| supalosaCountryDirection | 18 | -6.20 pp | -8.52 pp |
| advancedCountryDirection | 18 | -6.94 pp | -9.17 pp |

Each bound is the frozen one-sided 90% lower bound for enabled-minus-disabled paired score. These are different uncertainty groupings, not competing methods with a best number. A negative lower bound fails a positive-lower-bound gate; it is **not**, by itself, a two-sided test proving harm.

Bootstrap: 200,000 replicates, unbiased SHA-256 counter-mode index sampling, fixed named streams and empirical sorted index 20,000. All sampled-index and ordered-statistic hashes reproduced exactly. [Full uncertainty audit](https://ood-bouchet.ycrc.yale.edu/pun/sys/dashboard/files/fs//nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot/research/results/2026-09-22-v2-od1-a1/visual_tables/uncertainty_full_audit.csv).

Only catastrophic-transition safety passed among the 13 broad-development checks; the other 12 failed. Absolute Advanced eligibility also failed: V2 had more wins than losses but its pooled win lower bound was 18.49%, below 50%. [Every gate](https://ood-bouchet.ycrc.yale.edu/pun/sys/dashboard/files/fs//nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot/research/results/2026-09-22-v2-od1-a1/visual_tables/gates_full_audit.csv).

Group-specific point score changes (V2 minus reference; higher is better): Allied -8.30 pp; Soviet -4.25 pp; Slot 0 -6.89 pp; Slot 1 -6.11 pp. All five leave-one-topology-out score point effects are negative. Full strata and subgroup tables are in [analysis.json](https://ood-bouchet.ycrc.yale.edu/pun/sys/dashboard/files/fs//nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot/research/results/2026-09-22-v2-od1-a1/data/analysis.json).

## Error decomposition and mechanism hypotheses

| Unchanged → V2 | Count |
| --- | --- |
| W->W | 163 |
| W->D | 121 |
| W->L | 24 |
| D->W | 43 |
| D->D | 312 |
| D->L | 49 |
| L->W | 10 |
| L->D | 38 |
| L->L | 140 |

121 reference wins became draws; 24 became losses. Conversely, 43 draws and 10 losses became wins. These account for the net loss of 92 wins. [All 900 paired identities and v5/v6 outcomes](https://ood-bouchet.ycrc.yale.edu/pun/sys/dashboard/files/fs//nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot/research/results/2026-09-22-v2-od1-a1/visual_tables/pairs_full_audit.csv).

| Descriptive measure | Unchanged | V2 |
| --- | --- | --- |
| Public order calls | 1,417,015 | 1,098,320 |
| Order calls / 900 observed updates | 79.49 | 57.87 |
| Essential calls | 142,837 | 143,315 |
| Games reaching cap | Not applicable | 837/900 |
| Updates with deferral | Not applicable | 1,718,833 |
| Deferred unit-ID occurrences | Not applicable | 12,030,126 |

Action counts are descriptive exposure measures: neither higher nor lower is inherently better, so no best value is highlighted. Different trajectory lengths and policy-induced game states affect them. Deferred unit IDs count repeated occurrences, not unique units. Disabled deferral telemetry is unavailable by design, not zero. [Full action summary](https://ood-bouchet.ycrc.yale.edu/pun/sys/dashboard/files/fs//nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot/research/results/2026-09-22-v2-od1-a1/visual_tables/actions_descriptive_full_audit.csv).

The cap was reached in 837/900 V2 episodes, making command gating a reasonable next hypothesis. This study does **not** separate budgeting from priority arbitration, grouping, validation, duplicate suppression or pending-intent expiry. Fewer orders alone is not evidence of why wins were lost. A fresh, prospectively defined component ablation is needed.

## Secondary measurement audit

V5 overall W/D/L: unchanged 305/407/188; V2 215/473/212. V6 is primary throughout; no endpoint substitution or favorable measurement choice was made. Full per-stratum endpoint/status transitions and first-result-time changes are retained in [analysis.json](https://ood-bouchet.ycrc.yale.edu/pun/sys/dashboard/files/fs//nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot/research/results/2026-09-22-v2-od1-a1/data/analysis.json).

## Reproducibility and integrity

- Frozen study source: `5d466599937d966b6dcc80fa2f4c9add7da767fd` on main. Parent protocol `63ba0a1`; prospective metadata/seed amendment `249bdd7`.

- Jobs: pure 26539082; selector 26539451; canary 26561442 and finalizer 26561443; smoke 26584493; comparison 27061644 and finalizer 27061645; independent audit 27089677.

- All 900 comparison tasks and finalizer: pi_jss233/day, one CPU each, zero restarts, successful exit. [Exact scheduler identities](https://ood-bouchet.ycrc.yale.edu/pun/sys/dashboard/files/fs//nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot/research/results/2026-09-22-v2-od1-a1/visual_tables/scheduler_full_audit.csv). Comparison plus finalizer consumed 307.086 allocated CPU-hours (elapsed × one CPU, not measured process CPU time). Independent audit took 492 seconds / one CPU.

- Independent audit: 1,800 ledgers; 4,423,193 records; 13,360,099,212 uncompressed bytes; 163,590,626 compressed bytes. Maximum paired artifact 560,700 bytes; complete execution 1,816 files.

- A1 launched 905 zero-update initializations, 16 canary games, 2 discarded-payload smoke games and 1,800 comparison games. The failed predecessor selector's 905 zero-update calls remain preserved: 1,810 cumulative initializations. No games were selectively rerun or excluded.

- The 14 approved housekeeping path changes were backed up, temporarily reverse-applied, and restored byte-for-byte after all jobs and audits finished. [Preservation and restoration receipts](https://ood-bouchet.ycrc.yale.edu/pun/sys/dashboard/files/fs//nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/unified-intent-arbiter-v2/od1/housekeeping-preservation-ep6e7I). No policy or scientific gate was changed to bypass the launch check.

Independent audit program imports no production endpoint, finalizer or analysis modules. It reconstructs observer decisions from retained public building/event evidence, not a fresh game-engine simulation. Raw public action sequences were not retained; their digests and counts are checksum-bound. [Independent audit source and outputs](https://ood-bouchet.ycrc.yale.edu/pun/sys/dashboard/files/fs//nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/unified-intent-arbiter-v2/od1/independent-audit-v1).

## Limits and next decision

- Open-development evidence, not a confirmatory or unseen-map result. Only the first two starts in reciprocal orientations were tested.

- 25 opponent-map strata span only five topology groups. Advanced was tested on ten related HFO variants, not ten independent topologies; five-group uncertainty itself has few clusters.

- The 24,000-update horizon, start population and seeds differ from the historical 90,000-update HFO result. The rates must not be directly compared as if the population were unchanged.

- Public api_full_state observation mode; no fog-of-war parity claim. Opponent ancestry/provenance limits remain those recorded by the project errata.

- Preserve the full negative comparison. Do not deploy V2, select its favorable maps as a winner, extend completed games to rescue it, or begin the paper.

- Next: freeze a fresh component diagnostic comparing unchanged control, original V2, and the same arbitration with command-budget gating removed. Determine whether the cap explains regression before further optimizer expansion; require new technical validation and an outcome-blind population commitment.

## Artifact index and reconstruction

- Aggregate SHA-256: `809956a766dff0f4f6b80d27ac9fffd3dc45f3acd498c96264c129ecb0c398f0` — [immutable aggregate](https://ood-bouchet.ycrc.yale.edu/pun/sys/dashboard/files/fs//nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/unified-intent-arbiter-v2/od1/execution-a1/finalizer/record.json).

- Independent audit SHA-256: `7ea6954787f20e430f2fcb327b65dac892ee01935ca25ae74964ba800c876fd4` — [audit.json](https://ood-bouchet.ycrc.yale.edu/pun/sys/dashboard/files/fs//nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/unified-intent-arbiter-v2/od1/independent-audit-v1/output/audit.json).

- Source manifest SHA-256: `a595d73b1e06c01e4212add30d19083d6260836cf30b2a2d90fd37762ab99b67` — [manifest](https://ood-bouchet.ycrc.yale.edu/pun/sys/dashboard/files/fs//nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/unified-intent-arbiter-v2/od1/execution-a1/manifest/record.json).

- Full raw paired artifacts: [pairs](https://ood-bouchet.ycrc.yale.edu/pun/sys/dashboard/files/fs//nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/unified-intent-arbiter-v2/od1/execution-a1/pairs). [Machine-readable analysis](https://ood-bouchet.ycrc.yale.edu/pun/sys/dashboard/files/fs//nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot/research/results/2026-09-22-v2-od1-a1/data/analysis.json) and [audit copy](https://ood-bouchet.ycrc.yale.edu/pun/sys/dashboard/files/fs//nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot/research/results/2026-09-22-v2-od1-a1/data/independent-audit.json).

Rebuild from the immutable inputs with Node 20.13.1 and the project's canvas dependency:

```bash
cd /nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot
node research/scripts/build-v2-od1-result-report.mjs
node research/scripts/validate-v2-od1-result-report.mjs
```
