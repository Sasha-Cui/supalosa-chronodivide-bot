# HFO multi-opponent specialization factorial screen V2

Status: **prospectively frozen before V2 selection or outcomes**

## Motivation and fixed question

The deployed policy was 633W/24D/63L against pinned Supalosa but only
79W/19D/262L against RA2Web Advanced. Paired common-opponent analysis showed
that the regression is not uniform: StrongBot improved Supalosa's 0/90 west
record to 11/4/75 but regressed sharply at east, top, and bottom, especially
for Allied countries.

V2 asks which of the two major HFO specialization layers causes this opponent
interaction and whether an existing coherent ablation is robustly above 50%
against both opponents without new tactical tuning.

## Frozen policy factorial

Compare exactly five first-player policies:

1. `deployed`: default StrongBot and StrongStrategy.
2. `profiles_off`: disable automatic map profiles in both StrongStrategy and
   StrongBot startup logic; retain exact-map tick tactics.
3. `exact_tactics_off`: retain automatic map profiles; disable StrongBot
   exact-map tick tactics.
4. `specialization_off`: disable both automatic map profiles and exact-map tick
   tactics; retain the global StrongStrategy defaults.
5. `external_supalosa`: exact pinned Supalosa calibration control.

The four StrongBot arms form a 2×2 profile-by-exact-tactics factorial. No
parameter within a layer is changed, and no opponent identity is exposed to a
policy. All policies are fixed before selection.

## Opponents and identities

Run every policy against both:

- exact external Supalosa commit
  `165b77a71d0cf5ebd27c65b19d0486bcbae78d0f`; and
- exact RA2Web Advanced bundle SHA-256
  `81d8797b6dd1371ba2dcbd79e25df8b42254290c820159e121a82650fd97a143`,
  freeze-manifest SHA-256
  `a405c0fc6d1d6541f965582c9b53be0bfd01c0c68f4d0f340e1a5ae37671aa5d`.

## Outcome-blind fresh cases

Use every country, physical HFO start, and designated first-player slot. For
country ordinal `c`, start ordinal `s`, slot `q`, and offset `o`, enumerate

$$
4{,}262{,}000{,}000 + 100{,}000c + 20{,}000s + 10{,}000q + o.
$$

Select the first exact-start case per country/start/slot cell with zero
updates. Require 72 unique cases, one for each cell, eight per country, 18 per
start, and 36 per slot. No outcome field is permitted. All V1 seeds are barred.

## Gameplay

Run every one of the five policies against both opponents on all 72 cases:
720 games. Use the exact HFO Snow runtime, mirrored countries, fixed physical
starts, literal all-building elimination, 90,000 ticks, 10,000 credits,
`shortGame=false`, superweapons disabled, and symmetric resignation
suppression.

No retry, replacement, selective rerun, exclusion, or early outcome access is
allowed. At most 64 CPU tasks may run concurrently under `pi_jss233`.

## Frozen analysis

For each policy/opponent pair report W/D/L, literal-win probability,
one-sided 95% Wilson lower bound, faction/start/slot/country strata, terminal
status and ticks, and W=1/D=0.5/L=0 paired score differences from `deployed`.

For development contrasts use the one-sided 90% paired-t lower bound with
`df=71` and `t=1.29376`. Report descriptive profile main effect, exact-tactics
main effect, and interaction separately for each opponent from the four
factorial arms.

## Advancement and ranking

A StrongBot ablation arm advances only if all of the following hold:

1. wins exceed losses against Supalosa;
2. its one-sided 95% Wilson lower bound against Supalosa exceeds 0.5;
3. wins exceed losses against Advanced;
4. its one-sided 95% Wilson lower bound against Advanced exceeds 0.5;
5. both Allied and Soviet records have wins at least losses against each
   opponent;
6. every physical start has wins at least losses against each opponent;
7. the paired score lower bound versus `deployed` against Advanced exceeds
   zero; and
8. the paired score lower bound versus `deployed` against Supalosa exceeds
   `-0.05`.

Rank eligible arms by the larger minimum of their two opponent win rates, then
larger mean win rate, fewer total losses, larger Advanced paired mean, and
declaration order. `external_supalosa` is calibration-only and cannot advance.

## After V2

On a pass, replicate the unchanged winner on at least five fresh cases per
country/start/slot cell against both opponents, with one-sided 95% uncertainty
and preservation of the already established Supalosa advantage. Only a
replicated policy may replace the deployed default.

On no pass, preserve the complete factorial. The result then justifies a
prospectively designed observation-conditioned or adversarial-training method;
it does not permit choosing favorable countries, starts, opponents, or
post-hoc parameter combinations.
