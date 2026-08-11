# Method-v2 mechanism-ablation result

Status: **complete; the championship champion is directionally stronger than
the five independently selected run-local policies, but the family-clustered
interval includes zero**.

This document records the post-confirmatory diagnostic specified in
`research/METHOD_V2_MECHANISM_ABLATION_PROTOCOL.md`. It cannot replace or
rescue the frozen confirmatory result. The complete private evidence remains
under `research-evidence/mechanism-v2/champion-v2-29ced1d`; the tracked
aggregate record is
`research/artifacts/method_v2_mechanism_ablation_result_v1.json`.

## Execution integrity

- Source commit: `29ced1d76c39acf63f73ba6951c6d537e4335a9f`.
- Slurm account and array: `pi_jss233`, `21928633`.
- Exact allocation: 10 open development families, 40 family-seed blocks, six
  methods, reciprocal starting slots, and 480 games.
- Scheduler accounting: 40 unique task IDs and 40 unique raw job IDs; all 40
  tasks completed with exit code `0:0`; no failure, extra attempt, or selective
  rerun.
- Technical-gate SHA-256:
  `6a31736e54bad88d030e79eb10b2cdcd9f44d09e1c1a0d17f7476ffb102fdb91`.
- Single-analysis SHA-256:
  `75651cccbfd52430196578a8306eff84ab35d9a6dfd4dca5ffcab515cb7e64fc`.

The technical gate accounted for all 480 launches before any outcome was read.
The analyzer then ran once and refuses overwrite.

## Frozen result

The champion scored 0.58125 against the pinned Supalosa opponent. The equal
average score of the five independently selected optimizer-run policies was
0.49875, giving a champion-minus-local-average estimate of 0.08250. Its
two-sided family-clustered 95% confidence interval is [-0.02679, 0.19179].
Seven family contrasts are positive, one is zero, and two are negative.

The champion's descriptive record is 19 wins, 55 draws, and 6 losses in 80
games. The five local-policy scores are 0.56250, 0.47500, 0.45000, 0.47500,
and 0.53125. Every champion-minus-local point estimate is positive, ranging
from 0.01875 to 0.13125, but every corresponding family-clustered 95% interval
includes zero.

## Independent reproduction

A separate Python implementation read all 480 raw completion records and
verified 80 common-seed, reciprocal-slot cells. It reproduced every method
score, family contrast, pairwise estimate, clustered variance, standard error,
and confidence bound to floating-point precision. It also verified that the
engine seed and starting positions matched across all six methods within each
paired cell.

## Claim boundary

The diagnostic is consistent with the common-seed championship selecting a
policy that is better on average than ordinary per-run selections. Ten open
development families do not resolve that mechanism contrast statistically,
so the paper must describe it as suggestive rather than established. This
result authorizes no policy selection, test-family reanalysis, or claim that
the champion reliably beats Supalosa.
