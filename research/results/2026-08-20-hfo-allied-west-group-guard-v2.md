# HFO Allied west group-guard V2 result

Status: **complete; `rush_guard_hold_9600` advances to fresh replication**

## Identities and completeness

- Zero-update selector: job `22790338`, 68 initialized games, 20 unique cases,
  selection SHA-256
  `bcf43db0c5d994750d9c14dd5378a4c30907a4de84d483269edf6d9682c9d2d4`.
- Gameplay array: `22790401`, 120/120 tasks completed `0:0` under
  `pi_jss233`; no retries or replacements.
- Finalizer: `22790402`, completed `0:0` with empty stderr.
- Aggregate SHA-256:
  `87f41f327226ccf1fa6ac778a2d6da30e9e68dac0ace72f3b92ef65facd4f8ac`.
- Source commit: `8e73c19a6fb940437431a70cd3388d0a47f8d2d4`.
- Protocol SHA-256:
  `d42b41ba625e01210ff45bccb06f8f98e14f3df535f38d3ed283df70017a7834`.

## Complete comparison

| Variant | W | D | L | Win rate | Eligible |
|---|---:|---:|---:|---:|---|
| `default` | 0 | 2 | 18 | 0% | no |
| `rush_tanks` | 0 | 10 | 10 | 0% | no |
| `hfo_guard_hold_9600` | 10 | 3 | 7 | 50% | no |
| `rush_guard_hold_9600` | 17 | 1 | 2 | 85% | yes |
| `rush_guard_group_9600` | 17 | 1 | 2 | 85% | yes |
| `rush_guard_hold_12000` | 0 | 1 | 19 | 0% | no |

The fixed ranking selected `rush_guard_hold_9600`. Against the identical
default cases it improved 18, tied one, and worsened one, with mean paired
W/D/L score difference `+0.825`.

Country results for the selected variant were:

| Country | W | D | L |
|---|---:|---:|---:|
| USA | 4 | 0 | 0 |
| Korea | 4 | 0 | 0 |
| France | 3 | 0 | 1 |
| Germany | 3 | 1 | 0 |
| Great Britain | 3 | 0 | 1 |

## Mechanism

The result supports the combination of `rush` production and a group hold
through tick 9,600. The original `hfoWestRush` production plus the same guard
improved substantially but reached only 10W/3D/7L, so coordinated assignment
alone is insufficient. Conversely, V1 `rush_tanks` survived without winning,
so production alone is also insufficient.

The parity and minus-four grouped-engagement thresholds were endpoint-identical
on all 20 cases; the threshold distinction was not activated or did not alter
orders in this population. Extending the hold to tick 12,000 destroyed the
benefit (0W/1D/19L), showing that the mechanism is a narrow handoff window, not
indefinite defensive play.

## Claim boundary

This is an open-development screen and cannot establish final performance.
The advancing variant remains opt-in and the deployed default remains
unchanged. It requires a larger fresh paired replication, then activation
isolation, before full all-country/all-start confirmation.
