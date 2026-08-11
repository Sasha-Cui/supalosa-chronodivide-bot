# Method-v2 post-confirmatory mechanism ablation

Status: **frozen after the complete method-v2 confirmatory result and before any
new mechanism-ablation game**.

This is a diagnostic mechanism study, not a rescue of the failed confirmatory
joint gate. It cannot change the confirmatory result, select a new champion, or
support a claim that method v2 reliably beats Supalosa. Its sole purpose is to
test whether the training-only common-seed championship selected a policy that
performs better than the five ordinary per-run optimizer selections.

## Fixed methods and panel

The six policies already existed before any sealed-test outcome was opened:

- `champion`: policy
  `ab0071009cbd5f1fc9e2f1a76a562455a0ebeacf77dac1cd9c13b9fc6374203f`
  from the common-seed championship;
- `local0` through `local4`: the fixed `globalPolicyId` selected independently
  within optimizer runs 0 through 4.

All artifact and policy hashes are embedded in the committed generator. No
policy may be added, removed, mutated, or selected from these outcomes.

Use the same ten already-open method-v2 development families that formed the
phase-3 panel. The private role, development-unblinding artifact, clean Supalosa
opponent, Iraq mirror, candidate and baseline code, map hashes, and 18,000-tick
cap remain hash-bound. No sealed or previously confirmatory family is used.

## Allocation and attempts

The engine-seed base is `70,000,000`. Families are sorted by their frozen family
IDs and assigned four fresh seed-block indices `4*f + b`, where `f=0..9` and
`b=0..3`. Each family-seed shard evaluates all six policies in both reciprocal
candidate slots under the same engine seed.

The exact allocation is 10 families x 4 seed blocks x 6 methods x 2 slots = 480
games in 40 indivisible 12-game shards. There is no in-run retry. A failed shard
may receive another scheduler attempt only if every prior attempt is proven to
have stopped before its first `launch_counted` event. Any failure after launch
fails the complete diagnostic; successful or outcome-bearing games are never
selectively reused.

## Frozen analysis

For method `m`, family `f`, block `b`, and reciprocal slot `s`, let

$$
Y_{mfbs} \in \{0, 0.5, 1\}, \qquad
\bar Y_{mfb}=\frac{Y_{mfb0}+Y_{mfb1}}{2}.
$$

The mechanism contrast averages the five independently selected local policies
within each family-seed block:

$$
D_{fb}=\bar Y_{\mathrm{champion},fb}
-\frac{1}{5}\sum_{r=0}^{4}\bar Y_{\mathrm{local}r,fb}.
$$

The diagnostic estimate is the equally family-weighted mean over all 40 balanced
blocks. Its family-clustered variance uses `G=10`, `N=40`, and

$$
\widehat V=\frac{G}{G-1}
\frac{\sum_f(\sum_b(D_{fb}-\bar D))^2}{N^2}.
$$

Report the two-sided 95% Student-t interval with 9 degrees of freedom and
critical value `2.2621571627409915`. Also report each method's score and
win/draw/loss record, family estimates, and five champion-minus-local pairwise
family-clustered intervals. These are descriptive post-confirmatory diagnostics;
there is no pass/fail gate and no policy selection.

## Required optimizer audit

Independently re-rank every completed successive-halving stage using outcome
score only: descending macro outcome score, descending worst-family outcome
score, then ascending policy SHA-256. Report survivor-set overlap with the
original bounded terminal-material utility. This audit reuses training evidence
and launches no games. It diagnoses dependence on the tie term but cannot
counterfactually evaluate policies that the original halving path eliminated.
