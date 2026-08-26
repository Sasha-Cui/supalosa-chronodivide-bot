# HFO RA2Web-Advanced decorated-baseline V5 Stage-A result

Status: **complete; exact lifecycle-decorator equivalence passed**

## Identities and complete coverage

- Zero-update master selector: job `23629474`, completed `0:0` under
  `pi_jss233` after 3,766 initialized games.
- Selection SHA-256:
  `5ab1006be7d323d32a75bf0004303a062834827f58f4dee07aec3eac8df04cb0`.
- The selector produced all 954 mutually unique prespecified cases: 72 for
  equivalence; 18/36/72 for each of three optimizer runs; 144 for the
  championship; and 360 for replication. Every population has its exact
  country/start/slot/repeat balance, zero updates, and no prohibited outcome
  field.
- Equivalence gameplay array: `23639160`, 144/144 tasks completed `0:0`
  under `pi_jss233`; no retry, replacement, exclusion, or early inspection
  occurred.
- Fail-closed finalizer: `23639161`, completed `0:0` after the full array.
- Aggregate SHA-256:
  `dc823429f8c4d9d56496bdbcf12ea54faf5b6deaab85a5ad6e01a6ecb1d24d30`.
- Source commit:
  `6f0c1154459e717f08b518a3c8a6dedac5c813a5`.
- Program SHA-256:
  `586c125e458f1ebbb8dc344168f6f6937a2bf7042915f130e931d19e8644d99c`.
- Protocol SHA-256:
  `d83c2fef545de6cad22529a94f33b27b1a425de3d20f05dceae924476df973cb`.
- Asset-manifest SHA-256:
  `d942117f24363818977d573dbc87006a9b320c6861bddf939d5fc80db2217e67`.
- External Supalosa commit:
  `165b77a71d0cf5ebd27c65b19d0486bcbae78d0f`.
- RA2Web client commit and release:
  `218fb800614295119e25040986b175fee4c3670f`,
  `0.84.1-r1d35349-dd6a17b9c`.
- RA2Web Advanced bundle SHA-256:
  `81d8797b6dd1371ba2dcbd79e25df8b42254290c820159e121a82650fd97a143`.
- RA2Web freeze-manifest SHA-256:
  `a405c0fc6d1d6541f965582c9b53be0bfd01c0c68f4d0f340e1a5ae37671aa5d`.

All 144 scheduler job IDs were unique. Every cell checksum passed, all
forwarded resignation counts were zero, and the aggregate contains exactly 72
external and 72 decorated games with balanced countries, starts, and slots.
Raw evidence remains outside Git at
`research-evidence/ra2web-opponents/advanced-optimizer-v5/`.

## Exact equivalence result

The no-op decorator matched pinned external Supalosa on **72 of 72 paired
cases**. Every pair had identical:

- canonical trajectory SHA-256 over snapshots every 60 updates and at the
  literal endpoint;
- W/D/L orientation and literal terminal status;
- terminal update;
- terminal candidate/opponent building counts;
- terminal rule-level unit inventory;
- attempted and forwarded resignation audit; and
- W=1/D=0.5/L=0 score.

The paired summary was 0 improved, 72 tied, 0 worsened, mean difference zero,
and zero mismatches. Exact counts and mean difference were also zero in every
prespecified stratum:

| Stratum | Cases per level | Exact pairs | Score difference |
|---|---:|---:|---:|
| Country | 8 | 8/8 in all 9 countries | 0 in all levels |
| Physical start | 18 | 18/18 at all 4 starts | 0 in all levels |
| Participant slot | 36 | 36/36 in both slots | 0 in both levels |

This is stronger than endpoint noninferiority: on this balanced fresh sample,
the wrapper did not measurably perturb the complete normalized game trajectory.
It validates the lifecycle seam that V4 had incorrectly assumed.

## Calibration outcomes and targeted weakness

Both equivalent arms scored 35W/6D/31L against Advanced. These outcomes are a
calibration result, not a specialist claim. The complete start records were:

| Candidate start | W/D/L |
|---|---:|
| West `(39,82)` | 0/0/18 |
| East `(151,119)` | 12/3/3 |
| Top `(88,34)` | 9/0/9 |
| Bottom `(88,157)` | 14/3/1 |

The fresh population independently reproduces V4's west-start failure while
showing that east and bottom are already strong. This supports the frozen V5
choice to search a west-only decorator and require trajectory identity at all
non-west starts. It does not authorize excluding west or claiming pooled
superiority from the favorable starts.

## Interpretation and next step

Stage A resolves the integration blocker prospectively: a modular overlay can
be attached to the pinned external baseline without changing its behavior when
inactive. V5 Stage B may now proceed exactly as frozen: three deterministic
24-candidate samples from the 324-configuration west offense/defense space,
successive halving on the preselected populations, fresh all-start safety,
championship, and five-case-per-cell replication.

The confirmed deployed StrongBot Supalosa expert remains separate and
unchanged. Even a replicated standalone Advanced specialist will still require
a disjoint tick-1,200 shared-prefix handoff evaluation before an adaptive bot
claim is valid.
