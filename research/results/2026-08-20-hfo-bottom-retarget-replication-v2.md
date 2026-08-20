# HFO bottom retarget replication V2 result

Status: **complete; failed all-country criterion**

## Identities

- Zero-update selector: job `22799750`, 159 initialized games, 45 selected
  cases, selection SHA-256
  `e7e10d8c33bd218392f52f49d96e4c559319e1d1ba129e5748a7cdec038369c0`.
- Gameplay array: `22800166`, 90/90 tasks completed `0:0` under
  `pi_jss233`; no retries or replacements.
- Finalizer: `22800167`, completed `0:0` with empty stderr.
- Aggregate SHA-256:
  `b7f02640fefe3cbe1e5e18f232454ec163b84505a4742042e1e5db095ee5d523`.
- Source commit: `182b488f530e130f2639c6c79953313ef1534af0`.
- Protocol SHA-256:
  `b3603a37c62067a03af6e5ab8aad9eb8a9b95eb3f9956ff2ae3d67a9e6bd5718`.

## Result

| Arm | W | D | L | Win rate | One-sided 95% Wilson lower |
|---|---:|---:|---:|---:|---:|
| Default | 21 | 13 | 11 | 46.67% | 34.97% |
| Retarget | 34 | 0 | 11 | 75.56% | 63.77% |

Retarget improved 13 paired cases, tied 32, and worsened none. The mean paired
W/D/L score gain was `+0.14444`; its one-sided 95% paired-t lower bound was
`+0.08704`. Every default draw converted to a retarget win, while losses were
exactly non-inferior at 11 in both arms.

## Country result for retarget

| Country | W | D | L |
|---|---:|---:|---:|
| USA | 3 | 0 | 2 |
| Korea | 2 | 0 | 3 |
| France | 3 | 0 | 2 |
| Germany | 3 | 0 | 2 |
| Great Britain | 4 | 0 | 1 |
| Libya | 5 | 0 | 0 |
| Iraq | 5 | 0 | 0 |
| Cuba | 5 | 0 | 0 |
| Russia | 4 | 0 | 1 |

V2 passed pooled, Wilson, draw-reduction, loss-noninferiority, paired, and
eight-country criteria. It failed only the preregistered requirement that wins
be at least losses in every country, because Korea was 2W/3L. Its status remains
`FAIL_HFO_BOTTOM_RETARGET_REPLICATION` and the controller remains disabled.

The three Korea losses ended at ticks 19,447, 41,535, and 49,468. A late
building retarget cannot repair the earliest loss and did not change any loss
relative to default. The next development question is Korean bottom survival,
with retarget held fixed.
