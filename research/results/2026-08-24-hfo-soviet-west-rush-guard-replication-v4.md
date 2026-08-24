# HFO Soviet-west rush-and-guard paired replication V4 result

Status: **complete; replication passed**

## Identities

- Zero-update selector: job `23420021`, 492 initialized games, 120 selected
  cases, exactly 30 per Soviet country, selection SHA-256
  `453d31b9b8d0e168a790c61dfc618f358b0c578c80ee2533bd48c8da387d5940`.
- Gameplay array: `23420401`, 240/240 tasks completed `0:0` under account
  `pi_jss233`; no retry, replacement, or exclusion occurred.
- Finalizer: job `23420522`, completed `0:0`.
- Aggregate SHA-256:
  `9262dfa068f51a5ccdf8f7bd024e79f3a33db6ee715d50c2d508d5bad17af74e`.
- Source commit:
  `d31329c0cf19bc8169e02244b9321d3213d7de7e`.
- Program SHA-256:
  `797b69b89f655354a09d3b629366e125ef8f5870c9485c72a4b602eac4711959`.
- Protocol SHA-256:
  `83e5618803defd938b3ed712f5710fc294d5cddd1af6c6a5c0fefe3b420f1162`.
- Asset-manifest SHA-256:
  `d942117f24363818977d573dbc87006a9b320c6861bddf939d5fc80db2217e67`.

## Aggregate result

| Arm | W | D | L | Win rate | Loss rate | Wilson lower |
|---|---:|---:|---:|---:|---:|---:|
| Default | 47 | 43 | 30 | 39.17% | 25.00% | 32.15% |
| Rush plus guard | 98 | 9 | 13 | 81.67% | 10.83% | 75.18% |

On the prespecified paired W=1, D=0.5, L=0 score, the replicated policy
improved 60 cases, tied 46, and worsened 14. Its mean paired improvement was
`+0.28333`; the one-sided 95% paired-t lower bound was `+0.21143` with
`df=119` and critical value `1.65776`.

The winner passed every frozen criterion: wins exceeded losses, its Wilson
lower bound exceeded 0.5, draws decreased from 43 to 9, losses decreased from
30 to 13, its paired lower bound exceeded zero, and every country had more
wins than losses.

| Country | Default W/D/L | Rush plus guard W/D/L |
|---|---:|---:|
| Libya (`Africans`) | 10/9/11 | 24/4/2 |
| Iraq (`Arabs`) | 15/10/5 | 27/1/2 |
| Cuba (`Confederation`) | 10/13/7 | 22/3/5 |
| Russia (`Russians`) | 12/11/7 | 25/1/4 |

The replicated improvement is therefore not an Iraq-only effect. The weakest
replicated country record is Cuba at 22/3/5, while every country has at least
an 80% empirical win rate in this fixed HFO west-versus-east condition.

## Interpretation and next step

V4 independently replicates the V3 direction and exceeds its effect size. The
policy converts most default draws into wins while also reducing losses. This
supports a robust HFO Soviet-west mechanism: rush-oriented composition and
planning, combined with an early grouped home guard, reliably outperform the
deployed default against the pinned external Supalosa bot in this condition.

This is not yet a global all-start or all-map claim. The policy must first pass
outcome-blind activation isolation across all nine countries and all four HFO
starts, with exact inactivity outside Soviet west. Only then may the unchanged
mechanism be enabled by default and enter fresh held-out all-country/all-start
confirmation. All V4 seeds remain barred from that confirmation.
