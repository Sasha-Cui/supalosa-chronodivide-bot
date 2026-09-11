# Unified intent arbiter V1 Gate 3 A1 failure-class diagnostic

Date: 2026-09-11

Status: **diagnostic complete; Gate 3 remains failed**

The complete A1 population identifies the first Gate 3 failure as a rolling
budget-contract failure, not an early engine finish, trace failure, or setup
failure. This is outcome-blind technical evidence. It does not select a policy
for strength, estimate W/D/L, or authorize M2.

## Frozen source and population

- Amendment and failure record: commit `dbe20a9`
- Diagnostic plan: commit `ee1dbb5`
- Runner and Slurm implementation/source: commit `5bea592`
- Fresh seed interval: `3,350,101,000`–`3,350,101,071`
- Maps: HFO LE and Tour of Egypt
- Coverage: both directions, all nine countries, both candidate slots
- Cases: 72
- Arms per case: disabled, ceiling 75, ceiling 150, ceiling 300
- Separate case-arm tasks: 288
- Horizon: 3,600 updates

The diagnostic never reused a seed from the failed Gate 3 population and did
not open any of its 907 successful partial-population artifacts.

## Prerequisites

| Stage | Job | Result |
|---|---:|---|
| Current-source pure gate | 25898057 | 9 files / 118 tests plus one runtime-schema test passed |
| Zero-update manifest | 25907952 | 72 cases and 288 tasks passed exact coverage and identity checks |
| Preserved disabled smoke | 25916992 | clean through 3,600 updates and five snapshots |

Artifact identities:

- pure gate SHA-256:
  `77296d7361800d60c9e660a1f7c0e50fa651c6e2afbbe5376925deee42eddb55`
- manifest SHA-256:
  `5250e332699b52fc5408d709f61843b1963ee9a3d185bf9482eb3a12711dcb37`
- smoke record SHA-256:
  `bfca3ec4a6ad022bf7721bf267604ea2f6ebecc0f40d3e25e30bd7a46bc27c8b`

All three ran on `pi_jss233/day`, one CPU, with zero restarts and exact source,
program, Slurm, runtime, map, opponent, protocol, and prior-evidence bindings.

## Complete aggregate

- Array: `25921858`, exact `0-287%64`
- Finalizer: `25921859`, `afterok`, completed in 7 seconds
- Array tasks: 288 `COMPLETED`, zero failed, zero restarted
- Unique scheduler job IDs: 288
- Final files: 589, below the frozen limit of 700
- Aggregate SHA-256:
  `a4b140986cfa574814527f941093250d5999dd308de4dee4f0ece46fe6a07b95`

Status counts:

| Status | Count |
|---|---:|
| clean | 270 |
| telemetry contract | 18 |
| fixed-horizon incomplete | 0 |
| trace contract | 0 |
| setup contract | 0 |

Every one of the 18 telemetry-contract records failed only the frozen budget
boolean. All other exposed technical booleans passed.

## Exact technical pattern

| Arm | Clean | Budget-contract failures | Failure stratum |
|---|---:|---:|---|
| disabled | 72 | 0 | — |
| ceiling 75 | 64 | 8 | Tour of Egypt, direction 0, all four Soviet countries, both slots |
| ceiling 150 | 72 | 0 | — |
| ceiling 300 | 62 | 10 | HFO LE, direction 1, all five Allied countries, both slots |

This exactly reconstructs the 18 opaque failures in array `25831840`: the
packed four-arm task failed when it reached ceiling 300 in the HFO LE stratum
and when it reached ceiling 75 in the Tour stratum. No early finish occurred
in the fresh diagnostic.

## Interpretation

The source-level budget contract gives essential gameplay non-order calls
immediate passthrough and records an overflow rather than suppressing them.
Orders and best-effort debug calls are admitted only while both the rolling
total and order caps remain available. Therefore, under this implementation,
a failed aggregate budget boolean with the other telemetry contracts clean is
evidence that the fixed reserve of 35 is insufficient for that enabled
trajectory; it is not evidence that an order was forwarded past its cap.

That conclusion is an inference from the complete categorical diagnostic and
the bound source semantics. A1 intentionally does not serialize the overflow
magnitude or update, so no stronger quantitative claim is available.

The non-monotone arm pattern is possible because enabling a different ceiling
changes the candidate's evolving state and therefore its later essential
action requests. A larger order allowance need not induce the same trajectory
as a smaller allowance.

## Decision

The 75 and 300 variants are technically infeasible under the frozen global
reserve on the complete A1 crossing. They must not enter competitive
development, and the reserve must not be retrospectively enlarged from these
traces. Essential placement, sale, repair, production, alliance, superweapon,
and quit actions must not be silently suppressed to force a pass.

The ceiling-150 arm passed all 72 A1 tasks, but this does not establish global
compatibility: A1 covered only two maps against Supalosa. The next admissible
step is a new, prospectively frozen all-map/all-opponent Gate 3 screen for only
disabled and ceiling 150. It retains every ceiling-150 budget, invariant,
determinism, firewall, provenance, and storage gate. M2 remains sealed until
that complete screen passes.

## Audit files

- `tasks.csv` SHA-256:
  `fc902ffa8e6f5587c7c9d8e3b8fa6fe51f0654d3ef3393d54df437a04fce3e45`
- `contingency.csv` SHA-256:
  `c01bc508019c1bfbfdddb7717c7084cb2f790e828a3794ee7175e380ae36b99b`
- `scheduler.csv` SHA-256:
  `8df57d86990a820f6b0bca39a90fb8c966c3ba6eb434fdd816bca90fe9fe18a7`

The complete aggregate contains only categorical technical status and bound
identities. It contains no game endpoint, score, defeated side, action or
trajectory contents, failure update, or competitive ranking.
