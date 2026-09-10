# Unified intent arbiter V1 Gate 3: failed complete-population attempt

Date: 2026-09-10

Status: **FAIL — no Gate 3 advancement**

This document preserves the first frozen Gate 3 execution. It is a technical,
outcome-blind failure record. It does not estimate policy strength and does not
authorize M2 competitive evaluation.

## Bound design and source

- Protocol commit: `faf2592`
- Telemetry implementation: `47d3011`
- Plan and reducer: `94ddf2e`
- Runner and Slurm implementation/source commit: `e1c3c73`
- Gate 1 result: `2347171`
- Gate 2 result: `baf5ddc`
- Pure-gate job: `25778123`
- Pure artifact SHA-256:
  `de7869e0d0021007b1606e6e6784ec200ecc9f427c97a1e63474f484739a3a93`
- Manifest job: `25791601`
- Manifest SHA-256:
  `19318cb9b9b06dfeb2e86dcdf2ed34cce550c77831c67c12984698341d279c4b`
- Preserved smoke job: `25820215`
- Smoke case SHA-256:
  `49d7e3710e7d50bbec07520d1b39bfcd0dab31b9a8ea0b2e0dadaf38c601a0e5`

The pure gate passed the build, 115 focused semantic tests, and one runtime
schema test. The zero-update manifest independently passed the exact 900-case,
925-task, 3,700-trace, map, opponent, country, start, slot, seed, hash, and
prohibited-field checks. The four-arm smoke passed every per-arm technical
gate. None of these artifacts contains a competitive endpoint.

## Scheduler result

- Array: `25831840`, exact frozen specification `0-924%64`
- Finalizer: `25831841`, submitted with `afterok:25831840_*`
- Account/partition: `pi_jss233/day`
- Per-task resources: one CPU, 8 GiB, no requeue
- Restarts: zero for every recorded task
- Array scheduler states: 907 `COMPLETED`, 18 `FAILED`
- Finalizer state: `CANCELLED` by its invalid dependency
- Cell directories: 925
- Complete cell markers: 907
- Generic failure artifacts: 18
- Complete aggregate: absent, as required by the fail-closed design

The 18 failed array elements and their unique scheduler job IDs were:

| Task | Job ID | Elapsed seconds |
|---:|---:|---:|
| 18 | 25831868 | 119 |
| 19 | 25831869 | 139 |
| 20 | 25831870 | 129 |
| 21 | 25831871 | 113 |
| 22 | 25831872 | 112 |
| 23 | 25831873 | 131 |
| 24 | 25831874 | 142 |
| 25 | 25831875 | 118 |
| 26 | 25831876 | 112 |
| 27 | 25831877 | 124 |
| 406 | 25833061 | 50 |
| 407 | 25833063 | 57 |
| 408 | 25833064 | 53 |
| 409 | 25833065 | 56 |
| 410 | 25833066 | 50 |
| 411 | 25833067 | 55 |
| 412 | 25833068 | 55 |
| 413 | 25833069 | 50 |

Every failed task wrote only the frozen generic failure schema with
`stage: fixed_horizon` and `errorType: Error`. No message, arm identity,
update of failure, game state, or competitive orientation was serialized.

## Failure strata

Manifest metadata identifies two systematic groups:

- tasks 18–27: pinned Supalosa, HFO LE, direction 1, all five Allied
  countries, both candidate slots;
- tasks 406–413: pinned Supalosa, Tour of Egypt, direction 0, all four Soviet
  countries, both candidate slots.

This pattern is useful for a technical diagnosis but is not itself evidence of
which code path failed. The generic schema deliberately cannot distinguish an
early engine finish from a telemetry, trace, or post-trace contract failure.

## Inspection boundary

No successful array case JSON was opened or analyzed. No partial-population
action, trajectory, or telemetry statistic was used. Only scheduler accounting,
file/marker counts, generic failure artifacts, and the frozen manifest metadata
were inspected.

## Decision

Gate 3 did not pass. The 907 successful tasks cannot be treated as a selected
subset, the 18 failed tasks cannot be rerun as if they completed the original
population, and the canceled finalizer cannot be replaced for this execution.
M2 remains sealed.

A fresh, prospectively frozen outcome-blind diagnostic must identify the
technical failure class before any repair. It must use new seeds and a complete
balanced crossing rather than only the 18 failed cells. The original execution
and all of its artifacts remain immutable.
