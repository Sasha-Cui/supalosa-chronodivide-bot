# ICAART reviewer-criteria scorecard

Reviewed: **2026-08-11**

## Purpose and evidence boundary

This is an internal acceptance-risk audit of the anonymous SCITEPRESS regular
paper whose scientific claims were frozen at
`419a0f72188f957ae144262f62c62bcc11a66ac3`, whose claim-preserving terminology
refreeze is `77d93359242756f07afba30d88fb2db8fd97e7b2`, whose citation-source
refreeze is `e91674f4eff69c4ceccb3a65e617cfb91d01ec5c`, whose portable-contribution
presentation refreeze is `504cc2a7f1844183e2d87d0af09e1f697d3acfca`, whose
current reviewed source is `92a4c870b6e697682b51fa41fd0f785c97c6b121`, and
whose PDF SHA-256 is
`7d4c26640a5f4da34783d1a533c8cfeb807d2d7b37a1e52acdc37b8cf6386c07`.
The surrounding governance tree was rechecked at
`0178203382836043baf27e1053ee3e55bf8c4a52`. This is not an independent
review, an acceptance-probability estimate, or a substitute for the unprimed
human cold read in `EXTERNAL_REVIEW_PACKET.md`.

ICAART's current reviewer guidance asks reviewers to consider **Relevance**,
**Originality**, **Technical Quality**, **Significance**, and **Presentation**.
It also asks whether the abstract/introduction, experimental and comparative
evidence, critical discussion, figures, conclusions/future work, references,
formatting, and English need improvement. The 2027 call separately requires a
paper to state clearly the nature of its contribution and the problems,
domains, or environments to which it applies.

Official sources checked on 2026-08-11:

