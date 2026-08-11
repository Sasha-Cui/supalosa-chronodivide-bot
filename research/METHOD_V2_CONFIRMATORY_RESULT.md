# Method-v2 confirmatory result

Status: **complete; prespecified improvement passed, absolute-strength gate
failed, and therefore the joint success gate failed**.

This document records the result without changing the frozen protocol in
`research/CONFIRMATORY_PROTOCOL.md`. The complete private evidence remains under
`research-evidence/confirmatory-v2/champion-v2-698dc76`; the tracked aggregate
record is `research/artifacts/method_v2_confirmatory_result_v1.json`.

## Execution integrity

- Source commit: `698dc7601b61a80e091ce7b8ac2b9e681685bc69`.
- Slurm account and array: `pi_jss233`, `21925439`.
- Exact allocation: 16 families, 128 family-seed blocks, and 512 games.
- Scheduler accounting: 128 unique task job IDs, 128 completed tasks, no failed
  task, no additional attempt, and no post-launch retry.
- Technical gate SHA-256:
  `dc656b966933edde0bbec2911d11a44a0a1c4244d5aaf647cadfe1b043dbf523`.
- Single unblinding SHA-256:
  `2f55de50b4cb4a110b3d8d48a3734866e23fac954f2254ef47556bd041fc0cfb`.

The technical gate passed before any winner or score was read. The unblinder
then ran once and refuses overwrite.

## Prespecified results

The champion-minus-default score improvement is 0.33594. Its two-sided
family-clustered 95% confidence interval is [0.21456, 0.45732], entirely above
zero. Improvement is positive on 14 families, zero on two, and negative on
none. This component of the frozen confirmatory gate passes.

The champion's score against the pinned Supalosa opponent is 0.53516. The
estimated margin over 0.5 is 0.03516 with family-clustered standard error
0.03213. The prespecified one-sided 95% lower bound for the margin is -0.02117,
so the absolute-strength component fails. Six family scores exceed 0.5, five
equal 0.5, and five fall below 0.5.

Across 256 games per method, the default policy records 1 win, 100 draws, and
155 losses for score 0.19922. The champion records 47 wins, 180 draws, and 29
losses for score 0.53516. These records are descriptive; they do not override
the family-clustered inference.

## Independent sensitivity audit

A separate Python implementation reproduced all 512 raw completion records,
128 reciprocal-start blocks, point estimates, clustered standard errors, and
frozen bounds exactly. Post-confirmatory diagnostic checks also support the
improvement result: a 100,000-replicate family bootstrap gives a 95% interval
of [0.23047, 0.44727], and the exact family sign-flip two-sided p-value is
0.000122. The analogous family-bootstrap 95% interval for champion score is
[0.48242, 0.60352], reinforcing the uncertainty about absolute superiority.
These sensitivity analyses were not prespecified and cannot replace the frozen
gate.

## Claim boundary

The evidence supports the claim that the frozen training-and-selection pipeline
substantially improves this agent over its default policy when both are tested
against the same pinned Supalosa opponent and committed map-family population.
It does not support the stronger claim that the method-v2 champion reliably
beats Supalosa across map families. The paper must report both the passed
improvement component and the failed joint gate.
