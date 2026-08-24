# HFO Soviet-west retarget screen V1 result

Status: **complete; no eligible policy**

## Identities

- Zero-update selector: job `23408423`, 156 initialized games, 40 selected
  cases, exactly ten per Soviet country, selection SHA-256
  `6cf4fa9103ec5ecc8eb79053d0498373e715f493d029a6cd383269da59c47015`.
- Gameplay array: `23409142`, 160/160 tasks completed `0:0` under
  `pi_jss233`; no retries, replacements, or exclusions.
- Finalizer: job `23409216`, completed `0:0` with empty stderr.
- Aggregate SHA-256:
  `93c0509ae7df91b5811c42d050babbdd32584a21d623f0a12399157d4871035e`.
- Source commit:
  `490d1e70279ddfa3749f10b3d02a5a8c97286eb5`.
- Program and cell-program SHA-256:
  `5742626c723d617a00ec4f5728118218734efbcd41a4fc4565899f263e4e9ad9`.
- Protocol SHA-256:
  `46cd1fb44d8afe3ff2df9df2f6131b21d2af157fcd62d3d7e917f7dd9e9d9520`.

## Results

| Arm | W | D | L | Win rate | Paired lower | Improved | Worsened |
|---|---:|---:|---:|---:|---:|---:|---:|
| Default | 19 | 17 | 4 | 47.5% | 0 | 0 | 0 |
| Immediate retarget | 19 | 17 | 4 | 47.5% | -0.0302 | 1 | 1 |
| Activation stall 1,200 | 19 | 17 | 4 | 47.5% | 0 | 0 | 0 |
| Activation stall 2,400 | 19 | 17 | 4 | 47.5% | 0 | 0 | 0 |

All countries had more wins than losses under every arm, but neither
progress-gated arm changed any outcome. The aggregate status is
`NO_ELIGIBLE_HFO_SOVIET_WEST_RETARGET`.

## Interpretation and next step

The result falsifies transfer at the bottom-policy timing, not the building
retarget mechanism itself. The default median terminal tick was 30,774.5, and
16 of 17 draws were engine nonliteral terminations. A 42,000-tick activation
threshold therefore arrives after nearly every relevant draw has already
terminated.

The next prospective screen keeps the replicated 1,200-tick progress gate and
tests earlier west-specific eligibility at 18,000, 24,000, and 30,000 ticks on
fresh seeds. The controller remains disabled by default.
