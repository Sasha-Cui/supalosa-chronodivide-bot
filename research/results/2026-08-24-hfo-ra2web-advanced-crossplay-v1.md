# HFO RA2Web Advanced paired cross-play V1 result

Status: **complete; external-opponent transfer failed**

## Identities and complete coverage

- Outcome-blind selector: job `23435515`, 1,523 initialized games, 360
  selected cases, selection SHA-256
  `8c055e53428feeb932dec53271bb5d44d408a017e40605834c14fb70efddcfad`.
- Selection balance: 40 cases per country, 90 per physical start, 180 per
  participant slot, and five per each of 72 country/start/slot cells.
- Paired gameplay array: `23456957`, 720/720 tasks completed `0:0` under
  `pi_jss233`; no retry, replacement, or exclusion occurred.
- Finalizer: `23456958`, completed `0:0`.
- Aggregate SHA-256:
  `a287271ba7f223eac669556c8ab895819a55a3c05b06a4c370a21eccb685761d`.
- Source commit:
  `11331d198aff7679b7ed9bea61d8dcf936af1bad`.
- Program SHA-256:
  `94322c5c01ef6886e5b9745f706f1eeffa355dd911063986b1ea3d8010150e45`.
- Protocol SHA-256:
  `4c3b5482fd8cdfc865decc233a22e77a295512ad7ebfb8bd9b6adc3683d81a30`.
- External Supalosa commit:
  `165b77a71d0cf5ebd27c65b19d0486bcbae78d0f`.
- RA2Web client commit/release:
  `218fb800614295119e25040986b175fee4c3670f` /
  `0.84.1-r1d35349-dd6a17b9c`.
- Advanced bundle SHA-256:
  `81d8797b6dd1371ba2dcbd79e25df8b42254290c820159e121a82650fd97a143`.
- RA2Web freeze-manifest SHA-256:
  `a405c0fc6d1d6541f965582c9b53be0bfd01c0c68f4d0f340e1a5ae37671aa5d`.

The adjacent upstream Bot3 manifest reports a different bundle hash. As
prospectively specified, the actual frozen-byte hash above is authoritative.

## Primary external-opponent result

| First player versus RA2Web Advanced | W | D | L | Win rate | Wilson lower | Cluster lower |
|---|---:|---:|---:|---:|---:|---:|
| Deployed StrongBot | 79 | 19 | 262 | 21.94% | 18.57% | 13.46% |
| Pinned Supalosa | 178 | 30 | 152 | 49.44% | 45.13% | 38.28% |

On the paired W=1, D=0.5, L=0 score, StrongBot improved 35 cases, tied 182,
and worsened 143 relative to Supalosa against the same Advanced opponent. The
mean difference was `-0.29028`; the one-sided 95% lower bound was `-0.33892`
(`df=359`, `t=1.64913`). Every performance criterion failed; only complete
technical coverage passed.

## StrongBot strata

| Stratum | W | D | L | Win rate | One-sided 95% Wilson lower |
|---|---:|---:|---:|---:|---:|
| Allied | 10 | 3 | 187 | 5.00% | 3.01% |
| Soviet | 69 | 16 | 75 | 43.13% | 36.85% |
| Participant slot 0 | 38 | 9 | 133 | 21.11% | 16.55% |
| Participant slot 1 | 41 | 10 | 129 | 22.78% | 18.06% |
| West `39,82` | 11 | 4 | 75 | 12.22% | 7.62% |
| East `151,119` | 32 | 7 | 51 | 35.56% | 27.79% |
| Top `88,34` | 3 | 3 | 84 | 3.33% | 1.34% |
| Bottom `88,157` | 33 | 5 | 52 | 36.67% | 28.81% |

| Country | W | D | L | Win rate |
|---|---:|---:|---:|---:|
| USA | 0 | 0 | 40 | 0.00% |
| Korea | 2 | 1 | 37 | 5.00% |
| France | 1 | 1 | 38 | 2.50% |
| Germany | 6 | 0 | 34 | 15.00% |
| Great Britain | 1 | 1 | 38 | 2.50% |
| Libya | 17 | 6 | 17 | 42.50% |
| Iraq | 19 | 5 | 16 | 47.50% |
| Cuba | 15 | 1 | 24 | 37.50% |
| Russia | 18 | 4 | 18 | 45.00% |

StrongBot had wins exceed losses in only 8 of 36 country/start cells and was
noninferior in 9. No country-specific Wilson lower bound exceeded 0.5.

## Common-opponent mechanism finding

The failure is not explained by Advanced being uniformly unbeatable. Supalosa
was near parity overall but extremely start dependent:

| Supalosa versus Advanced start | W | D | L | Win rate |
|---|---:|---:|---:|---:|
| West | 0 | 0 | 90 | 0.00% |
| East | 68 | 2 | 20 | 75.56% |
| Top | 46 | 5 | 39 | 51.11% |
| Bottom | 64 | 23 | 3 | 71.11% |

The deployed policy improved the otherwise hopeless west start from 0 to 11
wins, but it regressed sharply at east, top, and bottom. The largest failure
was the Allied stratum, where StrongBot fell from Supalosa's 89/12/99 to
10/3/187. These prespecified strata identify start- and faction-conditional
opponent overfitting rather than a participant-slot artifact.

## Claim boundary and next step

This result does not alter the separately confirmed Supalosa claim: StrongBot
was 633/24/63 with strong pooled and clustered lower bounds on a disjoint
balanced sample. It does disprove any claim that those gains automatically
generalize to an independent opponent.

The next prospective study should isolate which profile families cause the
Advanced regression and test a robust mixture across both opponents. Candidate
mechanisms must be selected on fresh development cases, evaluated jointly
against Supalosa and Advanced, and required to preserve the already confirmed
Supalosa advantage. Favorable countries, starts, or opponents must not be
selected post hoc.

The paper should report this as a substantive analytical finding and limitation:
single-opponent optimization can produce decisive held-out gains against its
target while degrading performance against a behaviorally distinct bot. Map
diversity remains a separate open axis.