- [ICAART ethics of review](https://icaart.scitevents.org/EthicsOfReview.aspx)
- [ICAART 2027 call for papers](https://icaart.scitevents.org/CallForPapers.aspx?y=2027)
- [ICAART 2027 submission guidelines](https://icaart.scitevents.org/Guidelines.aspx?y=2027)
- [ICAART submission-type glossary](https://icaart.scitevents.org/Glossary.aspx)

## Criterion-level assessment

| Criterion | Internal score | Evidence | Residual rejection risk |
| --- | ---: | --- | --- |
| Relevance | 4/5 | Scripted agents, simulation, task execution, algorithm configuration, and an applied agent-platform study fit the Agents area. The title, abstract, and keywords route to that audience. | A reviewer may see game-bot tuning as peripheral unless the evaluation contribution is read as the principal contribution. |
| Originality | 3/5 | The original contribution is the integrated leakage-resistant Chrono Divide evaluation protocol: revision-aware families, sealed role access, participant-isolated common randomness, reciprocal starts, clustered inference, and fail-closed provenance. | Successive halving and the individual controls are established; the paper must not be read as claiming optimizer or environment novelty. |
| Technical quality | 5/5 | The study has family-disjoint roles, a transparently retired method, fresh development, one-time sealed evaluation, paired design, family-clustered uncertainty, negative-gate reporting, exact accounting, and deterministic aggregate reproduction. | Family construction is heuristic, the endpoint has many tick-cap draws, and full replay depends on third-party content. |
| Significance | 3/5 | The held-out effect is large and family-consistent, and the study shows how strong execution controls narrow an initially diffuse bot-strength story into one positive relative result and one failed absolute result. | One independent opponent, one faction mirror, a low-scoring generic reference, and no deployed-default comparison limit practical generality. |
| Presentation | 4/5 | All 11 A4 pages were re-rendered and inspected at the frozen hash. The title and abstract foreground leakage-resistant evaluation rather than optimizer novelty, the evidence contract is explicit at the reader entry points, and the threat-to-control table makes the reusable design visible before the dense implementation detail. Four figures and four tables remain legible; 39,102 extracted non-whitespace characters satisfy the official 10,000--50,000 submission band. | The method remains dense, and the bounded positive claim still demands attentive reading. |

Overall internal recommendation: **weak accept, with meaningful reviewer
variance**. Technical quality is well above the likely rejection threshold;
originality and significance depend on whether reviewers value the integrated
evaluation protocol despite narrow opponent breadth.

## ICAART reviewer prompts

| Reviewer prompt | Current answer | Required action |
| --- | --- | --- |
| Abstract and introduction adequate? | Yes. They name the existing environment, leakage-resistant protocol, separate configuration pipeline, bounded claim, failed absolute gate, and scope. | The new title and threat-to-control map reinforce contribution item 1 without strengthening the evidence claim. |
| Needs more experimental results? | Not within the frozen paper. More seeds on opened test families add no generalization units. A second opponent or faction requires a new prospective study. | Keep as future work; do not append post hoc games. |
| Needs comparative evaluation? | This is the main likely objection. The paper compares a frozen generic reference and component reverts, but not independent configurators or multiple opponents. | Preserve the explicit boundary. Do not imply optimizer superiority. |
| Improve critical discussion? | No material omission found. The paper foregrounds adaptation, baseline identity, high draws, one-opponent scope, heuristic families, and diagnostic limits. | Retain every limitation through final edits. |
| Figures adequate? | Yes after repair. Figures show study flow, all family effects, paired transitions, and component intervals. | Figure 2 no longer depends on an unavailable supplement; its family labels are defined in place. |
| Conclusions/future work convincing? | Yes. The conclusion answers both confirmatory gates and states the non-causal diagnostic boundary; the immediately preceding limitations identify the next prospective extension. | Cold-read whether the final paragraph remains appropriately bounded rather than merely defensive. |
| References current and appropriate? | Yes. The bibliography includes the closest game-agent configuration work, map-specific program synthesis, generalization/evaluation foundations, exact pinned software sources, and a 2026 ICAART game paper. | Human author still verifies every primary source and citation use. |
| Formatting adjustment? | None currently. The candidate is 11 A4 pages and 39,102 non-whitespace characters, with embedded fonts and settled references. A later full-paper acceptance permits 12 proceedings pages; a short-paper acceptance permits 8. | Full post-edit render completed; repeat only after a later source change. Retain an 8-page camera-ready reduction plan rather than compressing the review version preemptively. |
| Improve English? | No systemic issue found. | Human line edit remains mandatory under the authorship policy. |

## Acceptance-oriented revision decision

The fresh fast-review pass found one repairable presentation risk: the old
title led with configuration even though the paper disclaims optimizer novelty,
and the controls that constitute the methodological contribution were
distributed across dense prose. Commit `bc0e609` therefore retitled the paper
around leakage-resistant evaluation, distinguishes protocol from configuration
in both abstracts, and adds a five-row threat-to-control map. It changes no
result, estimator, experimental input, conclusion, or scope boundary.

A second fast-review pass found that the portable significance was still more
diffuse than the empirical result. Commit `504cc2a` therefore names the
reusable evidence contract in both abstracts and the conclusion, makes the
threat table ragged-right, and balances the final reference page. It changes no
scientific result or claim boundary. This improves the entry points but does
not remove the one-opponent, one-matchup significance risk.

The content was then read against each current ICAART reviewer prompt. The
principal rejection risk is unchanged: a reviewer may judge one opponent, one
Iraq mirror, and a generic coordinate-free reference insufficiently
significant. That is a real external-validity limitation, not a missing
sentence or an analysis that can be repaired after test unblinding. The paper
already states it in the abstract, introduction, limitations, and conclusion.
Adding post-hoc games, a simulated deployed baseline, stronger mechanism
language, or an optimizer-novelty claim would weaken the evidence.

The complete 11-page PDF and independent TeX Live 2022 rebuild were then
inspected at contact-sheet and full-page resolution, including the title,
threat-to-control table, every reflowed page, and the complete reference list.
No clipping, overlap, missing glyph, broken cross-reference, illegible plot or
table label, malformed reference, or anonymity disclosure was found.

Decision: **retain the acceptance-oriented revision and freeze its scientific
content**. Preserve the PDF until either the unprimed human cold read identifies
a concrete misunderstanding or the venue supplies required disclosure
instructions. Any later edit must remain claim-preserving and trigger a complete
rebuild, character count, anonymity scan, and rendered-page inspection.

## Decision-critical objections

### 1. “This is ordinary tuning.”

The paper should agree that the search components are established, then point
to the integrated evaluation design as the original technical object. The
correct novelty claim is neither a new optimizer nor a new environment.

### 2. “The baseline is weak and the bot does not reliably win.”

Both facts are already visible. Candidate 0 is a prospectively frozen generic
policy inside the same coordinate-free interface, not a post hoc strawman or
the deployed map-profile-enabled default. The positive claim is relative
configuration improvement; the failed absolute and joint gates forbid a
dominance claim.

### 3. “One opponent is insufficient.”

This is the strongest valid rejection argument. It limits external validity but
does not invalidate the paired held-out estimate for the declared matchup. It
cannot be repaired honestly after opening the test population. The limitations
name independent opponents and cross-faction matchups as a prospective
extension, while the conclusion keeps the methodological lesson concise.

### 4. “The implementation detail overwhelms the scientific idea.”

Every retained engineering control maps to a bias: map-family leakage,
favorable starts, correlated or shifted random streams, contaminated opponent
code, outcome-adaptive retries, or incomplete campaign evidence. The cold read
must confirm that this connection is legible without repository context.

## Acceptance strategy

1. Submit as a **regular empirical paper**, not a new-environment, optimizer,
   benchmark, or position paper.
2. Use **Agents** as the main area and select **Agent Models and
   Architectures**, **Simulation**, and **Task Planning and Execution** if those
   exact topics are offered.
3. Keep the acceptance-oriented title, failed-gate language, and comparator
   boundary unchanged.
4. Do not add outcome-bearing evidence to the opened population.
5. Complete an unprimed human cold read. A reader must independently recover
   the relative-versus-absolute distinction, existing-environment boundary,
   established-optimizer boundary, and diagnostic non-causality.
6. Obtain the four written venue rulings on remote presentation, prior named
   repository handling, AI-disclosure placement, and reviewer-artifact delivery
   before upload.
