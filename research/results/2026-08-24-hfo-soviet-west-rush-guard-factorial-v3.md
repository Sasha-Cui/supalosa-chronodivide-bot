# HFO Soviet-west rush-and-guard factorial V3 result

Status: **complete; rush-plus-guard advances to replication**

## Identities

- Zero-update selector: job `23417811`, 148 initialized games, 40 selected
  cases, exactly ten per Soviet country, selection SHA-256
  `ddb31c1485aa3fdbb9ac6e46b55c7e1a192681f084c731b6535728a7687f0c01`.
- Gameplay array: `23418090`, 160/160 tasks completed `0:0` under account
  `pi_jss233`; exact child job IDs are retained in the aggregate artifact.
- Finalizer: job `23418165`, completed `0:0`.
- Aggregate SHA-256:
  `142174c7e63cc6c6f61c726f5801b34ddd18814a70f5214636b18577b7e34a84`.
- Source commit:
  `0c00fbf8fe502d0b9f676f8e234187b4c4376ed0`.
- Program SHA-256:
  `b80c34dab791dc8b9d80db668d9152e984ece618a851fd5c5be2d34372a75127`.
- Protocol SHA-256:
  `2e994f09bc00d519588c244f52472af94f2f8a280e2431104a7536a513cfe12f`.

## Results

| Arm | W | D | L | Wilson lower | Improved | Tied | Worsened | Paired mean | Paired lower | Eligible |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Default | 18 | 13 | 9 | 0.32791 | 0 | 40 | 0 | 0 | 0 | No |
| Rush only | 30 | 3 | 7 | 0.62403 | 18 | 17 | 5 | 0.1750 | 0.04163 | Yes |
| Guard only | 8 | 22 | 10 | 0.11655 | 10 | 11 | 19 | -0.1375 | -0.27894 | No |
| Rush plus guard | 29 | 6 | 5 | 0.59746 | 17 | 16 | 7 | 0.1875 | 0.04382 | Yes |

The frozen ranker selected `rush_guard` because it had two fewer losses than
`rush_only`, despite one fewer win and three more draws. It passed every
prespecified advancement gate: wins exceeded losses, its one-sided 95% Wilson
lower bound exceeded 0.5, it reduced draws and losses relative to default,
its paired one-sided 95% lower bound exceeded zero, and every country had more
wins than losses.

| Country | Default W/D/L | Rush only W/D/L | Guard only W/D/L | Rush plus guard W/D/L |
|---|---:|---:|---:|---:|
| Libya (`Africans`) | 5/2/3 | 6/2/2 | 1/5/4 | 9/1/0 |
| Iraq (`Arabs`) | 6/2/2 | 7/1/2 | 2/5/3 | 8/0/2 |
| Cuba (`Confederation`) | 5/3/2 | 8/0/2 | 3/6/1 | 6/1/3 |
| Russia (`Russians`) | 2/6/2 | 9/0/1 | 2/6/2 | 6/4/0 |

On the W=1, D=0.5, L=0 paired score, the descriptive factorial effects were
`+0.2500` for rush, `-0.0625` for guard, and `+0.1500` for the rush-by-guard
interaction. These are mechanism diagnostics, not separately powered
confirmatory claims. The combined policy appears to trade some rush-only wins
for fewer losses overall, with especially strong Libya and Iraq results.

## Interpretation and next step

This is the first prospectively screened positive Soviet-west result. It is a
development finding, not yet evidence that the deployed bot reliably beats
Supalosa: the cases were selected for this screen, the sample is only ten per
country, and the winning arm was selected among three experimental arms.

Per the frozen protocol, replicate the unchanged `rush_guard` policy against
default on at least 25 fresh cases per Soviet country. Require loss
non-inferiority, positive paired benefit, and all-country strength, then run
activation isolation before deployment. All V3 seeds remain barred from that
replication and from final confirmation.
