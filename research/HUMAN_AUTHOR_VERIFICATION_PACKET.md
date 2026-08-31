# Human author verification packet

Status: **template only; human verification not yet complete**.

Make a private copy before adding a name, signature, correspondence, or
identifying metadata. This tracked version stays blank and anonymous.

## Candidate identity

| Item | Frozen identity |
| --- | --- |
| Reviewed source | `4e2ba4eb599ffd37fec5d0f5da620c20dca80fa5` |
| ICAART PDF | `4b6a2d17bf20c77c46ab4f6c0f010648edcb226862008dbc386fc69a18b62e9b` |
| Anonymous artifact | `c72719f869e3d26183b3615398dd4e82412a02aff2c16893083c60dec368e741` |
| Portal metadata | `cc8f656f8ccca9fab1a614d40a80368e0bec08bcfd6fc5dee07b69edb475d127` |

Run `make -C paper_scitepress submission-check` and
`python3 artifact/scripts/verify_frozen_archive.py` before sign-off. Review
`research/ARTIFACT_CLEANROOM_REPRODUCTION.md` and
`research/CONTACT_TEMPLATES.md` as part of the private record.

## 1. Claim-by-claim manuscript approval

Read the complete PDF and every imported source section. Mark a private copy:

| Boundary | Authority | Human status |
| --- | --- | --- |
| HFO is 633/24/63 over 720 balanced games with Wilson lower 85.78% and country-start lower 84.49% | `research/artifacts/final_paper_evidence_v1.json`; `research/results/2026-08-24-hfo-deployed-confirmatory-v1.md` | `[ ]` |
| Peak reciprocal macro is 134/14/32 versus 92/16/72 control with paired lower +0.167 | final evidence; `research/results/2026-08-30-peak-profile-scope-replication-v1.md` | `[ ]` |
| Three HFO mechanisms have fresh paired replication and exact inactive-cell gates | final evidence `mechanisms`; dated HFO result documents | `[ ]` |
| Advanced transfer is negative and prevents universal superiority | final evidence `advancedTransfer`; `research/results/2026-08-24-hfo-ra2web-advanced-crossplay-v1.md` | `[ ]` |
| Victory requires literal removal of all enemy buildings and suppresses resignations symmetrically | `paper/sections/environment.tex`; protocols | `[ ]` |
| Chrono Divide is existing third-party software | introduction, environment, primary software sources | `[ ]` |
| StrongBot is scripted; no general optimizer novelty is claimed | related work, method, limitations | `[ ]` |
| Screenshots are prospective deterministic observations, not estimators | final evidence `frameEvidence`; frame replay result | `[ ]` |
| Release wording excludes unlicensed bot/runtime/map content | `artifact/THIRD_PARTY.md` | `[ ]` |

Reject or rewrite any sentence implying universal opponent/map dominance, a
new Chrono Divide environment, a learned general policy, or a paradigm shift.

## 2. Independent numerical verification

Use an independently written calculator, spreadsheet, R notebook, or script.
Do not merely compare displayed strings.

| Calculation | Expected result | Human status |
| --- | ---: | --- |
| HFO games and win rate: `633+24+63`; `633/720` | 720; 0.8791667 | `[ ]` |
| HFO one-sided Wilson lower and 36-cell t lower | 0.8577544; 0.8449464 | `[ ]` |
| Peak control / candidate totals | 180 / 180 | `[ ]` |
| Peak paired mean / one-sided t lower | 0.2277778 / 0.1669131 | `[ ]` |
| Peak 18-cell one-sided lower | 0.6326 | `[ ]` |
| Allied paired lower | 0.7639 | `[ ]` |
| Soviet paired lower | 0.2114 | `[ ]` |
| Bottom-retarget paired lower | 0.1147 | `[ ]` |
| Advanced paired mean / lower | -0.2903 / -0.3389 | `[ ]` |
| Claim-bearing game sum | 3,166 | `[ ]` |
| Frame count / replay count | 15 / 9 | `[ ]` |

Confirm the paired score-difference and equal-weight country-start formulas in
`paper/sections/protocol.tex` reproduce the recorded bounds.

## 3. Citation-by-citation source reading

Use `research/SUBSTANTIVE_CITATION_AUDIT.md` as a locator, not as a substitute
for reading primary sources. Every final bibliography key must be signed:

