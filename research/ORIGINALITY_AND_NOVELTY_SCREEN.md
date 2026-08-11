# Originality and closest-work screen

Verified: **2026-08-11**

## Scope and candidate identity

This is a limited, machine-assisted screen of the submission candidate at:

- reviewed source commit:
  `92a4c870b6e697682b51fa41fd0f785c97c6b121`;
- LNCS PDF SHA-256:
  `c44c0d5739a33ae4155c18f0eba8c480785f4e3e1b9e2250dc03a43733a6d0a1`;
- ICAART PDF SHA-256:
  `7d4c26640a5f4da34783d1a533c8cfeb807d2d7b37a1e52acdc37b8cf6386c07`.

It asks two bounded questions:

1. Did a current scholarly search reveal a materially closer precedent that
   changes the paper's novelty boundary?
2. Did exact searches for distinctive manuscript phrases return an external
   verbatim match that needs source investigation?

This screen cannot establish the absence of unattributed overlap. It has no
access to a proprietary similarity database, unindexed publications, private
manuscripts, paywalled full-text corpora, or all historical versions of web
pages. Human source reading and a venue-provided similarity report, if one is
available, remain the relevant pre-submission controls.

## Closest-work search

Searches covered combinations of `programmatic strategies`, `microRTS`,
`real-time strategy`, `program synthesis`, `map-independent`, `opponent`,
`semantic space`, `automatic configuration`, `action pre-selection`,
`evaluation`, and publication years 2018--2026. Candidate
records were checked against primary publisher or proceedings pages rather
than secondary summaries.

| Work checked | Relationship to this paper | Disposition |
| --- | --- | --- |
| Mariño et al. (2021), [Programmatic Strategies for Real-Time Strategy Games](https://doi.org/10.1609/aaai.v35i1.16114) | Synthesizes map-specific $\mu$RTS programs. | Already cited; establishes that map-specific program synthesis is prior art. |
| Medeiros et al. (2022), [What Can We Learn Even from the Weakest?](https://doi.org/10.1609/aaai.v36i7.20744) | Learns sketches that guide programmatic-strategy synthesis. | Already cited; does not overlap the family-disjoint evaluation claim. |
| Aleixo and Lelis (2023), [Show Me the Way!](https://doi.org/10.1609/aaai.v37i4.25626) | Uses bilevel feature--program search to guide synthesis. | Already cited; confirms that search guidance is not claimed as novel here. |
| Ouessai et al. (2022), [Evolving Action Pre-Selection Parameters for MCTS in Real-Time Strategy Games](https://doi.org/10.1016/j.entcom.2022.100493) | Evolves parametric action-preselection heuristics for particular $\mu$RTS map--opponent settings and compares the resulting agent on those maps. | Added in `92a4c87`; closest automatic RTS configuration precedent found, but it does not use the present family-disjoint held-out estimand. |
| Moraes et al. (2023), [Choosing Well Your Opponents](https://doi.org/10.24963/ijcai.2023/539) | Selects reference-strategy sets to guide synthesis and evaluates in $\mu$RTS. | Added in `5ed5dad`; closest recent opponent-guidance precedent, but it is a synthesis method rather than a leakage-control protocol. |
| Moraes and Lelis (2024), [Searching for Programmatic Policies in Semantic Spaces](https://doi.org/10.24963/ijcai.2024/662) | Searches library-induced semantic neighborhoods for sample-efficient synthesis in $\mu$RTS. | Added in `5ed5dad`; current synthesis precedent, but methodologically distinct from finite parameter configuration and held-out evaluation. |
| Yang and Ontañón (2018), [Learning Map-Independent Evaluation Functions for RTS Games](https://doi.org/10.1109/CIG.2018.8490369) | Learns evaluation functions intended to transfer across maps. | Checked but not added: it concerns learned state evaluation, not scripted-policy configuration or family-level leakage control. |

No archival publication specifically studying a Chrono Divide bot was located
in the queried scholarly and public-project indexes. That is a search result,
not a universal literature-gap claim. The manuscript therefore continues to
claim an integrated empirical workflow, not priority over every reproducible
game-agent evaluation pipeline.

## Distinctive-phrase screen

The following exact quoted strings were searched in a public web index. No
external result containing the complete quoted string was observed on
2026-08-11; partial-term and generic `fail closed` results were unrelated.

- `turn an otherwise ambiguous tuning result into bounded, auditable evidence`
- `revision-aware map families, outcome-free compatibility screening`
- `fails closed on partial or selectively retried campaigns`
- `provenance-bound, family-disjoint evaluation workflow`
- `identity-keyed random streams, sealed outcomes`
- `complete scheduler provenance, and honest negative gates`
- `participant-specific streams so an extra draw by StrongBot`
- `reusable result is the evidence contract`

These phrases were selected from the abstract, introduction, related work, and
conclusion because they are more discriminative than standard terminology such
as `common random numbers`, `successive halving`, or `family-clustered
confidence interval`. Matches to the repository's own project documents would
be expected reuse within one research record and were not treated as
independent external sources.

## Disposition

Across the two closest-work passes, the search justified three citation
additions and no scientific-claim change. The updated paper classifies
opponent-set guidance and semantic-space neighborhoods as prior synthesis work,
and map--opponent-specific action-preselection evolution as prior automatic RTS
configuration, then retains the narrower claim: family-disjoint,
provenance-bound evaluation for one scripted Chrono Divide agent and one pinned
opponent. No returned exact-phrase result triggered a source-attribution repair.

Before submission, the author must still read all 33 primary sources, complete
`HUMAN_AUTHOR_VERIFICATION_PACKET.md`, check any venue-generated similarity
report, and investigate every flagged passage rather than relying on this
screen.
