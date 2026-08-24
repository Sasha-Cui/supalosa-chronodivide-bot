# HFO bottom activation-stall replication V8 result

Status: **complete; replication passed**

## Identities

- Zero-update selector: job `23113788`, 1,105 initialized games, 270
  selected cases, exactly 30 per country, selection SHA-256
  `9f0e2c7643141ea1ddcfa7592578e9fffdbeccd31d4dcadc6fc88b068364679c`.
- Gameplay array: `23381606`, 810/810 tasks completed `0:0` under
  `pi_jss233`; no retries, replacements, or exclusions.
- Finalizer: job `23381671`, completed `0:0` with empty stderr.
- Aggregate SHA-256:
  `05388312522c1bf99eb57aac5aa46ccd64e2a2b5812d2511ddc9cf033fd04427`.
- Source commit:
  `510242d8f242c5c459097f93ba9df9bb7aad2d13`.
- Program and cell-program SHA-256:
  `fa61b7b4ad7d782218036bdc603c121d1373c98c4e8674eec52ec44826284e9d`.
- Protocol SHA-256:
  `3268ddcebc86532891b0ddd6842ef5401ab5cd6d116ff6bea3177913a3e635c5`.

## Primary result

| Arm | W | D | L | Win rate | Loss rate | Wilson lower | Worsened |
|---|---:|---:|---:|---:|---:|---:|---:|
| Default | 123 | 98 | 49 | 45.56% | 18.15% | 40.64% | 0 |
| Current retarget | 204 | 16 | 50 | 75.56% | 18.52% | 71.01% | 3 |
| Activation stall 1,200 | 198 | 23 | 49 | 73.33% | 18.15% | 68.69% | 3 |

The V7 winner improved 77 cases, tied 190, and worsened three relative to
default. Its mean paired score gain was `+0.13889`, with a one-sided 95%
paired-t lower bound of `+0.11474`.

Relative to current retarget, the winner improved four cases, tied 257, and
worsened nine. Its mean score difference was `-0.00926`; direct superiority
to current retarget was not a frozen requirement.

## Country strata for the V7 winner

| Country | W | D | L |
|---|---:|---:|---:|
| USA | 18 | 6 | 6 |
| Korea | 21 | 1 | 8 |
| France | 16 | 3 | 11 |
| Germany | 17 | 4 | 9 |
| Great Britain | 18 | 4 | 8 |
| Libya | 27 | 2 | 1 |
| Iraq | 27 | 1 | 2 |
| Cuba | 28 | 0 | 2 |
| Russia | 26 | 2 | 2 |

Wins exceeded losses in every country.

## Frozen decision

The winner passed all nine preregistered criteria:

1. wins exceeded losses;
2. the Wilson lower bound exceeded one half;
3. draws were fewer than default;
4. losses equaled default at 49;
5. losses were below current retarget at 50;
6. the paired lower bound versus default exceeded zero;
7. every country was loss-noninferior;
8. every country had more wins than losses; and
9. worsened transitions equaled current retarget at three.

The status is `PASS_HFO_BOTTOM_ACTIVATION_STALL_REPLICATION`.

## Interpretation and boundary

Progress-gated activation preserves the large draw-conversion benefit while
meeting strict marginal loss non-inferiority on a large fresh all-country
sample. It trades six wins for seven additional draws relative to immediate
retarget, while preventing the one excess marginal loss observed for current
retarget on these cases.

This authorizes activation-isolation testing, not deployment. The policy
remains disabled until exact runtime inactivity is proven outside HFO bottom.
