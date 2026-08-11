# Method-v2 policy-component ablation

Status: **frozen after the complete confirmatory and mechanism-diagnostic
results and before any component-ablation game**.

This final empirical study is a post-confirmatory diagnostic. It cannot change
the frozen champion, rescue the failed confirmatory joint gate, select a new
policy, or support a claim that method v2 reliably beats Supalosa. Its sole
purpose is to identify which groups of settings that distinguish the champion
from the original default policy contribute to performance on the already-open
development-family panel.

## Fixed component methods

The champion is policy
`ab0071009cbd5f1fc9e2f1a76a562455a0ebeacf77dac1cd9c13b9fc6374203f`.
Five variants each copy that policy and revert exactly one functional group to
the corresponding default-policy values:

- `revertDefenseGrowth` (policy
  `fbd4b6ad17b4e24e4087f729680db81fe13a69db1e4aa38625dc3711a9c22c3f`):
  `defenceRadiusIncreasePerTick`, 0.0001 to 0.00045;
- `revertEmergencyDefense` (policy
  `7e491f94ded1f63cbfbb661d957a986f902a65616bc5a8488984d4f42d8a08d9`):
  `emergencyDefenseRadius`, 64 to 48;
- `revertForceAttack` (policy
  `9e7ab6838a02daff07409ff73672d736eb36a444e7605fb3feee55a669dce8a0`):
  `forceAttackEnabled`, false to true, together with
  `forceAttackMinCombatants`, 4 to 10. The threshold is grouped with the
  switch because it is inactive while force attack is disabled;
- `revertScouting` (policy
  `be735d57597d0795de90dbb442be17ba309d5a57db6f52a4c726e99e3c788d4f`):
  `scoutCooldownTicks`, 45 to 120;
- `revertStrategy` (policy
  `31e4b9b8ba9ad47747c87eafe873211d3f45d3f7586870bbd64644ab06b76dc2`):
  `attackCompositionPolicy`, infantry to assault, together with
  `strategicPlan`, rush to macro.

These five groups exhaust every raw policy field that differs between the
champion and the default. The committed generator verifies the exhaustive diff,
the exact changed keys for each variant, and every canonical policy hash. The
groups are defined from policy bytes and functional coupling, not from any
component-ablation outcome.

## Fixed panel and allocation

Use the same ten already-open method-v2 development families used by phase 3
and the mechanism diagnostic. No test or reserve family is used. The private
role, development-unblinding artifact, pinned external Supalosa opponent, Iraq
mirror, candidate and baseline runtimes, map hashes, and 18,000-tick cap remain
hash-bound.

The engine-seed base is `80,000,000`. Families are sorted by frozen family ID
and assigned four fresh seed-block indices `4*f + b`, where `f=0..9` and
`b=0..3`. Each indivisible family-seed shard evaluates all six policies in both
reciprocal candidate slots under the same engine seed.

The exact allocation is 10 families x 4 seed blocks x 6 methods x 2 slots =
480 games in 40 twelve-game shards. There is no in-run retry. A failed shard may
receive another scheduler attempt only if every prior attempt is proven to have
stopped before its first `launch_counted` event. Any failure after launch fails
the complete diagnostic; successful or outcome-bearing games are never
selectively reused.

## Frozen analysis

For method `m`, family `f`, block `b`, and reciprocal slot `s`, let

$$
Y_{mfbs} \in \{0, 0.5, 1\}, \qquad
\bar Y_{mfb}=\frac{Y_{mfb0}+Y_{mfb1}}{2}.
$$

The single primary component contrast is

$$
D_{fb}=\bar Y_{\mathrm{champion},fb}
-\frac{1}{5}\sum_{a=1}^{5}\bar Y_{\mathrm{revert}a,fb}.
$$

It estimates whether the champion is stronger, on average, than policies with
one selected functional group removed. The estimate is the balanced mean over
all 40 blocks. Its family-clustered variance uses `G=10`, `N=40`, and

$$
\widehat V=\frac{G}{G-1}
\frac{\sum_f(\sum_b(D_{fb}-\bar D))^2}{N^2}.
$$

Report the two-sided 95% Student-t interval with 9 degrees of freedom and
critical value `2.2621571627409915`.

For each of the five secondary champion-minus-revert contrasts, report both an
unadjusted two-sided 95% family-clustered interval and a Bonferroni
familywise-95% interval across the five comparisons. The latter uses marginal
confidence 0.99 and the 9-degree-of-freedom critical value
`3.2498355440153697`. Report method scores and win/draw/loss records,
family-level estimates, and timing diagnostics. There is no pass/fail gate and
no policy selection; null, mixed, or negative effects are reportable outcomes.

## Interpretation boundary

A positive component contrast would support only the claim that the selected
setting group contributes on this open development panel, conditional on all
other champion settings. A null contrast is not proof of irrelevance, and the
single-revert design does not identify interactions among groups. No result
from this study changes the confirmatory test-family conclusion.
