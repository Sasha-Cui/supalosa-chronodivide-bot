# Advanced V8 Generation-2 gate operationalization

Status: frozen before any Generation-2 game or endpoint.

This note resolves implementation details already required by the original V8
protocol without changing its policies, cases, ranking, thresholds, or gates.
The original protocol remains immutable at SHA-256
`186ede4a712c68d2c0324dc350de4de8428f3b52cb55d344224b50934c447f88`.

## Inputs

- Generation-1 aggregate SHA-256:
  `186a9d4f7f456183f69379620d94b1afd727874debb8bb7f3a9f8f072a7db3c6`.
- Master selection SHA-256:
  `9730745e171ecc73531369ddfd8308700eec44a7586491852713806fb097f713`.
- Three runs, each containing the exact eight `generation2` policies emitted by
  the complete Generation-1 finalizer.
- Each run uses its already selected 72 all-start cases: nine countries, four
  physical starts, and two participant slots, exactly once per cell.
- Each run includes deployed StrongBot and pinned external Supalosa on the same
  72 cases. Total launch count is exactly `3 * 10 * 72 = 2,160` games.

## Score and uncertainty

Literal win, draw, and loss scores remain `1`, `0.5`, and `0`. Every paired
difference is candidate score minus deployed-StrongBot score on the identical
case.

The Generation-2 paired lower bound is the one-sided 90% Student-t bound over
72 paired differences, using frozen critical value `t(0.90, 71) = 1.29376`.
This continues the 90% search-stage convention used in Generations 0 and 1;
the explicitly stricter 95% bounds remain reserved for championship and final
replication.

## Noninferiority

For each required stratum, `noninferior` means that the mean paired score
difference versus deployed StrongBot is at least zero. There is no favorable
tolerance and no stratum pooling:

- both faction-side means must be at least zero;
- both participant-slot means must be at least zero;
- all four physical-start means must be at least zero; and
- at least eight of the nine country means must be at least zero.

The implementation must also verify that exactly two faction, two slot, four
start, and nine country strata are present before a candidate can pass.

## Run-winner decision

Candidates retain the original lexicographic ranking. A candidate is eligible
only if all of the following hold:

1. literal wins exceed literal losses overall;
2. the one-sided 90% paired lower bound is strictly above zero;
3. both factions are noninferior;
4. both participant slots are noninferior;
5. every physical start is noninferior; and
6. at least eight countries are noninferior.

Within each run, the highest-ranked eligible candidate is the single immutable
run winner. If no candidate is eligible, that run has no winner. Generation 2
passes only if at least one of the three runs has a winner. If all three runs
have no winner, V8 closes negative and championship, replication, and router
populations remain sealed.

No rejected policy may be revived, combined, hand-edited, or re-evaluated on a
favorable subset after this launch.
