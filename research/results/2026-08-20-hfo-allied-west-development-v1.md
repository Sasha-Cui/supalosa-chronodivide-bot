# HFO Allied west development screen V1 result

Status: **complete; no variant eligible**

## Identities

- Outcome-blind selector: Slurm job `22788876`, 70 initialized games, zero
  updates, 20 selected cases, selection SHA-256
  `0324553bf0f1b9f11b2fb632f0d8cb35b0bf18da93a62092cd25aeb6c26ccaaf`.
- Gameplay array: `22788929`, 120/120 tasks completed `0:0` under
  `pi_jss233`, with 120 cell artifacts and no nonempty stderr.
- Finalizer: `22788930`, completed `0:0`.
- Aggregate SHA-256:
  `e9b6da65d9547e723fb9cebb58beef6d8ad3c7164e55f98cc24768667f6ebfb3`.
- Source commit: `6ef12bddd98f0ac1cd551df88d31df1d1e057e1f`.
- Protocol SHA-256:
  `17ee5ad3dcb1688566b641912f4e9bab1957d7eb2ddd9dc1ce04b0ed9cf985a1`.
- No game was retried, replaced, or filtered.

## Complete result

| Variant | W | D | L | Wins minus losses | Eligible |
|---|---:|---:|---:|---:|---|
| `default` | 1 | 2 | 17 | -16 | no |
| `rush_tanks` | 0 | 10 | 10 | -10 | no |
| `rush_infantry` | 0 | 10 | 10 | -10 | no |
| `rush_assault` | 0 | 10 | 10 | -10 | no |
| `antiinf_assault` | 0 | 0 | 20 | -20 | no |
| `rush_assault_pillbox` | 0 | 3 | 17 | -17 | no |

The fixed ranking selected `rush_tanks`, but it failed every advancement
criterion. It improved nine paired cases, tied nine, and worsened two relative
to default, for a mean paired W/D/L score change of `+0.15`.

## Mechanistic interpretation

The three `rush` composition variants were endpoint-identical case by case.
Therefore changing attack-mission composition did not causally affect this
screen; strategic-plan production and exact-map controllers dominated it.

All ten `rush_tanks` draws reached tick 60,000. Supalosa retained all 18
buildings in every draw, while StrongBot retained one building in nine cases and
two in one case. This is survival without offensive conversion, not an improved
winning policy. The anti-infantry plan accelerated defeat, and pillboxes did not
repair the opening.

The result supports a second development mechanism that changes early unit
assignment rather than production alone. It does not support deploying any V1
variant or weakening the preregistered advancement threshold.

## Reducer note

V1's per-country `medianTicks` fields serialized as `null` because the reducer
used the 20-game median indices inside four-game groups. All W/D/L counts,
eligibility checks, paired differences, aggregate medians, and ranking are
unaffected. The median implementation is corrected prospectively for V2.
