# Peak of Perfection profile-scope V1 Stage-0 result

Status: **complete; one prospectively selected champion authorized for sealed
replication**

## Identities and complete coverage

- Zero-update selector: job `23736451`, 433 initialized games, exactly 216
  unique selected cases, selection SHA-256
  `53a40a5af6edf754515d3506ef55b516a5ad10394ee92bd263d6c266b3e249a7`.
- Selection populations were exact and mutually unique: 36 development cases,
  with one case per country/start/slot cell, and 180 sealed replication cases,
  with five per cell. Replication was not inspected during Stage 0.
- Preserved deployed-policy smoke: job `23747911`, technically clean; no
  strength inference was made.
- Stage-0 array: `23751978`, exactly 216/216 tasks completed `0:0` under
  `pi_jss233`. The scheduler recorded one unique task index and job ID for
  every frozen arm/case cell, with no retry, replacement, or exclusion.
- Fail-closed finalizer: `23751979`, completed `0:0` only after the entire
  array.
- Aggregate SHA-256:
  `ca9d9b5ba1de0c00909a6e6c59768a9fa3686b45e8cc70183572723b1ed9229d`.
- Source commit:
  `a2b75590da7d19edb2f4178a5ec30d69faabdae7`.
- Cell/finalizer program SHA-256:
  `5341b9c2ac08d6d04fb69d5d5bc29e0ae7b30af0cca4b81e2b71eecd91bd2b1e`.
- Protocol SHA-256:
  `610caca135a049d582ed09d0f1cab477c2a5f5b5b7cab20c83f152e8363403ba`.
- Asset-manifest SHA-256:
  `d942117f24363818977d573dbc87006a9b320c6861bddf939d5fc80db2217e67`.
- Pinned Supalosa commit:
  `165b77a71d0cf5ebd27c65b19d0486bcbae78d0f`.
- Map: `cd_2_peak_of_perfection.map`, SHA-256
  `440715dc154ac10b4b922159824140d40c48990311c6838345b66958f3b3a442`.

All 216 cell completion markers, JSON checksums, empty stderr logs, source and
runtime identities, and aggregate rows passed an independent reconciliation.
The aggregate contains the same 216 unique scheduler IDs and rows as the
immutable cells. No resignation was forwarded.

## Frozen arm results

The deployed control scored 21W/1D/14L. Paired score assigns W=1, D=0.5, and
L=0 on each identical development case. The paired lower bound is the frozen
one-sided 90% t bound; the absolute lower bound is the one-sided 95% Wilson
bound.

| Arm | W/D/L | Wilson lower | Paired mean | Paired lower | Improved/tied/worsened | Starts 37,73 / 118,73 | Eligible |
|---|---:|---:|---:|---:|---:|---:|---|
| `strategy_both` | 30/1/5 | 0.7088 | +0.2500 | +0.1509 | 10/25/1 | 13/0/5 / 17/1/0 | Yes |
| `both_both` | 30/0/6 | 0.7088 | +0.2361 | +0.1442 | 9/27/0 | 13/0/5 / 17/0/1 | Yes |
| `historical_defensive_infantry` | 22/3/11 | 0.4742 | +0.0556 | -0.0337 | 6/27/3 | 10/3/5 / 12/0/6 | No |
| `bot_both` | 20/3/13 | 0.4202 | 0.0000 | -0.1377 | 8/19/9 | 13/0/5 / 7/3/8 | No |
| `historical_defensive_infantry_bot_both` | 14/8/14 | 0.2675 | -0.0972 | -0.2294 | 8/16/12 | 10/3/5 / 4/5/9 | No |

Both scope-factorial arms that extended the strategy profile passed every
frozen development gate. The deterministic ranking selected
`strategy_both` because its minimum-start win rate tied `both_both`, while
its paired lower bound was higher. Therefore there is exactly one unchanged
champion for replication; no post-hoc arm was created.

## Champion safety and mechanism

`strategy_both` changes only the strategy-profile start predicate: the
existing immutable Peak macro profile is applied at both reciprocal starts,
while bot/tactic scope remains deployed `weak_only`.

- Overall: 30W/1D/5L, 83.33% wins, one-sided 95% Wilson lower 70.88%.
- Paired against deployed: mean +0.2500, one-sided 90% lower +0.1509; ten
  improved cases, 25 ties, and one worsened case.
- Profiled start `(37,73)`: 13W/0D/5L; reciprocal start `(118,73)`:
  17W/1D/0L.
- Allied: 14W/1D/5L; Soviet: 16W/0D/0L.
- Candidate slot 0: 15W/0D/3L; candidate slot 1: 15W/1D/2L.
- All nine countries had wins at least losses, and eight had wins exceed
  losses.
- All 18 cases at the already-profiled `(37,73)` start were exactly
  trajectory- and endpoint-identical to deployed, establishing the frozen
  one-start isolation check.

The descriptive 2x2 factorial effects on paired score were:

- strategy-scope main effect: +0.2431;
- bot/tactic-scope main effect: -0.0069; and
- interaction: -0.0139.

This pattern supports the prespecified mechanism diagnosis: reciprocal macro
profile coverage, rather than reciprocal tactical special cases or the old
defensive-infantry seed, repaired the directional asymmetry in development.
It does not yet establish a confirmatory Peak claim.

## Gate audit

`strategy_both` passed every frozen Stage-0 condition:

1. wins exceeded losses;
2. paired mean and its one-sided 90% lower bound exceeded zero;
3. losses were fewer than the deployed control's 14;
4. both starts, both sides, and both slots had wins exceed losses;
5. every country had wins at least losses and eight of nine were strictly
   positive; and
6. all 18 weak-start pairs were trajectory- and endpoint-identical.

The exact scheduler reconciliation found 216 array tasks, task indices 0--215,
216 unique scheduler IDs, 216 `COMPLETED 0:0` records under `pi_jss233`,
and one clean finalizer. The scientific aggregate was opened only after these
conditions and the immutable finalizer marker were present.

## Consequence

Stage 0 is positive development evidence, not a final result. The protocol now
authorizes exactly 360 games: unchanged deployed and `strategy_both` on the
180 sealed replication cases selected before any Stage-0 outcome. The
replication result may support a map-specific all-country Peak claim only if
every frozen pooled, paired, start, side, slot, country, country-by-start
cluster, and weak-start identity gate passes.

The central HFO result remains unchanged: deployed StrongBot beat pinned
Supalosa 633W/24D/63L over 720 balanced games.
