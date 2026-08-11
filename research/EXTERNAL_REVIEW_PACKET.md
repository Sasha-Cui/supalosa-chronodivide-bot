# Independent cold-read packet

Prepared: **2026-08-11**

This protocol is for the final human review that the authors cannot replace
with another internal audit. It tests whether the manuscript communicates its
actual bounded claim without repository context or author coaching.

## Frozen handoff identity

Use exactly one venue-formatted PDF in a review; do not ask the same reader to
compare formats.

| Candidate | Source commit | PDF SHA-256 |
| --- | --- | --- |
| LNCS / SCAG | `9f37a9e15f6676d94d121716c151b8f637c69fb5` | `93ae48646ea7ac1417a716efc12cda9d69f5b809bdbf2790499b176909ad8c88` |
| SCITEPRESS / ICAART | `9f37a9e15f6676d94d121716c151b8f637c69fb5` | `c756fa0fab503967df04b594ce8f18cd22429ef2ab8eb2cf1ec648f1c3608060` |

Record the selected hash before sending. If it does not match, stop and locate
the drift rather than asking the reader to review an unidentified build.
Before sending, copy `EXTERNAL_REVIEW_RESPONSE_TEMPLATE.md` into the private
submission record. Use that copy to lock Phase A, hash the returned responses,
score the four claim boundaries, and classify every requested change.

## Phase A: unprimed venue-style review

Send only the anonymous main PDF. Do not initially send the repository,
supplement, reviewer audit, result registry, or an explanation of the intended
takeaway. Do not send the targeted questions below yet: they reveal that a
stronger endpoint fails and that the comparator differs from the deployed
default, which would coach the read.

Ask the reader to spend at most 45 minutes on a normal regular-paper review.
For an ICAART-calibrated pass, give only this neutral prompt:

> Review this anonymous regular paper for relevance, originality, technical
> quality, significance, and presentation. Summarize its main claim, assign a
> 1--5 score with one-sentence justification for each criterion, identify the
> strongest acceptance and rejection arguments, list required versus optional
> revisions, and vote accept, borderline, or reject with confidence.

The reader must return and timestamp this review before receiving Phase B.
Preserve it verbatim. A missing claim boundary in Phase A is evidence about the
paper even if the reader later answers a targeted question correctly.

## Phase B: targeted comprehension audit

Only after locking the unprimed review, ask the reader to answer these before
discussing the paper with an author:

1. In one sentence, what is the paper's principal claim?
2. What result is positive, and what stronger result explicitly fails?
3. What are the units of training/test separation and statistical inference?
4. Did the authors inspect or adapt to the sealed test outcomes before the
   confirmatory evaluation? Explain the method-v1/method-v2 sequence as you
   understood it.
5. Is the contribution primarily a new algorithm, a new environment, a bot,
   an evaluation protocol, or an empirical case study?
6. What do the component reverts and terminal snapshots establish, and what do
   they not establish?
7. Name the two most serious threats to generalization.
8. Which paragraph, table, figure, or term was hardest to understand?
9. If reviewing for the selected venue, would you vote accept, borderline, or
   reject? Give the strongest reason for and against acceptance.
10. Identify every sentence that sounds stronger than the evidence.
11. Why is the frozen reference not the deployed StrongBot default, and what
    limitation follows from that choice?

Do not correct the reader during this questionnaire. A mistaken answer is
evidence of a manuscript communication failure, not a reader failure.

## Separate visual pass

A second reader, or the same reader on a later pass, should inspect only the
title, abstract, figures, tables, captions, and conclusion. Ask whether those
elements alone communicate all of the following:

- configured champion versus frozen-generic-reference improvement: 0.336 with a
  family-clustered 95% interval [0.215, 0.457];
- no comparison with the map-profile-enabled deployed StrongBot default;
- absolute superiority over Supalosa not established;
- 16 sealed map families and family-level inference;
- the gain is mostly avoided losses/tick-cap survival;
- one opponent, one faction mirror, one simulator version; and
- diagnostic, not causal, component and terminal-state evidence.

## Pass criteria

The manuscript passes the cold read only if the reader reports all four core
boundaries. At least core boundaries 1--3 should appear independently in the
unprimed Phase A review; Phase B checks all four precisely:

1. the positive claim is champion versus the frozen generic StrongBot reference,
   not champion versus Supalosa or the deployed StrongBot default;
2. Chrono Divide is an existing environment, not introduced by the paper;
3. the configuration routine uses established techniques and is not claimed as
   a novel optimizer; and
4. the component/terminal analyses are post-confirmatory and non-causal.

If a boundary appears only after its Phase B prompt, diagnose the corresponding
entry point before editing; do not assume that prompting repaired the paper.
Any wording change must be claim-preserving. A request for a new
outcome-bearing analysis should be recorded as future work, not executed on the
opened family population.

After both phases are locked, the supplement may be provided for a separate
reproducibility check. Do not let successful artifact use retroactively change
the unprimed manuscript review.

## Response record

Store the completed responses privately with:

- review date and manuscript commit/hash;
- reader's relevant background, without naming them in the anonymous paper;
- Phase A and Phase B timestamps, time spent, and whether the supplement was
  consulted afterward;
- the five criterion scores, overall vote, confidence, and verbatim review;
- each misunderstanding and the exact source edit made in response; and
- whether the four boundaries appeared unprompted or only after Phase B.

Use the private copy of `EXTERNAL_REVIEW_RESPONSE_TEMPLATE.md` for this record;
do not commit reviewer identity, correspondence, or completed answers.

After any edit, rerun the paper tests, citation/anonymity scan, page-limit check,
and full rendered-PDF inspection before changing the submission hashes.
