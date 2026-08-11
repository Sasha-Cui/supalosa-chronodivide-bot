# Chrono Divide research layer

This directory is the paper and reproducibility layer for the stronger-bot
fork. “Chrono Divide” is the browser Red Alert 2 reconstruction used as the game
simulator; it is not a chronological data split. The completed study concerns
family-disjoint evaluation and configuration of a generic scripted RTS policy.

## Read in this order

1. [`STATUS.md`](STATUS.md) — current result and the remaining paper work.
2. [`EMPIRICAL_COMPLETION_AUDIT.md`](EMPIRICAL_COMPLETION_AUDIT.md) — final
   execution reconciliation, empirical sufficiency decision, and claim freeze.
3. [`METHOD_V2_CONFIRMATORY_RESULT.md`](METHOD_V2_CONFIRMATORY_RESULT.md) —
   immutable held-out result and its failed absolute-strength gate.
4. [`METHOD_V2_TERMINAL_STATE_ANALYSIS.md`](METHOD_V2_TERMINAL_STATE_ANALYSIS.md)
   — descriptive outcome and terminal-state decomposition.
5. [`PAPER_PLAN.md`](PAPER_PLAN.md) — manuscript framing, outline, and abstract.
6. [`MANUSCRIPT_QA.md`](MANUSCRIPT_QA.md) and
   [`REVIEWER_AUDIT.md`](REVIEWER_AUDIT.md) — build/visual checks and the candid
   reviewer-style acceptance audit.
7. [`ANONYMITY_RELEASE_RISK.md`](ANONYMITY_RELEASE_RISK.md) — double-blind and
   upstream-license actions required before submission or public bot release.
8. [`CONTACT_TEMPLATES.md`](CONTACT_TEMPLATES.md) and
   [`SUBMISSION_ROADMAP.md`](SUBMISSION_ROADMAP.md) — send-ready external
   questions and the dated path to the 2026-11-01 deadline.
9. [`RESULT_REGISTRY.tsv`](RESULT_REGISTRY.tsv) — append-only mapping from every
   interpreted result to its configuration, artifact, revision, and job ID.
10. [`FORENSIC_AUDIT.md`](FORENSIC_AUDIT.md) — original inventory, leakage audit,
   and reconstruction of the pre-research project.

## Frozen result boundary

The method-v2 champion scores 0.53516 and the shipped StrongBot default scores
0.19922 over 256 paired games per method on 16 sealed families. The
equally-family-weighted improvement is 0.33594 with a family-clustered 95%
interval [0.21456, 0.45732]. The champion's one-sided lower score margin versus
0.5 is negative, so the repository does not support “reliably beats Supalosa.”

All current families have been assigned or exposed by the completed program.
Do not add outcome-bearing games to the present paper after unblinding. A new
opponent, new map population, or instrumented trajectory study must be a
separately versioned prospective experiment.

## Protocol and result map

| Topic | Document |
| --- | --- |
| Final execution and go/no-go audit | [`EMPIRICAL_COMPLETION_AUDIT.md`](EMPIRICAL_COMPLETION_AUDIT.md) |
| Method-v2 training and selection | [`METHOD_V2_PROTOCOL.md`](METHOD_V2_PROTOCOL.md) |
| Fresh development gate | [`METHOD_V2_DEVELOPMENT_PROTOCOL.md`](METHOD_V2_DEVELOPMENT_PROTOCOL.md) |
| Confirmatory result | [`METHOD_V2_CONFIRMATORY_RESULT.md`](METHOD_V2_CONFIRMATORY_RESULT.md) |
| Optimizer-selection diagnostic | [`METHOD_V2_MECHANISM_ABLATION_RESULT.md`](METHOD_V2_MECHANISM_ABLATION_RESULT.md) |
| Policy-component diagnostic | [`METHOD_V2_COMPONENT_ABLATION_RESULT.md`](METHOD_V2_COMPONENT_ABLATION_RESULT.md) |
| Terminal-state decomposition | [`METHOD_V2_TERMINAL_STATE_ANALYSIS.md`](METHOD_V2_TERMINAL_STATE_ANALYSIS.md) |
| Supported map population | [`SUPPORTED_SCOPE_DECISION.md`](SUPPORTED_SCOPE_DECISION.md) |
| Map-family construction | [`MAP_FAMILY_ELIGIBILITY.md`](MAP_FAMILY_ELIGIBILITY.md) |
| Simulator compatibility | [`MAP_FIDELITY_GATE.md`](MAP_FIDELITY_GATE.md) |
| Deterministic policy interface | [`METHOD_INTERFACE_GATE.md`](METHOD_INTERFACE_GATE.md) |
| Literature and novelty boundary | [`RELATED_WORK.md`](RELATED_WORK.md) |
| Environment contract | [`ENVIRONMENT.md`](ENVIRONMENT.md) |
| Venue fit and deadlines | [`VENUE_STRATEGY.md`](VENUE_STRATEGY.md) |
| Manuscript QA | [`MANUSCRIPT_QA.md`](MANUSCRIPT_QA.md) |
| Reviewer-style decision | [`REVIEWER_AUDIT.md`](REVIEWER_AUDIT.md) |
| Anonymity and release risk | [`ANONYMITY_RELEASE_RISK.md`](ANONYMITY_RELEASE_RISK.md) |
| External contact drafts | [`CONTACT_TEMPLATES.md`](CONTACT_TEMPLATES.md) |
| Dated submission roadmap | [`SUBMISSION_ROADMAP.md`](SUBMISSION_ROADMAP.md) |
| Anonymous artifact builder | [`../artifact/README.md`](../artifact/README.md) |

## Reproducibility layout

- [`artifacts/`](artifacts/) contains committed inventories, commitments,
  designs, and aggregate results. Do not hand-edit generated artifacts.
- [`scripts/`](scripts/) contains inventory, gate, verification, aggregation,
  and terminal-state analysis tools.
- [`slurm/`](slurm/) contains the frozen `pi_jss233` launch entry points.
- [`tests/`](tests/) contains Python protocol and verifier tests.
- [`configs/`](configs/) contains frozen small inputs.
- [`environment.toml`](environment.toml) records the research environment.

Large execution bundles remain outside Git under
`/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence`. Every
interpreted bundle must also appear in [`RESULT_REGISTRY.tsv`](RESULT_REGISTRY.tsv).
Author-owned code, manifests, hashes, metadata, and aggregates may be released;
proprietary maps, MIX archives, and copied game assets remain subject to their
third-party licenses and must not be added here by default.

Historical outputs under `benchmark-results/` are preserved separately. Their
existence does not make them admissible paper evidence.
