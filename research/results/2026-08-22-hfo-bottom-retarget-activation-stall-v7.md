# HFO bottom retarget activation-stall screen V7 result

Status: **complete; 1,200-tick activation stall advanced**

## Identities

- Zero-update selector: job `23106092`, 283 initialized games, 72 selected
  cases, exactly eight per country, selection SHA-256
  `7825bc53a71e8bfe1dc20e9f0947d26b7363e5e93d06fbf563c186d332de5280`.
- Gameplay array: `23106415`, 360/360 tasks completed `0:0` under
  `pi_jss233`; no retries, replacements, or exclusions.
- Finalizer: job `23106485`, completed `0:0` with empty stderr.
- Aggregate SHA-256:
  `fc3ce5cfa918fa824f0b3b0af6ddc1042cb50773aa44d9054735a9e32976f302`.
- Source commit:
  `d988602de62cfd9b2edca50f8c36a37cd01e70b7`.
- Program and cell-program SHA-256:
  `8e2c751699c320e73c2200ecdbf7fcf8eb431f916be2cef1c02315671c3ce127`.
- Protocol SHA-256:
  `37026115d6a1c9564883e618568a1424d23a1819441fd03374edd281df6e23d8`.

## Results

| Arm | W | D | L | Win rate | Wilson lower | Paired lower | Worsened |
|---|---:|---:|---:|---:|---:|---:|---:|
| Default | 32 | 26 | 14 | 44.44% | 35.19% | 0 | 0 |
| Current retarget | 57 | 2 | 13 | 79.17% | 70.31% | +0.13028 | 0 |
| Activation stall 600 | 56 | 3 | 13 | 77.78% | 68.80% | +0.12373 | 0 |
| Activation stall 1,200 | 57 | 2 | 13 | 79.17% | 70.31% | +0.13028 | 0 |
| Activation stall 2,400 | 54 | 5 | 13 | 75.00% | 65.80% | +0.11075 | 0 |

All nonzero-stall arms passed the frozen eligibility criteria. Wins exceeded
losses in all nine countries for every enabled arm.

## Frozen winner

Current retarget was a non-selectable calibration arm. Among eligible
nonzero-stall policies, all had 13 losses and zero worsened transitions.
The 1,200-tick arm had the most wins and fewest draws, so the frozen ranking
selected `activation_stall_1200`.

The aggregate status is
`ADVANCE_HFO_BOTTOM_RETARGET_ACTIVATION_STALL`.

## Interpretation and next step

A moderate pre-activation progress horizon retained the full draw-conversion
benefit in V7 while ensuring that retargeting did not worsen any paired case.
The 2,400-tick horizon was too conservative, and 600 ticks converted one fewer
draw than 1,200 ticks.

This is development evidence, not deployment authorization. The winner requires
a fresh 30-case-per-country replication against both default and current
retarget. It must remain loss-noninferior to both and pass the all-country
criteria before activation isolation.