| BibTeX key | Human status |
| --- | --- |
| `fernandezAres2011optimizing` | `[ ]` |
| `mora2012noisy` | `[ ]` |
| `young2012goal` | `[ ]` |
| `othman2012starcraft` | `[ ]` |
| `ouessai2022evolving` | `[ ]` |
| `fernandezAres2012map` | `[ ]` |
| `marino2021programmatic` | `[ ]` |
| `medeiros2022sketches` | `[ ]` |
| `aleixo2023bilevel` | `[ ]` |
| `moraes2023opponents` | `[ ]` |
| `moraes2024semantic` | `[ ]` |
| `hutter2011smac` | `[ ]` |
| `lopezIbanez2016irace` | `[ ]` |
| `lucas2018ntbea` | `[ ]` |
| `eggensperger2019pitfalls` | `[ ]` |
| `li2018hyperband` | `[ ]` |
| `cobbe2019coinrun` | `[ ]` |
| `cobbe2020procgen` | `[ ]` |
| `henderson2018matters` | `[ ]` |
| `agarwal2021precipice` | `[ ]` |
| `ontanon2018microrts` | `[ ]` |
| `vinyals2017sc2le` | `[ ]` |
| `samvelyan2019smac` | `[ ]` |
| `schruben2011crn` | `[ ]` |
| `bhatia2023generally` | `[ ]` |
| `chronodivide2026` | `[ ]` |
| `chronodivideGameApi2026` | `[ ]` |
| `supalosa2026bot` | `[ ]` |
| `ra2web2026bot` | `[ ]` |
| `openai2026codex` | `[ ]` |

For every row record the source locator, proposition, and one of `verified`,
`wording corrected`, `citation replaced`, or `unresolved`. Submission requires
zero unresolved rows.

## 4. Adaptation, sealing, and scheduler history

Review `research/RESULT_REGISTRY.tsv`, the dated protocols/results for HFO,
Peak, Advanced V3--V6, and deterministic frames, plus
`research/artifacts/final_paper_evidence_v1.json`. Confirm privately:

- `[ ]` every outcome-bearing stage was complete before aggregate inspection;
- `[ ]` no partial or selectively rerun outcome was admitted;
- `[ ]` development and replication seed namespaces are disjoint;
- `[ ]` negative Advanced programs remain preserved and are not subsetted;
- `[ ]` source, runtime, opponent, map, selector, scheduler, and prior-stage
  hashes reconcile for every final-evidence input; and
- `[ ]` no unused sealed population was opened for the paper or rebuttal.

## 5. Author-owned code review

Read the exact revisions named by each `sourceCommit` in the final evidence and
the current paper/artifact generators. Review at least:

- deterministic engine/participant streams and cleanup;
- literal endpoint and symmetric resignation audit;
- country/start/slot selectors and seed namespaces;
- HFO west guard/rush and bottom progress-retarget dispatch;
- Peak strategy-scope dispatch and weak-start equality;
- fail-closed finalizers and scheduler accounting;
- passive renderer and renderer-on/off equality; and
- final evidence and generated-asset hash checks.

Record reviewed paths, commits, invariants, and unresolved issues privately.

## 6. Confidentiality, rights, and release review

- `[ ]` Scan PDF and archive for identity, private paths, and scheduler account.
- `[ ]` Confirm artifact manifest before and after regeneration.
- `[ ]` Confirm no bot tree, runtime, map, MIX file, raw row, or private log is
  packaged.
- `[ ]` Obtain written Supalosa permission before public bot redistribution.
- `[ ]` Obtain Chrono Divide guidance for runtime acquisition and game-derived
  frame redistribution.
- `[ ]` Keep the submitted manuscript and confidential reviews out of public AI
  services after submission.

## 7. Venue ruling and disclosure approval

- `[ ]` Send `research/CONTACT_TEMPLATES.md` privately.
- `[ ]` Complete `research/ICAART_RULING_RESPONSE_TEMPLATE.md` privately.
- `[ ]` Confirm remote procedure, repository handling, AI disclosure location,
  and reviewer-artifact route.
- `[ ]` Verify the disclosure names and cites Codex and accurately describes
  code, orchestration, evidence, and drafting assistance.
- `[ ]` Rebuild, rehash, and repeat visual/anonymity QA after any mandated edit.

## Final private sign-off

```text
I personally read the manuscript and primary sources, independently checked
the reported analyses, reviewed behavior- and analysis-relevant code and
execution history, verified the rights/privacy boundary, and approved the
venue-compliant disclosure. I accept responsibility for every submitted claim.

Verifier:
Date and timezone:
Reviewed source commit:
Submitted PDF SHA-256:
Artifact SHA-256 or not supplied:
Venue ruling reference:
Signature:
```
