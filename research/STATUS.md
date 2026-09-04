# Research status

Last reconciled: **2026-09-04**

## Bottom line

The empirical program is active and the current manuscript is stale. StrongBot
has a strong positive HFO LE result and a positive Peak replication against
pinned Supalosa, but it has not yet demonstrated reliable performance across
the complete map suite or against RA2Web Advanced. The project is not ready for
submission and the paper must remain frozen until the milestone ledger is
complete.

## Established evidence

| Study | Games | StrongBot or candidate W/D/L | Comparator | Decision |
| --- | ---: | ---: | --- | --- |
| HFO LE confirmation | 720 | 633/24/63 | pinned Supalosa | positive within-map evidence |
| Peak replication | 180 paired cases per policy | 134/14/32 | deployed control 92/16/72 | positive profile-scope evidence |
| Advanced transfer | 360 paired cases per first policy | 79/19/262 | Supalosa 178/30/152 vs same opponent | failed transfer |

The historical HFO and Peak results predate the final composite policy,
observation firewall, complete map suite, and corrected endpoint measurement.
They are development evidence unless exact policy equivalence is proved.

## Current milestone: M0

M0 requires a complete corrected endpoint remeasurement and its full
provenance record. Execution V1 array `24734770` wrote 2,700 sealed cells but
failed its frozen scheduler gate after two `NODE_FAIL` records. Finalizer
`24734771` was cancelled and emitted no aggregate. No competitive outcome was
inspected.

The preserved failure and prospectively frozen replacement are:

- `research/results/2026-09-04-fresh-dual-v1-scheduler-failure.md`;
- `research/protocols/maps/2026-09-04-fresh-dual-full-retry-v2.md`;
- `research/runtime/fresh-dual-analysis-v2.mjs`.

Execution V2 must rerun all 2,700 frozen assignments under a new evidence root
and pass 2,700/2,700 `COMPLETED 0:0` scheduler records. V1 and V2 may never be
pooled.

## Milestone ledger

- **M0 — Correct endpoint evidence:** complete V2, independent recomputation,
  provenance/observation errata, result preservation, and registration.
- **M1 — Method technically ready:** full action-burst diagnostic, unified
  intent arbiter, strict terminal race, and symmetric observation firewall.
- **M2 — Development champion frozen:** repeatable positive open-development
  evidence across 15 physical maps/five topology families and all ten HFO
  variants against Advanced.
- **M3 — Reliable Supalosa confirmation:** pass the single-use 10,080-game
  all-map matrix, including every prespecified per-map adjusted lower bound.
- **M4 — Opponent and topology breadth:** pass the frozen Advanced, Standard,
  Sea/Land, and development-unused transfer evaluations.
- **M5 — Submission-ready paper and artifact:** Ledger V2, independent
  statistics, evidence-derived paper assets, rights-cleared figures, artifact
  cold run, SCITEPRESS QA, and cold review.

Milestones cannot be weakened or redefined after outcomes. A failed final gate
returns the project to prospectively labeled development; it is not rescued by
selective maps, countries, starts, opponents, or seeds.

## Claim boundary

Currently supported:

- reliable superiority over pinned Supalosa on the historical balanced HFO LE
  population;
- positive Peak profile-scope replication; and
- an explicit negative Advanced transfer result.

Not currently supported:

- reliable superiority across all 15 maps;
- superiority to RA2Web Advanced, Standard, or Sea/Land;
- fog-of-war parity or equal feature use;
- ancestry-independent opponent generalization;
- a new Chrono Divide environment, general optimizer, or paradigm shift; or
- a submission-ready paper.

The corrected observation and opponent provenance boundaries are recorded in
`research/OBSERVATION_CONTRACT_ERRATUM_V1.md` and
`research/OPPONENT_PROVENANCE_ERRATUM_V1.md`.

## Paper and venue

The old 12-page SCITEPRESS PDF, `final_paper_evidence_v1`, generated tables,
and artifact remain preserved historical outputs. Do not update their macros
or cite them as current. After empirical completion, create a separate
hash-bound evidence V2 and regenerate every number, table, figure, README, and
claim.

The primary target is the SPIKE 2027 special session at ICAART, submission
deadline 2026-12-03 AOE. Remote presentation is an exception rather than an
unconditional guarantee, so written approval is required before submission or
registration. See `research/VENUE_STRATEGY.md`.
