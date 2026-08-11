# Independent cold-read packet

Prepared: **2026-08-11**

This protocol is for the final human review that the authors cannot replace
with another internal audit. It tests whether the manuscript communicates its
actual bounded claim without repository context or author coaching.

## What to send

Send only the anonymous main PDF. Do not initially send the repository,
supplement, reviewer audit, result registry, or an explanation of the intended
takeaway. Ask the reader to spend at most 45 minutes on a normal conference
review pass. After the cold read, the supplement may be provided for a separate
reproducibility check.

## Neutral reader questions

Ask the reader to answer these before discussing the paper with an author:

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
9. If reviewing for an applied game-AI workshop or special session, would you
   vote accept, borderline, or reject? Give the strongest reason for and
   against acceptance.
10. Identify every sentence that sounds stronger than the evidence.

Do not correct the reader during this questionnaire. A mistaken answer is
evidence of a manuscript communication failure, not a reader failure.

## Separate visual pass

A second reader, or the same reader on a later pass, should inspect only the
title, abstract, figures, tables, captions, and conclusion. Ask whether those
elements alone communicate all of the following:

- configured champion versus shipped-default improvement: 0.336 with a
  family-clustered 95% interval [0.215, 0.457];
- absolute superiority over Supalosa not established;
- 16 sealed map families and family-level inference;
- the gain is mostly avoided losses/tick-cap survival;
- one opponent, one faction mirror, one simulator version; and
- diagnostic, not causal, component and terminal-state evidence.

## Pass criteria

The manuscript passes the cold read only if the reader independently reports
all four core boundaries:

1. the positive claim is champion versus StrongBot default, not champion versus
   Supalosa;
2. Chrono Divide is an existing environment, not introduced by the paper;
3. the configuration routine uses established techniques and is not claimed as
   a novel optimizer; and
4. the component/terminal analyses are post-confirmatory and non-causal.

Any failure on these four items requires a wording or structure revision. A
request for a new outcome-bearing analysis should be recorded as future work,
not executed on the opened family population.

## Response record

Store the completed responses privately with:

- review date and manuscript commit/hash;
- reader's relevant background, without naming them in the anonymous paper;
- time spent and whether the supplement was consulted;
- each misunderstanding and the exact source edit made in response; and
- final accept/borderline/reject vote.

After any edit, rerun the paper tests, citation/anonymity scan, page-limit check,
and full rendered-PDF inspection before changing the submission hashes.
