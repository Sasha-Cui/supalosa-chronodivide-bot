# HFO bottom retarget all-country replication V5 result

Status: **complete; strong positive effect but frozen gate failed by one loss**

## Identities

- Zero-update selector: job `22869702`, 1,124 initialized games, 270
  selected cases, exactly 30 per country, selection SHA-256
  `97121543d1e323db114e9f24844da93702d0c94f23707fde2e0551828a69825d`.
- Gameplay array: `22872222`, 540/540 tasks completed `0:0` under
  `pi_jss233`; no retries, replacements, or exclusions.
- Finalizer: job `22872226`, completed `0:0` with empty stderr.
- Aggregate SHA-256:
  `ac100fa6a4f6f5e5e640c5f0a4464c0d22c1b75a45222ed251a4bc1a5a4c449c`.
- Source commit:
  `d95b2e99db02ddb52834f1bd1b27ccf744eeb203`.
- Program and cell-program SHA-256:
  `250bd308b6a17ba5e8ea7b8fa8d5d1f13faff0f9d6196e77cff15a66d17c68ff`.
- Protocol SHA-256:
  `ce0451f9387c09a07b14561fcebd3c084dd0dfe81743864add866f59f8401c03`.
- Asset-manifest SHA-256:
  `d942117f24363818977d573dbc87006a9b320c6861bddf939d5fc80db2217e67`.

## Primary result

| Arm | W | D | L | Win rate | Loss rate | One-sided 95% Wilson lower |
|---|---:|---:|---:|---:|---:|---:|
| Current policy | 113 | 103 | 54 | 41.85% | 20.00% | 37.02% |
| Stalled-rotate retarget | 204 | 11 | 55 | 75.56% | 20.37% | 71.01% |

The retarget arm's mean paired W/D/L score improvement was `+0.16667`;
its one-sided 95% paired-t lower bound was `+0.14104`. It improved 92
cases, tied 176, and worsened two.

## Country strata

| Country | W | D | L | Win rate |
|---|---:|---:|---:|---:|
| USA | 22 | 2 | 6 | 73.33% |
| Korea | 18 | 2 | 10 | 60.00% |
| France | 19 | 2 | 9 | 63.33% |
| Germany | 21 | 0 | 9 | 70.00% |
| Great Britain | 19 | 3 | 8 | 63.33% |
| Libya | 27 | 1 | 2 | 90.00% |
| Iraq | 24 | 0 | 6 | 80.00% |
| Cuba | 28 | 0 | 2 | 93.33% |
| Russia | 26 | 1 | 3 | 86.67% |

Retarget wins exceeded losses in all nine countries. Every country converted
at least seven default draws into wins.

## Paired transition decomposition

| Current-policy outcome | Retarget outcome | Cases |
|---|---|---:|
| Win | Win | 112 |
| Win | Loss | 1 |
| Draw | Win | 91 |
| Draw | Draw | 11 |
| Draw | Loss | 1 |
| Loss | Win | 1 |
| Loss | Loss | 53 |

The two worsened cases were one Iraq draw-to-loss and one Cuba win-to-loss.
A France loss converted to a win. The net marginal loss count was therefore
55 versus 54 despite the much larger win and paired-score improvements.

## Frozen decision

V5 passed six of seven preregistered criteria:

1. wins exceeded losses overall;
2. the win-rate Wilson lower bound exceeded one half;
3. draws fell from 103 to 11;
4. the paired lower bound exceeded zero;
5. wins were at least losses in all nine countries; and
6. wins exceeded losses in all nine countries.

It failed only loss non-inferiority because `55 > 54`. The status remains
`FAIL_HFO_BOTTOM_ALL_COUNTRY_REPLICATION`. The criterion is not weakened and
the retarget controller remains disabled by default.

## Scientific interpretation and next step

The progress-aware building retarget mechanism has a large, highly consistent
draw-conversion effect. The remaining defect is rare but real: continuous
late-game attack reassignment can worsen a defensible state. The next
prospective development stage tests safety margins on retarget activation,
with the current retarget policy and deployed policy retained as controls.
Fresh seeds, complete paired arms, and a new replication are required before
deployment.
