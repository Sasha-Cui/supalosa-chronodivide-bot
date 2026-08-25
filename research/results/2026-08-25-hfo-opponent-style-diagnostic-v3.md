# HFO outcome-blind opponent-style diagnostic V3 result

Status: **complete; technical detector passed**

## Identities and complete coverage

- Zero-update selector: job `23589584`, 279 initialized games, 72 selected
  country/start/slot cases, selection SHA-256
  `99284319a6773a265c6632263fa9a401c012991600ff372c8b49b754311ce538`.
- Technical trace array: `23594585`, 144/144 tasks completed `0:0` under
  `pi_jss233`; no retry, replacement, or exclusion occurred.
- Finalizer: `23594586`, completed `0:0`.
- Aggregate SHA-256:
  `bbb9787f687a3d0d37561f0a2cabb6c1e661d2715975cc6fa221b27685bbd69a`.
- Source commit:
  `5a31589d6c35a1bc5fc7e280bf9824666d3c625a`.
- Program SHA-256:
  `77ee540e520e8d39280af51d8efa9e789a4a190eafcaf9d806fda197d06da5ba`.
- Protocol SHA-256:
  `586e36ebb82b6a0a8c8b61facd2a31fc331ce3ccc1c2e96aafeaf93d4032c91b`.
- External Supalosa commit:
  `165b77a71d0cf5ebd27c65b19d0486bcbae78d0f`.
- RA2Web client commit:
  `218fb800614295119e25040986b175fee4c3670f`.
- RA2Web Advanced bundle SHA-256:
  `81d8797b6dd1371ba2dcbd79e25df8b42254290c820159e121a82650fd97a143`.
- RA2Web freeze-manifest SHA-256:
  `a405c0fc6d1d6541f965582c9b53be0bfd01c0c68f4d0f340e1a5ae37671aa5d`.

All 72 country/start/slot cells were represented once for each opponent. Every
trace reached exactly 3,600 updates without an early engine finish or forwarded
resignation. Cells contained only fixed-tick public-state features and
technical metadata; no W/D/L, score, endpoint orientation, terminal building
count, or competitive rank was written.

## Selected detector

The earliest qualifying tick was **1,200**. The frozen full-data tree has depth
one and two leaves:

```text
if opponent credits <= 7,798:
    predict RA2Web Advanced
else:
    predict Supalosa
```

Across the 72 Advanced traces, tick-1,200 credits ranged from 7,689 to 7,759.
Across the 72 Supalosa traces they ranged from 7,837 to 7,866. The smallest
cross-class separation was 78 credits; the frozen midpoint threshold is 39
credits from the nearest value in either class.

The classifier uses only `GameApi.getPlayerData(opponent).credits`, which is
available to the policy at runtime. It does not use opponent name, class,
bundle identity, action calls, production queues, source metadata, country,
start, slot, seed, scheduler metadata, or competitive outcomes.

## Grouped generalization

At tick 1,200, all three prespecified grouped evaluations were perfect:

| Grouped holdout | Groups | Correct | Accuracy | Balanced accuracy | Supalosa recall | Advanced recall | Wilson lower |
|---|---:|---:|---:|---:|---:|---:|---:|
| Leave-country-out | 9 | 144/144 | 100% | 100% | 100% | 100% | 98.16% |
| Leave-start-out | 4 | 144/144 | 100% | 100% | 100% | 100% | 98.16% |
| Leave-slot-out | 2 | 144/144 | 100% | 100% | 100% | 100% | 98.16% |

Every one of the 72 paired cases had different opponent-state feature hashes at
every sampled tick, so the selected separation is not produced by missing or
duplicated traces.

## Fixed-tick sensitivity

| Tick | Qualifies | Leave-country accuracy | Leave-start accuracy | Leave-slot accuracy | Selected full-data tree |
|---:|---|---:|---:|---:|---|
| 300 | No | 72.22% | 100% | 100% | Credits, depth 3 |
| 600 | No | 72.22% | 100% | 100% | Credits, depth 3 |
| 900 | No | 100% | 94.44% | 100% | Credits, depth 3 |
| 1,200 | **Yes** | 100% | 100% | 100% | Credits, depth 1 |
| 1,800 | Yes | 100% | 100% | 100% | Credits, depth 1 |
| 2,400 | No | 100% | 93.06% | 100% | Minimum distance, depth 1 |
| 3,000 | Yes | 100% | 100% | 100% | Total hit points, depth 1 |
| 3,600 | No | 100% | 80.56% | 100% | Non-building count, depth 1 |

The nonmonotonic later-tick results justify the frozen earliest-tick rule rather
than choosing the latest or most visually separated snapshot post hoc.

## Interpretation and next step

V3 demonstrates that these two frozen opponent implementations induce a
strong, early, start/country/slot-invariant economic signature visible to the
policy. This makes an observation-conditioned mixture technically feasible
without exposing bundle identity.

The result is not a general opponent-recognition claim: the tree is specific to
the pinned Supalosa and Advanced versions and must be versioned with them. It
also provides no evidence that an adaptive policy is strong.

The next prospective stage retains the already confirmed Supalosa expert and
trains a separate Advanced specialist on balanced HFO cases. Only after that
specialist passes fresh development and replication gates may the frozen
tick-1,200 detector route between experts in a disjoint adaptive evaluation.
Misclassification, delayed routing, and the first 1,200 ticks under the common
pre-detection policy must be included in that evaluation rather than assumed
away.
