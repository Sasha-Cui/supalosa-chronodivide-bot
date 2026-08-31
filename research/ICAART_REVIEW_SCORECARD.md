# ICAART reviewer-criteria scorecard

Reviewed: **2026-08-30**

This is an internal adversarial audit of the final anonymous candidate, not an
independent review or acceptance guarantee. Bound PDF SHA-256:
`b832744aa64b790044c706f3c64c797f6674b4e5549b48dc88dd49858de0cb77`.

## Criterion assessment

| Criterion | Internal assessment | Evidence | Primary residual risk |
| --- | --- | --- | --- |
| Relevance | strong | Complete scripted agent, simulation, task execution, and empirical evaluation fit ICAART Agents. | Some reviewers may expect learning rather than agent engineering. |
| Originality | moderate | New StrongBot mechanisms plus prospective activation/isolation and literal-objective evidence chain in Chrono Divide. | Components use established ideas and exact map predicates. |
| Technical quality | strong | 3,166 claim-bearing games, frozen stages, clean opponent, paired streams, balanced strata, uncertainty, exact inactive cells, and self-verifying artifact. | Full gameplay replay depends on third-party rights; no broad map distribution. |
| Significance | moderate-to-strong | Reliable Supalosa wins on two maps, large HFO result, replicated Peak repair, and interpretable mechanism gains. | Positive evidence targets one opponent; Advanced transfer fails. |
| Presentation | strong | 12-page compliant PDF, compact algorithm, five tables, uncertainty plot, 15 enlarged annotated frames, and explicit limitations. | Dense evidence/provenance language and one figure-only page may slow readers. |

Overall internal disposition: **credible regular-paper submission with a
reasonable acceptance case and meaningful reviewer variance**. The paper is
well above a workshop minimum. Acceptance hinges on whether reviewers value
auditable scripted-agent engineering despite limited opponent/map breadth.

## Reviewer questions

| ICAART prompt | Current answer |
| --- | --- |
| Abstract/introduction adequate? | Yes: existing environment, StrongBot, literal objective, HFO/Peak positives, and Advanced limit all appear on page 1--2. |
| More experiments needed? | Not for the declared Supalosa claims. Broad generalization would require a new prospective multi-map/multi-opponent study, not post-hoc additions. |
| Comparative evaluation needed? | Supalosa is the central external baseline; deployed Peak control and Advanced paired comparison add useful contrasts. No optimizer comparison is claimed. |
| Critical discussion adequate? | Yes: exact-coordinate dispatch, scripted policy, two maps, one positive opponent, Advanced reversal, residual tick-cap failure, and rights boundary are explicit. |
| Figures adequate? | Yes: the Peak 2-by-3 panel enlarges intervention divergence; the HFO 3-by-3 panel joins force clearance, final-building victory, and honest failure. |
| Conclusion/future work convincing? | Yes: it states two-map Supalosa reliability and names opponent robustness/map coverage as next problems. |
| References current/appropriate? | Relevant RTS environments, programmatic policy search, configuration, evaluation, exact software, RA2Web, and Codex sources are cited. |
| Formatting/English? | Automated and visual QA pass; 12 A4 pages, 36,004 characters, 190 abstract words, seven embedded fonts. |

## Strongest acceptance argument

The paper does more than report a tuned bot: it connects three replicated
scope-isolated interventions and a reciprocal spatial repair to two fresh
positive map results under literal victory, then demonstrates the limit with a
paired independent-opponent reversal. The evidence chain is unusually
auditable for a full-game RTS agent.

## Strongest rejection argument

The policy is manually structured and explicitly map-profiled. Reliable
positive performance is against one pinned opponent on two maps, while the
independent Advanced opponent defeats it. A reviewer prioritizing learned
generality or algorithmic novelty may judge the contribution too narrow.

## Actionable internal finding

The manuscript should state the exact inferential unit for every lower bound in
one compact place. The mechanism text defines paired t bounds and the result
sections report cell-clustered bounds, but a single mathematical sentence for
paired case differences and equal-weight country-start cells would reduce
reviewer ambiguity. This is a claim-preserving methods clarification, not new
analysis.

After that clarification, the only required pre-submission evidence is the
unprimed human cold read. Requests for more opponents or unseen maps belong to
future prospective work.
