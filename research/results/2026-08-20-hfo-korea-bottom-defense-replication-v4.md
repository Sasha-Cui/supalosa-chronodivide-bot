# HFO Korea bottom defense replication V4 result

Status: **complete; replication failed and intervention rejected**

## Identities

- Zero-update selector: job `22812451`, 162 initialized games, 40 selected
  Korea-bottom cases, selection SHA-256
  `0f858a9b19d094715b3db80ed31db07abef5d612f21cf6bbde232cd0903c4ac7`.
- Gameplay array: `22813125`, 80/80 tasks completed `0:0` under
  `pi_jss233`; no retries, replacements, or exclusions.
- Finalizer: job `22813145`, completed `0:0` with empty stderr.
- Aggregate SHA-256:
  `788bf2ac4a5c4b50ac38b4e835216fdf6c9f58c6efa0848c2c5922ada12e1616`.
- Source commit:
  `4e784ad3140bf7f64b4a33feebaeb41698fba889`.
- Program and cell-program SHA-256:
  `974bb4291189de20366e006b0af34151376a6bbe4dc6dc6e5f7cdb6132e2417c`.
- Protocol SHA-256:
  `22a17499267e841e4b3de11633cb81c9c34597af1125c44667aa3328ca885f8c`.
- Asset-manifest SHA-256:
  `d942117f24363818977d573dbc87006a9b320c6861bddf939d5fc80db2217e67`.

## Primary result

| Arm | W | D | L | Win rate | Loss rate | One-sided 95% Wilson lower |
|---|---:|---:|---:|---:|---:|---:|
| Retarget control | 30 | 2 | 8 | 75.00% | 20.00% | 62.40% |
| Two pillboxes | 16 | 4 | 20 | 40.00% | 50.00% | 28.29% |

The two-pillbox arm improved three paired cases, tied 20, and worsened 17.
Its mean paired W/D/L score difference was `-0.325`, with a one-sided 95%
paired-t lower bound of `-0.46824`.

The arm failed every material frozen criterion: wins did not exceed losses, its
Wilson lower bound did not exceed one half, draws increased, losses were not
lower than control, and the paired lower bound was not positive. The final
status is `FAIL_HFO_KOREA_BOTTOM_DEFENSE_REPLICATION`.

## Interpretation

The favorable 12-case V3 screen did not replicate. Two early pillboxes are not
a valid component of the final policy. Four pillboxes and wide guarding were
already harmful in V3, so the complete evidence rejects early static-defense
investment rather than motivating a weaker threshold or selective rerun.

The unchanged retarget-only control was strong on the 40 fresh Korea cases.
Across the V2 Korea stratum, V3 control, and V4 control, retarget-only is
descriptively 39W/3D/15L on 57 distinct Korea-bottom cases. Across all
retarget-only bottom exposures in those three studies it is 71W/3D/23L on 97
distinct cases. These pooled numbers are secondary development evidence, not a
replacement for a prospectively frozen all-country replication.

## Decision

- Reject and do not deploy the static-defense intervention.
- Preserve V3 as a false-positive development screen.
- Keep the late stalled-rotate retarget mechanism unchanged.
- Run a larger fresh all-nine-country paired replication to resolve the
  original five-case-per-country V2 stratum uncertainty.
- Bar every V1 through V4 seed from later studies and final confirmation.
