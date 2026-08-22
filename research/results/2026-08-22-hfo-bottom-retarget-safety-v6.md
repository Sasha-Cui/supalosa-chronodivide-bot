# HFO bottom retarget safety-margin screen V6 result

Status: **complete; screen passed, but combatant margins did not improve losses**

## Identities

- Zero-update selector: job `23100807`, 303 initialized games, 72 selected
  cases, exactly eight per country, selection SHA-256
  `14caca7a132311d63f9aaef49b73c455661d54d01d9943e8e47579d6ce7caa07`.
- Gameplay array: `23101613`, 360/360 tasks completed `0:0` under
  `pi_jss233`; no retries, replacements, or exclusions.
- Finalizer: job `23101680`, completed `0:0` with empty stderr.
- Aggregate SHA-256:
  `5b373ee0c19f70080d73ac8f8697fe06ba37fca30fcb908f6c10204486541b3e`.
- Source commit:
  `edeb8459b76465c486b6dffabdbe3eb10d689f12`.
- Program and cell-program SHA-256:
  `a8f37f0ce28b5b620e6001821a42341a944029cf6906bffbcba821e019e2c9c3`.
- Protocol SHA-256:
  `b73836c8c9fa3baad4e809cf9742c3f372ae868be17392cb18215a420f7b6d65`.

## Results

| Arm | W | D | L | Win rate | Wilson lower | Paired lower | Worsened |
|---|---:|---:|---:|---:|---:|---:|---:|
| Default | 35 | 30 | 7 | 48.61% | 39.15% | 0 | 0 |
| Current retarget | 61 | 4 | 7 | 84.72% | 76.50% | +0.13028 | 1 |
| Advantage +2 | 60 | 5 | 7 | 83.33% | 74.93% | +0.12373 | 1 |
| Advantage +4 | 61 | 4 | 7 | 84.72% | 76.50% | +0.13305 | 0 |
| Zero enemy combatants | 45 | 20 | 7 | 62.50% | 52.82% | +0.03524 | 0 |

All four enabled arms passed the frozen eligibility criteria and had wins exceed
losses in all nine countries. Every arm was exactly loss-noninferior to default
at seven losses.

## Frozen winner and transition analysis

The safety-first ranking first minimized marginal losses, then maximized wins,
minimized draws, compared paired means, and finally used declaration order.
`current_retarget` and `advantage_4` tied on losses, wins, draws, and paired
mean. The declared order therefore selected `current_retarget`, and the
aggregate status is `ADVANCE_HFO_BOTTOM_RETARGET_SAFETY`.

The transition details reveal an important limitation:

- Current retarget: 27 draw-to-win, three draw-to-draw, one win-to-draw.
- Advantage +2: 26 draw-to-win, four draw-to-draw, one win-to-draw.
- Advantage +4: 26 draw-to-win, four draw-to-draw, zero worsened.
- Zero-enemy: 10 draw-to-win, 20 draw-to-draw, zero worsened.

Current and advantage +4 differed on two cases: each produced one win where the
other produced a draw. No combatant-margin arm reduced the marginal loss count
below either default or current retarget.

## Decision

V6 is a valid development-screen pass, but it does not override the larger V5
failure of `current_retarget`. Repeating the unchanged V5 policy for another
chance at loss non-inferiority would be unsound. The combatant-margin hypothesis
is therefore not advanced to large replication.

The next prospective mechanism delays first retarget activation until ordinary
play has made no building-damage progress for a fixed horizon. This targets
stuck draws while avoiding intervention in positions already progressing
toward a win. V6 seeds are barred from all later studies.
