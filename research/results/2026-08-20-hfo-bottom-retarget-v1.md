# HFO bottom building-retarget V1 result

Status: **complete; no variant eligible under V1**

## Identities

- Zero-update selector: job `22797426`, 89 initialized games, 18 selected
  cases, selection SHA-256
  `608da3a2e886f00e3e1b060cadc389aea449ebf0aef781e214a2cef09cfefa1b`.
- Gameplay array: `22797651`, 108/108 tasks completed `0:0` under
  `pi_jss233`; no retries or replacements.
- Finalizer: `22797652`, completed `0:0` with empty stderr.
- Aggregate SHA-256:
  `f6504a193f686218c95cba3c38bcc569d0d856d0aeacdb42600676de392af6ac`.
- Source commit: `062cad641e535e6716ef499f11de4b5ed2e70819`.
- Protocol SHA-256:
  `b5179e0e1d1c8d48a79730543e0b83506b312d180dfa86d3cf61a59832136cfc`.

## Complete result

| Variant | W | D | L | Paired improved/tied/worsened | V1 eligible |
|---|---:|---:|---:|---:|---|
| `default` | 13 | 3 | 2 | 0/18/0 | no |
| `stalled_rotate_600` | 16 | 0 | 2 | 3/15/0 | no |
| `stalled_rotate_1200` | 16 | 0 | 2 | 3/15/0 | no |
| `round_robin_600` | 16 | 0 | 2 | 3/15/0 | no |
| `top_first_600` | 16 | 0 | 2 | 3/15/0 | no |
| `split_buildings` | 16 | 0 | 2 | 3/15/0 | no |

All retarget variants were endpoint-identical case by case. They converted
three default draws into literal wins, left every other case unchanged, and
were non-inferior in all nine country strata. The fixed ranking selected
`stalled_rotate_600` by declaration order.

## Why V1 did not advance

V1 required loss rate strictly below default. Both default and every retarget
variant lost 2/18, so the requirement failed even though draws fell from three
to zero and wins rose from 13 to 16. The V1 status remains
`NO_ELIGIBLE_HFO_BOTTOM_RETARGET`; its criterion is not reinterpreted.

## Next question

The identical variants show that the causal component is building-only late
takeover rather than the exact rotation mode in this sample. A fresh larger
paired replication will test whether `stalled_rotate_600` reliably converts
draws to wins while keeping losses no greater than default. Its non-inferiority
criterion is fixed prospectively for that new question.

The controller remains disabled by default pending replication and isolation.
