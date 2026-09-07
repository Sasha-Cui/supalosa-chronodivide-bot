# Outcome-blind action-burst diagnostic V1: complete result

Date: 2026-09-07

## Disposition

The complete 1,717-trace action-burst diagnostic passed every frozen
technical, provenance, storage, scheduler, and determinism gate. It generated
no competitive outcome.

The frozen gameplay-nonorder reserve is:

R = max(8, ceil(31) + 4) = 35.

Because 35 is below the smallest prespecified total ceiling of 75, the frozen
ceiling grid 75/150/300 remains technically feasible. This diagnostic does not
select among those ceilings and does not establish that an arbiter improves
gameplay.

## Scientific boundary

This was an outcome-blind fixed-horizon interface diagnostic. Every trace ran
exactly 3,600 engine updates. The artifacts contain action-request timing and
bounded public-argument metadata, but no W/D/L, score, endpoint, defeated
state, game-finish orientation, terminal building count, or policy ranking.

Rates below are public API requests. They are not human APM, effective actions,
or evidence of causal performance.

## Frozen identity

- source commit:
  7a10c4b844b36974ebcc0f809dccc0001719c8e3
- program SHA-256:
  dc8da6b7644614d7744890c8ec0fd5baf9c02d22a209996d0a7f91631e0515cf
- parent protocol SHA-256:
  a07abda852b03a3904e364235dd50672aa9885fdf1062c7e1865e0695dc636b7
- Amendment A7 SHA-256:
  e11383b0b0e0f89447c44e420f4482d07f0a0a3b9916d250b4ecf17d49d5f75c
- trace Slurm SHA-256:
  b631a9e24fc4486adea83019e228c1bf2da5d247439e1352f7c4c23b2a3e475c
- finalizer Slurm SHA-256:
  34aeb14fb4412d423752c85356989d282d6475a34960d9490a31472ba25c2235
- manifest SHA-256:
  ab4def0eafc17678c29be0d82f96f191428ea5d8871a1daa90fcd56cc5dc2515
- selected seed-audit SHA-256:
  ac9c2100702750270e4bc9df311fbdff62aca29a933687e44d16d18f7318a231
- selected seed-certificate SHA-256:
  e53ce72c0fa6fbe56151cf20a11cfd414e0ca88760f02f87e92ee98d36cc3165

The selected unsigned seed interval was
[3,010,000,000, 3,011,000,000). The manifest contained 846 distinct seeds:
821 appeared exactly twice for reciprocal-slot pairing and 25 appeared exactly
three times because of the frozen deterministic duplicate.

## Scheduler ledger

| Stage | Job ID | State | Exact scope |
|---|---:|---|---|
| zero-update manifest | 25243670 | COMPLETED 0:0 | 1 manifest |
| outcome-blind smoke | 25244225 | COMPLETED 0:0 | task 0 |
| technical array | 25244855 | 1,717/1,717 COMPLETED 0:0 | tasks 0–1,716, throttle 64 |
| fail-closed finalizer | 25244856 | COMPLETED 0:0 | complete aggregate only |

All 1,717 array allocations used account pi_jss233, partition day, one CPU,
zero restart, and a unique scheduler job ID. There were no retries,
exclusions, or replacement traces. Array elapsed time summed to 52,371 CPU
seconds (14.5475 CPU-hours); the per-trace median was 26 seconds and the range
was 13–118 seconds.

## Population and completeness

- 15 physical maps and five topology families;
- all 56 Supalosa directed starts, all nine countries, and both slots;
- all 38 Advanced HFO directed starts, all nine countries, and both slots;
- 1,008 Supalosa base traces and 684 Advanced base traces;
- 25 exact deterministic duplicates;
- 1,717 traces total, each reaching update 3,600;
- 68,680 trace-metric rows;
- 741,200 distribution-summary rows;
- 8,160 weighted-summary rows;
- all 25 duplicate comparisons passed exact trace/action determinism;
- recursive prohibited-field audit passed.

Every successful cell contains exactly trace.jsonl.gz and COMPLETE.
Compressed traces total 21,340,631 bytes. The execution contains exactly 3,451
files after finalization, below the frozen 4,000-file cap.

## Aggregate action findings

Across the matched fixed horizons:

| Side | All requests | Order requests | Gameplay-nonorder | Debug/communication | Ordered unit IDs |
|---|---:|---:|---:|---:|---:|
| StrongBot candidate | 628,299 | 437,934 | 59,185 | 131,180 | 970,732 |
| opponent baseline | 255,752 | 96,144 | 50,314 | 109,294 | 148,639 |

Neither side made an initialization-label request in this population, and
neither side attempted a suppressed quit. Amendment A7 nevertheless makes the
clock boundary explicit and prevents initialization calls from determining a
future reserve.

Game-equal summaries for all action classes combined were:

| Side | Mean live requests/900 | Median | 95th percentile | Maximum | Mean maximum rolling-900 |
|---|---:|---:|---:|---:|---:|
| StrongBot candidate | 91.4821 | 87.0 | 145.75 | 707.5 | 188.9458 |
| opponent baseline | 37.2382 | 36.0 | 68.0 | 84.25 | 75.5999 |

The candidate's maximum all-action rolling window contained 2,543 requests,
including 2,492 orderUnits requests. It occurred in frozen task 56 on HFO LE
for Confederation from 39,82 against 151,119, candidate slot 0. The
candidate's largest same-update burst was 51 requests in frozen task 1,456
against Advanced on HFO Corners B.

These extremes reinforce the engineering motivation for deterministic
per-unit intent arbitration, grouping, and bounded deferral. They do not show
that lowering request volume will improve wins.

## Reserve witness

The largest live rolling-900 gameplay_nonorder count was 31. Its immutable
witness is task 786:

- candidate side;
- pinned Supalosa opponent;
- Tour of Egypt;
- Africans;
- candidate start 72,22, opponent start 91,41;
- candidate slot 0.

The candidate game-equal median for this class was 13, its 95th percentile was
20, and its maximum was 31. The baseline median was 11, its 95th percentile
was 20, and its maximum was 27. The frozen maximum-plus-four rule therefore
sets the protected reserve to 35.

## Artifact ledger

- aggregate JSON SHA-256:
  d56b069aff40c7890c5f9cd4552b1ae42392a625cd97b7d7a34ecd7aa9208b0b
- trace metrics SHA-256:
  19959f742aca130d5ddbf0788dc5dc9672b2c911115916a09857b7d242f07446
- distribution summaries SHA-256:
  489825dfec6d0e41c8af30152c17ce0a4f22b4cb9736430134d22daa778457e4
- weighted summaries SHA-256:
  414c51c721d12ff0f8ae13d551e9c1027f48923b3a0ff8aa73b203c082d4a23b
- scheduler ledger SHA-256:
  626cd6666fd561907f3b19c839eaa4242f3923b6407b98738aa5ba5e4a5b4e60
- reserve JSON SHA-256:
  7f51166888ebb52609a209103a6f94bce78f8e020ed527f45267d296217c9ac4

Independent post-finalization checks rehashed every aggregate output and
sidecar, verified the 1,717-row scheduler ledger and zero-restart accounting,
rederived the 31-call reserve witness and R=35, checked all aggregate row
counts, and confirmed the exact 3,451-file execution budget.

## Decision

The action-burst diagnostic is closed positive as a technical measurement
stage. Proceed to the prospectively specified unified intent arbiter using
protected gameplay-nonorder reserve 35 and total ceilings 75/150/300. Keep all
competitive endpoints sealed until the arbiter, final-building race, symmetric
observation firewall, telemetry, and technical compatibility gates pass.
