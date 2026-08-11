# Method-v2 policy-component ablation result

Status: **complete; the aggregate component signal is suggestive, the strategy
group is the dominant individual signal, and no individual contrast clears the
prespecified familywise multiplicity interval**.

This document records the final post-confirmatory diagnostic specified in
`research/METHOD_V2_COMPONENT_ABLATION_PROTOCOL.md`. It cannot replace or
rescue the frozen confirmatory result. The complete private evidence remains
under `research-evidence/component-v2/champion-v2-4ada6ed`; the tracked
aggregate record is
`research/artifacts/method_v2_component_ablation_result_v1.json`.

## Execution integrity

- Frozen source commit: `4ada6ed1d260e77df5948226631630695022266e`.
- Slurm account and completed array: `pi_jss233`, `21938403`.
- Exact allocation: 10 open development families, 40 family-seed blocks, six
  methods, reciprocal starting slots, and 480 games.
- Scheduler accounting: 40 unique task IDs and 40 unique raw job IDs; all 40
  tasks completed with exit code `0:0`; no failed task or additional attempt.
- Technical-gate SHA-256:
  `66790dcbc94db5dc334c58915efd08f542e7b9d94102a7b03aa4d4dc18133a53`.
- Single-analysis SHA-256:
  `1bb149fc578a700a1476093b5d9c941b73582527fd57d6b5ad153a49517e6e94`.

An earlier source-bound campaign at commit `5b3cb03` and array `21938264`
failed uniformly while loading the private role, before creating a results
directory or any `launch_counted` event. Its zero-launch failure record is
preserved at SHA-256
`9481d3055d0f79c7b3bc021dbc95647cca52363d13ad3be346125881c3954b89`.
That campaign was retired and contributed no game to the completed analysis.
The routing repair was committed prospectively before the new campaign was
generated.

## Frozen primary result

The champion scored 0.60000 against the pinned Supalosa opponent. The equal
average of the five single-group revert policies scored 0.54250, giving a
champion-minus-revert-average estimate of 0.05750. Its two-sided
family-clustered 95% confidence interval is [-0.00347, 0.11847]. Nine family
contrasts are positive and one is negative. The primary signal is therefore
suggestive but not statistically resolved.

## Component contrasts

The strategy group is the dominant signal. Reverting infantry+rush to the
default assault+macro configuration lowers score from 0.60000 to 0.26875, a
champion-minus-revert estimate of 0.33125. The ordinary family-clustered 95%
interval is [0.09556, 0.56694]. The prespecified Bonferroni familywise-95%
interval across five component comparisons is [-0.00734, 0.66984], so this
individual contrast narrowly fails the multiplicity-controlled criterion.

The other point contrasts are small or favor the revert: defense-growth
-0.03750, emergency-defense +0.00625, force-attack -0.01250, and scouting
0.00000. Every ordinary and familywise interval for these contrasts includes
zero. Champion and `revertScouting` have identical score and win/draw/loss
records in all 80 games; terminal-state equivalence is evaluated separately
rather than inferred from outcomes alone.

## Independent reproduction

A separate Python implementation read all 480 raw completion records and
verified 80 common-seed reciprocal-slot cells. It reproduced every method
score, record, family contrast, clustered variance, standard error, ordinary
interval, and Bonferroni interval to floating-point precision. It also verified
matching engine seeds and starting positions across all six methods in every
paired cell.

## Claim boundary

The open-development diagnostic supports describing the strategy group as the
principal observed source of the champion's advantage over these one-group
reverts. It does not establish a multiplicity-controlled individual causal
effect, show that every selected setting is helpful, authorize a new policy,
or change the failed confirmatory absolute-strength gate. The null and negative
secondary estimates must be reported alongside the strategy signal.
