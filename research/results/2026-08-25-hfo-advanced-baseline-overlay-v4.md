# HFO RA2Web-Advanced baseline-core overlay screen V4 result

Status: **complete; no baseline-core overlay was eligible**

## Identities and complete coverage

- Outcome-blind selector: job `23601449`, 283 initialized games, 72 selected
  country/start/slot cases, zero updates, and selection SHA-256
  `78526641090190494f8bb1035e990099b455a10e28fd05a227964838d51b8374`.
- The selection contains exactly eight cases per country, 18 per physical
  start, 36 per participant slot, and one case in each of the 72
  country/start/slot cells. No prohibited outcome field was emitted.
- Gameplay array: `23605494`, 360/360 tasks completed `0:0` under
  `pi_jss233`; no retry, replacement, exclusion, or early inspection
  occurred. All 360 cell checksums passed and all scheduler job IDs were
  unique.
- Finalizer: `23605495`, completed `0:0` after the full array.
- Aggregate SHA-256:
  `2f2cb598030b225e15f675b86d19b0993dca5d4509fc4751fa06cc40d0b4b8ce`.
- Source commit:
  `4c73fa67fb86eea186d7223d50f0341764212bac`.
- Program SHA-256:
  `156050c229d131216554e08919cd09df34734b99529d0fe3b4f904e5e2fa19f1`.
- Protocol SHA-256:
  `dcc1dbd1ef0b0881c84f1967652ee6dfdee002568564bbdb4428af3b9bd3fe3e`.
- Asset-manifest SHA-256:
  `d942117f24363818977d573dbc87006a9b320c6861bddf939d5fc80db2217e67`.
- External Supalosa commit:
  `165b77a71d0cf5ebd27c65b19d0486bcbae78d0f`.
- RA2Web client commit:
  `218fb800614295119e25040986b175fee4c3670f`.
- RA2Web client release: `0.84.1-r1d35349-dd6a17b9c`.
- RA2Web Advanced bundle SHA-256:
  `81d8797b6dd1371ba2dcbd79e25df8b42254290c820159e121a82650fd97a143`.
- RA2Web freeze-manifest SHA-256:
  `a405c0fc6d1d6541f965582c9b53be0bfd01c0c68f4d0f340e1a5ae37671aa5d`.

The immutable aggregate is stored outside Git at
`research-evidence/ra2web-opponents/advanced-overlay-v4/finalizer/`.

## Frozen arm results

Each arm used the same 72 cases. The paired score is W=1, D=0.5, L=0 minus
the external Supalosa score on the identical case. The paired lower bound is
the prespecified one-sided 90% bound; the win lower bound is one-sided 95%
Wilson.

| Arm | W/D/L | Win | Win lower | Mean score | Paired mean | Paired lower | Improved/tied/worsened | Eligible |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| External Supalosa | 36/5/31 | 50.00% | 40.48% | 0.5347 | 0 | 0 | 0/72/0 | Control only |
| Full overlay | 10/11/51 | 13.89% | 8.49% | 0.2153 | -0.3194 | -0.3944 | 4/37/31 | No |
| Guards only | 11/12/49 | 15.28% | 9.57% | 0.2361 | -0.2986 | -0.3782 | 6/35/31 | No |
| Assaults only | 11/8/53 | 15.28% | 9.57% | 0.2083 | -0.3264 | -0.4033 | 4/38/30 | No |
| Minimal overlay | 11/8/53 | 15.28% | 9.57% | 0.2083 | -0.3264 | -0.4054 | 4/37/31 | No |

The frozen descriptive ranking was `overlay_guards_only`,
`overlay_assaults_only`, `overlay_minimal`, `overlay_full`; there was no
winner. The best in-process arm lost 49 of 72 games and trailed external
Supalosa by 0.2986 paired score, with a strongly negative lower bound. Thus
the screen failed both its absolute and paired advancement gates by a wide
margin rather than by sampling noise near a threshold.

## Factorial effects

The four in-process arms form the frozen 2x2 guard-by-assault factorial.
Effects are on W=1, D=0.5, L=0 score.

| Contrast | Effect |
|---|---:|
| Guards on, averaged over assaults | +0.01736 |
| Assaults on, averaged over guards | -0.01042 |
| Guard-by-assault interaction | -0.02083 |

All three effects are tiny relative to the 0.30--0.33 paired deficit from
external Supalosa. The configurable guard and assault groups therefore do not
explain or repair the failure of the shared in-process architecture.

## Safety structure

No in-process arm passed faction, start, country, or slot safety. The leading
`overlay_guards_only` arm produced Allied 6/4/30 and Soviet 5/8/19. Its start
records were west 0/2/16, east 9/3/6, top 1/3/14, and bottom 1/4/13; its slot
records were 7/6/23 and 4/6/26. It lost more games than it won in every
country, including 0/0/8 for Americans and 0/1/7 for Confederation.

The external Supalosa control was much stronger but highly start-dependent:
0/0/18 west, 15/0/3 east, 11/0/7 top, and 10/5/3 bottom. Its pooled 36/5/31
record therefore does not establish robust superiority over Advanced, and it
would not have met the specialist safety gates even if controls were allowed
to advance.

## Interpretation

The result rejects the motivating hypothesis that exact Supalosa baseline
behavior can be recovered inside the current StrongBot/StrongStrategy wrapper
and then improved by adding or removing the configurable HFO guard and assault
groups. The nominally minimal in-process arm scored 11/8/53 while the pinned
external implementation scored 36/5/31 on identical cases. Because all four
in-process arms share common exact-map hooks and wrapper lifecycle behavior,
this comparison localizes the dominant deficit to that shared integration or
to behavior not exposed by the two overlay switches. It does not identify one
specific causal line of code.

The external control also reveals a hard west-start failure shared by all
arms. A successful Advanced specialist must address both the wrapper-level
gap and physical-start asymmetry; tuning only the tested overlay groups is not
credible.

This negative result does not weaken the separately frozen Supalosa claim:
the deployed StrongBot remains 633/24/63 on balanced HFO confirmation. It does
rule out deploying the V4 architectures behind the passed tick-1,200 opponent
detector.

## Prospective next step

Proceed to a parameterized Advanced-specific optimizer while retaining the
confirmed Supalosa expert unchanged. The optimizer must use a fresh,
outcome-blind balanced population; include explicit recovery of external
baseline behavior as a reference; optimize across all starts rather than
selecting the favorable east stratum; and freeze its search space, objective,
stage gates, and confirmation population before inspecting outcomes. The
first diagnostic priority is to separate common wrapper/exact-hook effects
