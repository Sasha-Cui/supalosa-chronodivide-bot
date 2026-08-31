# Independent cold-read protocol

Updated: **2026-08-30**

This protocol measures whether the final anonymous paper communicates its
actual contribution without author coaching. It is not a scientific
replication and does not authorize new gameplay.

## Frozen handoff

| Candidate | Reviewed source | PDF SHA-256 |
| --- | --- | --- |
| SCITEPRESS / ICAART | `6388f1a4243801f6b79d780844327c831a4290f4` | `b832744aa64b790044c706f3c64c797f6674b4e5549b48dc88dd49858de0cb77` |

The deterministic two-member Phase-A ZIP is 1,360,106 bytes with SHA-256 `5dd556a61a5371ada52fd8ae6d5ad30329f1fe1ad093a534b36c46f21b719ca7`.

Build the unprimed deterministic handoff with:

```bash
python3 research/scripts/build_external_review_handoff.py \
  --candidate icaart \
  --output tmp/external-review/icaart-phase-a.zip
```

The builder fails on PDF drift and includes only `anonymous-paper.pdf` and
`review-prompt.txt`. Inspect both members before sending. Copy
`EXTERNAL_REVIEW_RESPONSE_TEMPLATE.md` into a private submission record; never
commit the reader's identity or completed response.

## Phase A: unprimed venue-style review

Send only the ZIP. Do not send the repository, artifact, intended takeaway,
scorecard, or questions below. Ask the reader to spend at most 45 minutes.
Preserve and hash the returned review before any discussion.

The neutral prompt asks for ICAART's five criteria: relevance, originality,
technical quality, significance, and presentation; strongest acceptance and
rejection arguments; required and optional revisions; and an
accept/borderline/reject vote with confidence.

## Phase B: targeted comprehension audit

Only after Phase A is locked, ask:

1. What is the principal contribution in one sentence?
2. What do the HFO 633/24/63 result and its two lower bounds establish?
3. What changed on Peak, what are the control and candidate W/D/L counts, and
   what does the paired lower bound mean?
4. Which three HFO mechanisms were replicated, and what does exact
   inactive-cell trace equality add?
5. What is the literal game objective, and why can enemy units remain alive at
   a valid win?
6. What does the RA2Web Advanced result establish and rule out?
7. Is the work a learned policy, a novel optimizer, a new environment, a
   scripted agent, an evaluation method, or an empirical study?
8. How were countries, starts, participant slots, retries, and randomness
   controlled?
9. Are the screenshots statistical evidence? How were their cases selected?
10. Name the two strongest acceptance and rejection arguments.
11. Identify any sentence or caption that sounds stronger than the evidence.
12. Would you vote accept, borderline, or reject at ICAART, and why?

Do not correct the reader while they answer. A misunderstanding is evidence
about the manuscript.

## Separate visual pass

Ask a second reader, or conduct a separately timestamped later pass, to inspect
only the title, abstract, tables, figures, captions, and conclusion. Those
elements should communicate:

- reliable Supalosa superiority on balanced HFO and replicated Peak;
- scoped, interpretable mechanisms rather than a general learned algorithm;
- literal all-building victory and only four HFO tick-cap draws;
- the negative Advanced transfer and bounded opponent scope;
- protocol-selected, illustrative rather than inferential screenshots; and
- existing-environment and established-optimizer boundaries.

## Pass criteria

Record each boundary as `unprompted`, `phase_b_only`, or `missing_or_wrong`.
The paper passes only if boundaries 1--3 appear unprompted and all six are
correct by the end of Phase B:

1. StrongBot reliably beats pinned Supalosa on HFO and the confirmed Peak
   policy improves control and wins reliably on fresh cases.
2. This does not imply general opponent or map superiority; Advanced reverses
   the result.
3. Chrono Divide is an existing environment.
4. StrongBot is a layered scripted agent and no general optimizer novelty is
   claimed.
5. The mechanism evidence is paired and scope-isolated, but does not identify
   every inherited-system interaction.
6. Screenshots are deterministic observations selected prospectively, not
   substitutes for aggregate evidence.

Classify requested edits as `paper_revision`, `future_prospective_study`, or
`no_change_with_reason`. Never answer a request for breadth by running post-hoc
games on opened populations.
