# Deployed HFO all-country, all-start confirmatory V1 result

Status: **complete; all prespecified criteria passed**

## Identities and complete coverage

- Initial infrastructure-only selector job `23423069` failed before any game
  initialization because it queried fields absent from the lightweight baseline
  descriptor. It produced no selection or outcome. Commit `f8d5a99` replaced
  that assumption with direct Git verification of the same pinned baseline.
- Outcome-blind selector: job `23423098`, 2,886 initialized games, 720 selected
  cases, selection SHA-256
  `7702fd3e895c4604714e3f176342a5d7445a96dbce06fbd1d3e7b6023053a247`.
- The selection contains exactly 80 cases per country, 180 per candidate start,
  360 per participant slot, and ten per each of 72 country/start/slot cells.
- Gameplay array: `23425662`, 720/720 tasks completed `0:0` under
  `pi_jss233`; no retry, replacement, or exclusion occurred.
- Finalizer: job `23425663`, completed `0:0`.
- Aggregate SHA-256:
  `a734acf077540793e309834f0bda7bcd4a34fde9f95d5457921303bb8d743cc8`.
- Source commit:
  `f8d5a9961a6e1dd2746cd5c03b6b0793ba73ba02`.
- Program SHA-256:
  `b3d721321f5585c3ada0e380567deb973db6445a784400c210aec3303d01d3f3`.
- Protocol SHA-256:
  `3d89955d144c1ce4f8b86bd8a6f6780c377e346c0403a3f8595b70a61ecae089`.
- Asset-manifest SHA-256:
  `d942117f24363818977d573dbc87006a9b320c6861bddf939d5fc80db2217e67`.
- External Supalosa commit:
  `165b77a71d0cf5ebd27c65b19d0486bcbae78d0f`.

## Primary result

The deployed StrongBot won **633**, drew **24**, and lost **63** of 720 games.
Its literal all-buildings win rate was **87.92%**. The one-sided 95% Wilson
lower bound was **85.78%**, well above the frozen 50% superiority threshold.

Treating each of the 36 country/start cells as an equal-weight cluster gave the
same balanced mean win rate, **87.92%**, with sample standard deviation
`0.12152` across cell means. The one-sided 95% clustered lower bound was
**84.49%** (`df=35`, `t=1.68957`).

All eleven frozen checks passed:

- complete 720-game coverage;
- pooled wins exceeded losses;
- pooled Wilson and cell-clustered lower bounds exceeded 0.5;
- all four start-specific lower bounds exceeded 0.5;
- both faction-specific and participant-slot lower bounds exceeded 0.5;
- every country had wins exceed losses;
- all nine country-specific Wilson lower bounds exceeded 0.5, exceeding the
  requirement of seven;
- all 36 country/start cells had wins exceed losses, exceeding the requirement
  of 30 and leaving no inferior cell.

## Prespecified strata

| Stratum | W | D | L | Win rate | One-sided 95% Wilson lower |
|---|---:|---:|---:|---:|---:|
| Allied | 338 | 17 | 45 | 84.50% | 81.29% |
| Soviet | 295 | 7 | 18 | 92.19% | 89.35% |
| Participant slot 0 | 320 | 15 | 25 | 88.89% | 85.87% |
| Participant slot 1 | 313 | 9 | 38 | 86.94% | 83.75% |
| West `39,82` | 152 | 14 | 14 | 84.44% | 79.49% |
| East `151,119` | 177 | 0 | 3 | 98.33% | 95.90% |
| Top `88,34` | 167 | 0 | 13 | 92.78% | 88.93% |
| Bottom `88,157` | 137 | 10 | 33 | 76.11% | 70.52% |

| Country | W | D | L | Win rate | One-sided 95% Wilson lower |
|---|---:|---:|---:|---:|---:|
| USA | 69 | 3 | 8 | 86.25% | 78.72% |
| Korea | 65 | 4 | 11 | 81.25% | 73.09% |
| France | 70 | 2 | 8 | 87.50% | 80.17% |
| Germany | 64 | 4 | 12 | 80.00% | 71.72% |
| Great Britain | 70 | 4 | 6 | 87.50% | 80.17% |
| Libya | 73 | 2 | 5 | 91.25% | 84.61% |
| Iraq | 77 | 2 | 1 | 96.25% | 90.98% |
| Cuba | 72 | 2 | 6 | 90.00% | 83.11% |
| Russia | 73 | 1 | 6 | 91.25% | 84.61% |

## Complete country-by-start W/D/L matrix

| Country | West | East | Top | Bottom |
|---|---:|---:|---:|---:|
| USA | 17/2/1 | 19/0/1 | 19/0/1 | 14/1/5 |
| Korea | 18/1/1 | 20/0/0 | 16/0/4 | 11/3/6 |
| France | 18/1/1 | 19/0/1 | 19/0/1 | 14/1/5 |
| Germany | 14/3/3 | 19/0/1 | 19/0/1 | 12/1/7 |
| Great Britain | 17/2/1 | 20/0/0 | 20/0/0 | 13/2/5 |
| Libya | 18/1/1 | 20/0/0 | 18/0/2 | 17/1/2 |
| Iraq | 18/1/1 | 20/0/0 | 20/0/0 | 19/1/0 |
| Cuba | 16/2/2 | 20/0/0 | 18/0/2 | 18/0/2 |
| Russia | 16/1/3 | 20/0/0 | 18/0/2 | 19/0/1 |

Median terminal time was 21,711 ticks. Descriptive linear-interpolated terminal
tick quantiles at 10%, 25%, 50%, 75%, 90%, 95%, and 99% were respectively
19,350; 20,002; 21,711; 35,613; 44,637; 49,859; and 79,943 ticks. Four draws
reached the 90,000-tick cap; the other 20 draws were engine nonliteral
terminations under symmetric resignation suppression.

## Supported claim and remaining boundary

This result supports a strong fresh-seed statement: under the pinned literal
HFO runtime and a balanced distribution over nine countries,
four physical starts, and both participant slots, the deployed bot reliably
beats pinned external Supalosa. The result is not an Iraq-only effect, a
favorable-start artifact, or a participant-slot artifact.

It does not yet establish broad superiority across arbitrary maps or opponent
implementations. The next paper stage is external validity on at least one
additional map family and an independently sourced RA2Web bot, plus fixed
mechanism ablations, uncertainty figures, and annotated qualitative replays.
