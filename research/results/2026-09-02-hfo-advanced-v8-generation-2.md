# HFO Advanced V8 Generation 2

## Decision

`FAIL_HFO_ADVANCED_V8_GENERATION_2` is the decisive V8 scientific result.
There were zero eligible candidates and zero run winners. V8 therefore closes
negative under its frozen stop rule. Championship, replication, and adaptive
routing populations remain sealed.

No partial cell or outcome was inspected. Analysis began only after all 2,160
cells and the fail-closed finalizer completed with exit `0:0`.

## Immutable identity

- Array job: `24461735`, exactly 2,160 tasks on `pi_jss233`.
- Afterok finalizer: `24461736`, completed `0:0`.
- Source commit: `1e02bc490f51875af60ef7a6b5f1e3691b5e3f93`.
- Program SHA-256:
  `a111cd1a8c2c1a4935b0a596a7a3ca332ef9c7f12f5f46756280e4db3aea0429`.
- Original protocol SHA-256:
  `186ede4a712c68d2c0324dc350de4de8428f3b52cb55d344224b50934c447f88`.
- Gate-operationalization SHA-256:
  `35cdc52419c761c92d3de2d04e90f79d514f674cd621cfcc99e04961b545d4f3`.
- Selection SHA-256:
  `9730745e171ecc73531369ddfd8308700eec44a7586491852713806fb097f713`.
- Generation-1 aggregate SHA-256:
  `186a9d4f7f456183f69379620d94b1afd727874debb8bb7f3a9f8f072a7db3c6`.
- Asset-manifest SHA-256:
  `d942117f24363818977d573dbc87006a9b320c6861bddf939d5fc80db2217e67`.
- Pinned Supalosa commit: `165b77a71d0cf5ebd27c65b19d0486bcbae78d0f`.
- Pinned RA2Web client commit: `218fb800614295119e25040986b175fee4c3670f`.
- Advanced bundle SHA-256:
  `81d8797b6dd1371ba2dcbd79e25df8b42254290c820159e121a82650fd97a143`.
- Aggregate SHA-256:
  `607133b318b5cd24c5a25e8e272d1050cf3146078866354bb4160789d36c7775`.

The finalizer verified all scheduler task identities, ten arms and 72 fresh
country/start/slot cases per run, cell checksums, source/runtime/opponent
hashes, the prior aggregate binding, exact 2/2/4/9 stratum presence, and zero
forwarded resignations.

## Complete Generation-2 evidence

Across 24 policy arms and 1,728 balanced all-start games, synthesized policies
produced `5W/254D/1469L`. No policy won more than one of 72 games. No policy had
a positive paired point estimate or paired lower bound versus deployed
StrongBot.

The controls over the three all-start populations were:

| Control | W/D/L | Score rate by run |
|---|---:|---|
| Deployed StrongBot | 47/12/157 | 0.2292, 0.2778, 0.2292 |
| Pinned external Supalosa | 102/10/104 | 0.4653, 0.5556, 0.4653 |

External Supalosa's near-parity all-start result contrasts sharply with its
`0W/0D/54L` west-only Generation-0 controls. This is direct evidence that the
Advanced matchup is strongly conditioned by starting position; it is not
evidence that external Supalosa reliably beats Advanced.

| Run | Rank-0 hash prefix | W/D/L | Paired mean | One-sided 90% lower |
|---:|---|---:|---:|---:|
| 0 | `24251f4e552d` | 0/14/58 | -0.1319 | -0.1877 |
| 1 | `4efef366cafe` | 0/6/66 | -0.2361 | -0.2988 |
| 2 | `a027162d4a26` | 0/12/60 | -0.1458 | -0.2116 |

Every rank-0 policy failed wins-exceed-losses, paired-lower, faction, slot,
start, and country gates. Across all 24 policies, zero candidates were
eligible. Run 1 contained the only literal policy wins, but those arms were
only `1W/9D/62L`, with paired mean `-0.2014` and lower bound `-0.2636`.

## V8 synthesis conclusion

Across Generations 0--2, V8 evaluated 168 synthesized policy arms in 5,184
policy games and obtained `6W/425D/4753L`. The outcome-blind interface and
ownership gates passed, but the frozen public-state grammar plus local
mutation/crossover search did not produce a competitive Advanced specialist.

No V8 policy may be revived, combined, hand-edited, or sent to championship.
The proper conclusion is that this method failed, not that more seeds would
validate it.

The next empirical stage is the prospectively specified broad multi-map suite.
It should quantify StrongBot and pinned external Supalosa across map families,
physical starts, countries, and slots before any new Advanced method is
designed. The all-start control evidence makes map/start coverage a central
experimental factor rather than an optional robustness check.
