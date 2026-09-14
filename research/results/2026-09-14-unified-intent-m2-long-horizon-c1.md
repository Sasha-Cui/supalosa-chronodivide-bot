# Unified intent M2 C1: long-horizon technical diagnostic

Date: 2026-09-14

Status: **complete; hard ceiling 150 is ineligible at the outcome horizon**

C1 completed the full outcome-blind population and explains the first M2
array failure as a long-horizon budget-contract failure. All competitive
payloads were discarded. This result contains no W/D/L or policy-strength
evidence.

## Bound design

- Failure record and C1 protocol: commit `c59d5a7`
- Diagnostic episode and population: commit `7a890a2`
- Runner and Slurm implementation/source: commit `45e8734`
- Fresh seeds: `3,350,104,000`–`3,350,104,899`
- Cases: 900
- Families: 25
- Population: Supalosa on all 15 maps and Advanced on ten HFO maps, both
  directions, all nine countries, and both slots
- Arm: ceiling 150 only
- Runtime: natural literal terminal or 24,000-update cap

Every episode discarded winner, score, endpoint orientation, terminal update,
building and unit state, credits, damage, action/state contents, and overflow
magnitude.

## Prerequisites

| Stage | Job | Result |
|---|---:|---|
| Current-source pure gate | 26155867 | 15 files / 150 tests plus one runtime-schema test passed |
| Zero-update manifest | 26163684 | exact 900-case population and all identities passed |
| Outcome-discarding smoke | 26171909 | schema-valid and technically clean; no population inference |

Artifact identities:

- pure gate SHA-256:
  `ccaae805b423d0be53b962b93cf05133f61b511ca2fc5d84b55aea4246618550`
- manifest SHA-256:
  `3ccf59b85066477cf287bc317af9af6a33d34a7fb25149ea6ca6c48836cd70b8`
- smoke SHA-256:
  `50afe6abeaa89052223ee1194cbdece9610b0a8573fca1cac862f70b889935d4`

## Complete execution

- Array: `26189643`, exact `0-899%64`
- Finalizer: `26189644`, submitted `afterok`
- Scheduler: 900/900 array tasks and the finalizer completed
- Unique array scheduler IDs: 900
- Restarts, retries, exclusions, and replacements: zero
- Final files: 1,813, below the frozen 2,000-file limit
- Aggregate SHA-256:
  `1f0165ae09c08336a8329ef55b2394c608b484026fb09b761e1be52b4ccb64ee`

Status counts:

| Status | Count |
|---|---:|
| clean | 726 |
| budget contract | 174 |
| telemetry schema contract | 0 |
| adjudicator contract | 0 |
| public-integrity contract | 0 |
| setup contract | 0 |

Failed-gate counts:

| Failed boolean | Cases |
|---|---:|
| fixed reserve respected | 125 |
| total budget respected | 80 |
| rolling total cap respected | 80 |

Failure patterns were 94 reserve-only cases, 49 total-budget plus total-cap
cases, and 31 cases failing reserve, total-budget, and total-cap together.
The rolling order cap, chunk cap, one-forward, target validation,
production-atomicity, telemetry schema, adjudicator, setup, public-call,
public-state, and resignation-suppression gates all passed in every case.

## Breadth

- Supalosa: 131/540 budget failures
- Advanced: 43/360 budget failures
- Allied: 75 failures
- Soviet: 99 failures
- Candidate slot 0: 95 failures
- Candidate slot 1: 79 failures

Budget failures occurred in 23 of the 25 families. Supalosa failures appeared
on every map, ranging from one case on Pacific Heights to 20 on Peak of
Perfection. Advanced failures appeared in eight of ten HFO families. The two
Advanced families without a failure do not rescue the complete gate.

## Interpretation

The short 3,600-update B1 gate was necessary but not sufficient. Over natural
episodes, essential gameplay non-order calls can exceed the fixed reserve of
35 after the arbiter has already admitted earlier order traffic. Those
essential calls must forward and therefore can make a strict all-action rolling
ceiling impossible without foreknowledge or unsafe suppression.

This is a structural incompatibility between an unconditional hard total cap
and an unsuppressible essential-action lane, not an endpoint, simulator,
telemetry-schema, or order-validation defect.

## Decision

The hard-total ceiling-150 method is rejected for 24,000-update outcome
evaluation. The failed M2 population must not be relaunched. Reserve 35 must
not be retrospectively enlarged from C1, and essential production, placement,
sale, repair, alliance, superweapon, or quit actions must not be suppressed.

The admissible next method is a separately frozen two-lane arbiter: retain
semantic conflict resolution and a hard cap on controllable order/debug
traffic, while measuring but exempting essential gameplay non-order calls from
that cap. This is a new budget semantics requiring its own technical and
outcome validation.

## Audit outputs

- records SHA-256:
  `55354c3ed445b1795ba95639f94664eeb8e84b9307c7310c7f5aa34a996be882`
- contingency SHA-256:
  `6db983590a703af27e7f4816f180fbe78bbc9c76f0ca02d709abb7dccc55f1a9`
- scheduler SHA-256:
  `014dc81c2d30c0f9521bc6951614810ac86c4041ac8b4ad9a234bea138a38887`

An independent complete-aggregate audit confirmed all hashes, 900 unique
completed scheduler rows, the 1,813-file count, categorical totals, and the
absence of competitive fields.
