# Unified intent arbiter V1 Gate 3 B1: ceiling-150 compatibility

Date: 2026-09-12

Status: **PASS — ceiling 150 is technically eligible for M2 development**

B1 establishes full outcome-blind compatibility for the only arbiter ceiling
that survived the A1 budget diagnostic. It does not establish that enabling
the arbiter improves competitive performance.

## Bound design and source

- B1 protocol and A1 result: commit `b91c406`
- B1 plan, runner, tests, and Slurm implementation: commit `7fda22f`
- Source branch: synchronized `main` / `fork/main`
- Fresh seeds: `3,350,102,000`–`3,350,102,899`
- Unique cases: 900
- Packed tasks: 925, including 25 deterministic duplicates
- Sequential arm traces: 1,850
- Arms: disabled, then ceiling 150
- Horizon: 3,600 updates and five snapshots per arm
- Population: pinned Supalosa on all 15 maps and pinned RA2Web Advanced on
  the ten HFO maps, both directions, all nine countries, and both slots

This seed namespace is disjoint from Gate 2, Gate 3 A0, and diagnostic A1.

## Prerequisite stages

| Stage | Job | Result |
|---|---:|---|
| Current-source pure gate | 25937247 | 10 focused files / 123 tests plus one runtime-schema test passed |
| Zero-update manifest | 25948079 | exact 900 cases / 925 tasks / 1,850 traces passed |
| Preserved two-arm smoke | 25965836 | both arms reached 3,600 updates and five snapshots |

Artifact identities:

- pure gate SHA-256:
  `11320a6111387ae0aa68e2ee4b3132d6a17a87c36d95d0de2701eee723fd2ba2`
- manifest SHA-256:
  `e675cb0d326addc59085bd34aa14cfa614a38ae7e2538c27465370737b73bca7`
- smoke case SHA-256:
  `ddf141de1cf5adbc74085e17f85db4153171ff2ebd2f53adfc9bc2332e2edb19`

The smoke's ceiling-150 trace reached the exact 115-order cap while its maximum
rolling total was 130 and maximum forwarded chunk was 11. It had zero reserve,
total, validation, production-atomicity, or one-forward violation. These are
technical observations only.

## Complete execution

- Array: `25977692`, exact `0-924%64`
- Finalizer: `25977693`, submitted `afterok` and completed cleanly
- Account/partition: `pi_jss233/day`
- Resources: one CPU and 8 GiB per case task; no GPU
- Array tasks: 925 `COMPLETED`
- Unique scheduler job IDs: 925
- Restarts, retries, replacements, and exclusions: zero
- Complete traces: 1,850
- Exact duplicate tasks: 25/25 for both arms
- Final files: 1,863, below the frozen 2,000-file limit
- Aggregate SHA-256:
  `3568c913b720471ddbe8705d8fa3c0f406fda199d09365d627c2748bf1a68630`

All 925 enabled traces passed:

- exact ceiling 150, reserve 35, and order cap 115;
- 3,600 updates and five snapshots;
- zero gameplay-reserve and total-ceiling overflow update;
- zero multiple-forward, forwarded-validation, and partial-production-batch
  violation;
- rolling total at most 150 and rolling order calls at most 115;
- forwarded chunks of at most 128 IDs;
- valid source, program, runtime, map, opponent, assignment, scheduler, action,
  trajectory, snapshot, and telemetry identities; and
- recursive absence of competitive fields.

Every disabled trace emitted no arbiter telemetry and passed its corresponding
fixed-horizon, identity, and action/trajectory checks.

## Complete-population mechanism evidence

| Quantity | Ceiling 150 total or maximum |
|---|---:|
| Enabled traces | 925 |
| Proposed calls | 250,057 |
| Forwarded order calls | 207,407 |
| Same-unit conflicts | 270,174 |
| Duplicate suppressions | 5,525 |
| Deferred unit IDs | 1,198,247 |
| Updates with deferral | 175,476 |
| Maximum rolling total calls | 150 |
| Maximum rolling order calls | 115 |
| Maximum forwarded chunk size | 24 |

The mechanism was therefore live rather than vacuous: it observed conflicts,
suppressed retries, and deferred work while reaching but never crossing the
frozen caps. These quantities do not imply better play.

## Audit outputs

- `cases.csv` SHA-256:
  `737875318bd9d0764205e65ef4676de618437583dd8b1954f96ffdb6b3f84408`
- `duplicates.csv` SHA-256:
  `8a7a33e1daa5831937e97f7c666f3868195c7d95af48ec6e39f15f9cf9c9cbca`
- `scheduler.csv` SHA-256:
  `b3c1616f8885d8dacb1b92a169e1f1494c805d836254653afa1e580709eb1b05`

An independent post-finalizer audit rehashed every finalizer output, confirmed
the 1,863-file count, 925 unique completed scheduler rows, two 925-row arms,
25 exact duplicate rows, and all complete-population mechanism gates.

## Interpretation and advancement

Gate 3 B1 passes. Ceiling 150 is technically compatible across every frozen
map/opponent/country/start/slot case and may enter a separately frozen M2
open-development outcome screen against the disabled arm.

This result must not be reported as a win-rate improvement. B1 contains no
W/D/L, score, endpoint orientation, defeated side, terminal building count, or
competitive ranking. The rejected ceilings 75 and 300 remain rejected, and
the reserve of 35 remains unchanged.
