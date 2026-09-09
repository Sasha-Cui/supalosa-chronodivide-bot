# Unified intent arbiter V1 Gate 2: complete result

Date: 2026-09-09

## Disposition

Disabled live equivalence passed exactly. All 180 unwrapped versus explicitly
disabled pairs had identical candidate actions, opponent actions, and five
public-state snapshots through update 3,600.

This proves that the dormant arbiter integration does not change behavior on
the frozen Gate 2 population. It does not test an enabled ceiling and does not
establish policy strength.

## Preserved pregame failures

Two manifest attempts failed before simulator initialization:

| Job | Cause | Output |
|---:|---|---|
| 25678716 | literal patch separators in Node wrapper | no runner, game, or manifest |
| 25684187 | wrong field names for frozen asset entries | no cdapi init, game, or manifest |

Their empty execution roots, logs, exact source/hashes, and prospective A6/A7
repairs are preserved in commits 32669bf and de77e6b. Neither attempt used a
reserved seed.

## Seed separation

Complete audit 25480245 and certificate 25670843 selected base 3,350,000,000
before any Gate 2 initialization. The immutable seed result is commit
0c90ba2.

- full audit SHA-256:
  6e83a8d51597236dbf1fe80d22262b40bfc737dc6234c68a94853af5ddfaf52a
- compact certificate SHA-256:
  f7f7086d32630b1eede7a300a382a9348d60f610c1768c300cb3818f738307fd
- deterministic 2,048-file sample SHA-256:
  48dc1d32bfa49dd823c2f98dcc698a8e26ff07c404e2dfd15808cb7287b2f844

## Frozen live identity

- source:
  6577ae2498493a6d0acd946e073a70dce78a8ae2
- program SHA-256:
  9738024dce43c5c94f86afc37c2df0bd7c4eab761d790285709fa8e3353712de
- manifest Slurm SHA-256:
  9e17ed3410e051274aa95f42b828c5a3711c2fc5d5940401d88001b6f37032bf
- trace Slurm SHA-256:
  c836e7c4d604f754fe9f910d5ef281d02640e4391b5f8bfa5fb969536b70c4bf
- finalizer Slurm SHA-256:
  2e68b1c48bb7dc15f345b86f887c5651678d93ce3434e2b987531ed9cc57df52
- manifest SHA-256:
  e3f952fd9e81b04baaade58f27d26135c768e1d8282de503bd15f15654845508
- aggregate SHA-256:
  575e626b8e08ec71ecd0cdad145068be666ff8b5a25f90bc24efb8017000d300

## Scheduler ledger

| Stage | Job | State | Scope |
|---|---:|---|---|
| zero-update selector | 25694666 | COMPLETED 0:0 | 180 cases / 360-task manifest |
| fixed-horizon smoke | 25707221 | COMPLETED 0:0 | task 0 |
| paired array | 25707410 | 360/360 COMPLETED 0:0 | tasks 0–359, throttle 64 |
| fail-closed finalizer | 25707411 | COMPLETED 0:0 | complete population |

Every array task used pi_jss233/day, one CPU, zero GPU, and zero restart. All
360 scheduler job IDs and array labels are unique. There were no retries,
exclusions, or replacements. Array elapsed seconds summed to 14,205
(3.9458 CPU-hours), with a per-task range of 18–78 seconds.

## Population

The 180 paired cases comprise:

- five maps/topology families: HFO LE, Peak of Perfection, Tour of Egypt,
  South Pacific, and Pacific Heights;
- two frozen directed start orientations per map;
- all nine countries;
- candidate slots 0 and 1;
- 36 pairs per map;
- 20 pairs per country;
- 90 pairs per slot; and
- 180 unique seeds 3,350,000,000 through 3,350,000,179.

Each case ran an unwrapped StrongBot and an explicit intentArbiter enabled:false
StrongBot against the same pinned external Supalosa baseline, with identical
map, country, start, slot, and engine/bot seed.

## Technical trace

Every successful task:

- reached exactly update 3,600;
- stored snapshots at 0, 900, 1,800, 2,700, and 3,600;
- forwarded every request across all 15 ActionsApi methods, including quit;
- recorded candidate/opponent action hashes and exact per-method counts;
- recorded public player, power, credit, queue, own-unit, and visible-enemy
  state;
- retained exact source/runtime/map/certificate/manifest/scheduler identity;
- emitted no arbiter telemetry; and
- passed recursive prohibited-field rejection.

The task-0 smoke trace had SHA-256
c17ab55794a5bbb9f22ba0bcbe31d93d4b4e6123b901798bda2fb29c15ee0c9c,
38,121 bytes, 526 candidate action calls, 128 opponent calls, and all five
snapshots.

## Exact pair result

For every one of 180 cases, the two arms were exactly equal on:

- candidate action hash/count/per-method counts;
- opponent action hash/count/per-method counts;
- all five full normalized snapshots;
- trajectory hash;
- production queues, credits, unit inventories, and public object fields;
- starts, seed, map, country, slot, and fixed update count; and
- absence of arbiter telemetry.

There were zero mismatch overall and zero mismatch in each map, direction,
country, and slot stratum. Pair ledger SHA-256 is
f7013cf25ed6da711446cea39411f80012f022cdce0295fb116dcb0eb557a173.
Scheduler ledger SHA-256 is
627f334c461d89303bd7a32ace2664bcb74a8d68cd61cd256f3096ac7fab55bd.

The execution contains exactly 731 files, below the frozen 1,000-file cap.

## Scientific boundary

Gate 2 is a positive compatibility result only. The arms deliberately have no
active intervention, and no W/D/L, score, endpoint, defeated state, terminal
building count, or ranking was generated. Exact equality must not be described
as an improvement.

## Advancement

Gate 2 is closed positive. Gate 3 may now be frozen and implemented to test
enabled ceilings 75/150/300 versus disabled on fixed outcome-blind horizons
across all 15 physical maps and all ten Advanced HFO variants. No competitive
endpoint is authorized until Gate 3 passes its complete technical gates.
