# HFO Soviet-west early-retarget screen V2 result

Status: **complete; no eligible policy**

## Identities

- Zero-update selector: job `23413776`, 162 initialized games, 40 selected
  cases, exactly ten per Soviet country, selection SHA-256
  `f6847cdf65280e18459c5821363ede23357fb9c0a32960231204c180323371dc`.
- Gameplay array: `23414470`, 200/200 tasks completed `0:0`.
- Finalizer: job `23414568`, completed `0:0`.
- Aggregate SHA-256:
  `43c3d72a679f883fe56e3fce81888eaf611b525b1119a4e6457b10e2651cd5d4`.
- Source commit:
  `edd3ad3d5729d7db268886754e1c1f8177c88f4a`.
- Program SHA-256:
  `5d561c5b6db1eff3e58f353aeaf1aa6702a392253c44ff74303394d7b2105b73`.
- Protocol SHA-256:
  `6ff62e2a32e3af9acad71e35d424dddedb096c02f6e7a5e4e4f61e6207545acc`.

## Results

| Arm | W | D | L | Improved | Worsened | Paired lower |
|---|---:|---:|---:|---:|---:|---:|
| Default | 10 | 14 | 16 | 0 | 0 | 0 |
| 42k calibration | 10 | 14 | 16 | 0 | 0 | 0 |
| Early 18k | 11 | 13 | 16 | 1 | 0 | -0.00856 |
| Early 24k | 11 | 13 | 16 | 1 | 0 | -0.00856 |
| Early 30k | 10 | 14 | 16 | 0 | 0 | 0 |

Neither early arm was eligible. Only Libya had wins exceed losses under the
early policies; Cuba and Russia remained substantially negative. The aggregate
status is `NO_ELIGIBLE_HFO_SOVIET_WEST_EARLY_RETARGET`.

## Interpretation and next step

Earlier building retargeting is safe but changes too few games. Soviet-west
weakness arises before late building closeout, particularly for Cuba and
Russia. Further retarget timing adjustments are not justified.

The next fresh screen transfers the already replicated west mechanisms that
act earlier: the rush production profile and grouped home guard. A factorial
default, rush-only, guard-only, and rush-plus-guard study will isolate their
effects across all four Soviet countries.
