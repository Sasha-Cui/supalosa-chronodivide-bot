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
4. [`COMPUTE_ACCOUNTING.md`](COMPUTE_ACCOUNTING.md) — frozen accepted-path
   CPU, memory, and allocation accounting.
5. [`METHOD_V2_TERMINAL_STATE_ANALYSIS.md`](METHOD_V2_TERMINAL_STATE_ANALYSIS.md)
   — descriptive outcome and terminal-state decomposition.
6. [`PAPER_PLAN.md`](PAPER_PLAN.md) — manuscript framing, outline, and abstract.
7. [`MANUSCRIPT_QA.md`](MANUSCRIPT_QA.md),
   [`REVIEWER_AUDIT.md`](REVIEWER_AUDIT.md), and
   [`REVIEW_RESPONSE_GUIDE.md`](REVIEW_RESPONSE_GUIDE.md) — build/visual checks,
   the candid acceptance audit, and evidence-indexed bounded responses.
8. [`SCAG_ACCEPTED_PAPER_CALIBRATION.md`](SCAG_ACCEPTED_PAPER_CALIBRATION.md)
   — comparison with the 2024--2026 SCAG proceedings and the resulting venue
   fit boundary.
9. [`ANONYMITY_RELEASE_RISK.md`](ANONYMITY_RELEASE_RISK.md) — double-blind and
   upstream-license actions required before submission or public bot release.
10. [`AUTHORSHIP_AND_AI_POLICY.md`](AUTHORSHIP_AND_AI_POLICY.md) — factual
   generative-AI use boundary, author-verification requirements, and venue
   eligibility gate.
11. [`VENUE_DECISION_PACKET.md`](VENUE_DECISION_PACKET.md),
   [`ICAART_POLICY_RECONCILIATION.md`](ICAART_POLICY_RECONCILIATION.md),
   [`CONTACT_TEMPLATES.md`](CONTACT_TEMPLATES.md),
   [`EXTERNAL_REVIEW_PACKET.md`](EXTERNAL_REVIEW_PACKET.md), and
   [`SUBMISSION_ROADMAP.md`](SUBMISSION_ROADMAP.md) — send-ready external
   questions, a neutral cold-read protocol, and the dated path to one selected
   venue deadline.
12. [`SUBMISSION_CHECKLIST.md`](SUBMISSION_CHECKLIST.md) — the final claim,
   anonymity, rights, artifact, and upload freeze record.
13. [`RESULT_REGISTRY.tsv`](RESULT_REGISTRY.tsv) — append-only mapping from every
   interpreted result to its configuration, artifact, revision, and job ID.
14. [`FORENSIC_AUDIT.md`](FORENSIC_AUDIT.md) — original inventory, leakage audit,
   and reconstruction of the pre-research project.

## Frozen result boundary

The method-v2 champion scores 0.53516 and the frozen generic StrongBot reference
scores 0.19922 over 256 paired games per method on 16 sealed families. This
reference is the coordinate-free `DEFAULT_RESEARCH_POLICY`, not the fork's
map-profile-enabled deployed constructor default. The
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
| Accepted-path compute accounting | [`COMPUTE_ACCOUNTING.md`](COMPUTE_ACCOUNTING.md) |
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
| Venue decision handoff | [`VENUE_DECISION_PACKET.md`](VENUE_DECISION_PACKET.md) |
| ICAART public-policy reconciliation | [`ICAART_POLICY_RECONCILIATION.md`](ICAART_POLICY_RECONCILIATION.md) |
| Accepted-paper venue calibration | [`SCAG_ACCEPTED_PAPER_CALIBRATION.md`](SCAG_ACCEPTED_PAPER_CALIBRATION.md) |
| ICAART reviewer-criteria audit | [`ICAART_REVIEW_SCORECARD.md`](ICAART_REVIEW_SCORECARD.md) |
| ICAART short-paper contingency | [`ICAART_SHORT_PAPER_REDUCTION_PLAN.md`](ICAART_SHORT_PAPER_REDUCTION_PLAN.md) |
| Manuscript QA | [`MANUSCRIPT_QA.md`](MANUSCRIPT_QA.md) |
| SCITEPRESS submission-candidate QA | [`SCITEPRESS_QA.md`](SCITEPRESS_QA.md) |
| Reviewer-style decision | [`REVIEWER_AUDIT.md`](REVIEWER_AUDIT.md) |
| Reviewer-response evidence index | [`REVIEW_RESPONSE_GUIDE.md`](REVIEW_RESPONSE_GUIDE.md) |
| Anonymity and release risk | [`ANONYMITY_RELEASE_RISK.md`](ANONYMITY_RELEASE_RISK.md) |
| Authorship and generative-AI policy | [`AUTHORSHIP_AND_AI_POLICY.md`](AUTHORSHIP_AND_AI_POLICY.md) |
| Human author verification packet | [`HUMAN_AUTHOR_VERIFICATION_PACKET.md`](HUMAN_AUTHOR_VERIFICATION_PACKET.md) |
| External contact drafts | [`CONTACT_TEMPLATES.md`](CONTACT_TEMPLATES.md) |
| Independent cold-read protocol | [`EXTERNAL_REVIEW_PACKET.md`](EXTERNAL_REVIEW_PACKET.md) |
| Dated submission roadmap | [`SUBMISSION_ROADMAP.md`](SUBMISSION_ROADMAP.md) |
| Submission freeze checklist | [`SUBMISSION_CHECKLIST.md`](SUBMISSION_CHECKLIST.md) |
| Anonymous artifact builder | [`../artifact/README.md`](../artifact/README.md) |
| SCITEPRESS submission-candidate source | [`../paper_scitepress/README.md`](../paper_scitepress/README.md) |

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
