# Method-v2 confirmatory protocol

Status: **frozen after the development gate passed and before any sealed-test
identity was opened**.

This protocol controls the only confirmatory evaluation of the fixed method-v2
champion. It does not permit method changes, family selection, sample-size
adaptation, or outcome inspection before the single aggregate unblinding.

## Fixed inputs

- Champion artifact SHA-256:
  `40a53c142fa30725ea5d22032d4b6dfcda4f358e15e1b8d36ac6a102b76e9ee1`.
- Champion policy ID:
  `ab0071009cbd5f1fc9e2f1a76a562455a0ebeacf77dac1cd9c13b9fc6374203f`.
- Default policy ID:
  `8fc9e46aba10fb84d7283e16a4ccde12d3e3e429c29d5caca5b42dd5a25cef4a`.
- Passing development artifact SHA-256:
  `2d07f8d0bec8befb470342081e4753d0e910d7aa211873f8ea11aed3ecd0202d`.
- Private test-role artifact commitment:
  `63c22710de11e3490260fb78ed9246456eaf0bca9dec6bffdf266b7e5cf4e8b2`.
- Test-role commitment:
  `2f6dcce3c9021f050bc84eae69ea12b9fd094af8b78bf0567724ac4a156f4716`.

The source commit is the clean `main` revision containing this protocol, the
separate confirmatory runner, technical gate, and unblinder. Campaign generation
captures and freezes its source, compiled runtime trees, game API, lockfile, and
independently loaded Supalosa baseline. Those bytes cannot change through the
technical gate and unblinding.

## Frozen schedule

Use all 16 sealed test families. Rank them only after this protocol is committed
by ascending
`SHA-256("chrono-divide-confirmatory-v1\0" + family_id)`. The rank affects only
seed assignment and cannot exclude a family.

The engine-seed base is `60,000,000`. Family rank `r` and seed ordinal `b` use
seed-block index `8*r + b`, for `r=0..15` and `b=0..7`. Each shard contains one
family-seed block and exactly four games: champion and default crossed with two
reciprocal candidate slots. Both participants use Iraq, the tick cap is 18,000,
and all candidate, baseline, engine, and participant random seeds are recorded.

The allocation is therefore 16 families x 8 seed blocks x 2 methods x 2 slots
= 512 component games in 128 indivisible shards.

## Attempts and technical failures

There is no in-run retry and the launched-game hard cap is 512. An exact shard
may have at most two additional scheduler attempts only when every prior attempt
is proven to have stopped before its first `launch_counted` event. Any failure
after launch permanently fails the campaign; no successful shard or outcome is
reused in a selective repair. All attempts and exact job IDs remain preserved.

The technical gate must reconcile all 128 plans, 512 launches and completions,
source/runtime commitments, role/map hashes, policies, methods, seeds, slots,
sealed summaries, private event streams, authoritative account `pi_jss233`, and
128 unique scheduler job IDs. It emits no winner, score, or family result.

## Single analysis

For family `f`, seed block `b`, and reciprocal slot `s`, define

$$
d_{fbs}=Y_{\mathrm{champion},fbs}-Y_{\mathrm{default},fbs},
\qquad D_{fb}=\frac{d_{fb0}+d_{fb1}}{2}.
$$

The equally family-weighted improvement is the mean of all 128 balanced blocks.
With residual `e_fb`, `G=16`, and `N=128`, its frozen variance is

$$
\widehat V=\frac{G}{G-1}\frac{\sum_f(\sum_b e_{fb})^2}{N^2}.
$$

The two-sided 95% interval uses Student's t with 15 degrees of freedom and
critical value `2.131449545559323`. Confirmatory improvement succeeds only if
the interval's lower endpoint exceeds zero.

Apply the same family-cluster formula to reciprocal-start champion block scores.
The one-sided 95% lower bound for champion score minus 0.5 uses critical value
`1.7530503556925547` and must also exceed zero. Both variances must be finite and
positive. Both gates are required; neither can be replaced by a subgroup,
family sign count, alternative variance estimator, or extra seed.

The unblinder runs once, refuses overwrite, and reports every method, family,
and timing diagnostic regardless of direction. Once any test outcome is opened,
the complete result is final and reportable. Claims are limited to the frozen
Chrono Divide runtime, test-family construction, Iraq mirror setting, and pinned
Supalosa opponent.
