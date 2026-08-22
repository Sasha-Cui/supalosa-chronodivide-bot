# HFO bottom retarget activation-stall development screen V7

Status: **prospectively frozen before V7 selection or outcomes**

## Motivation

V5 showed that immediate late retarget activation can very rarely worsen a
defensible position. V6 showed that requiring a larger combatant advantage did
not reduce marginal losses: every enabled arm and default had seven losses.
The next mechanism therefore changes when the intervention begins, not army
size or target selection.

A progress gate lets ordinary play continue while it is already damaging enemy
buildings. Retargeting begins only after building count and aggregate building
hit points have failed to decrease for a fixed horizon.

## Fixed arms

1. `default`: deployed policy with bottom retargeting disabled.
2. `current_retarget`: V5/V6 retargeting with no pre-activation stall; this
   is a calibration control and cannot be selected for advancement.
3. `activation_stall_600`: require 600 ticks without building progress before
   first retarget activation.
4. `activation_stall_1200`: require 1,200 ticks without building progress.
5. `activation_stall_2400`: require 2,400 ticks without building progress.

Every enabled arm otherwise uses tick 42,000 eligibility, at least four
attackers, zero combatant-advantage margin, at most six enemy buildings and
four enemy combatants, six-tick orders, 600-tick post-activation stall and
rotation horizons, and `stalled_rotate` mode.

Once an arm activates, it remains activated and uses the unchanged V5 target
logic. No static defense or wide guard is enabled.

## Outcome-blind fresh cases

Use all nine countries and seed base `4,250,000,000`. For each country,
enumerate offsets 0 through 399 and both participant slots in ascending order.
Initialize with zero updates and select the first eight cases with candidate
bottom `88,157` and Supalosa top `88,34`.

Require 72 unique cases, exactly eight per country, zero updates, and no
outcome fields. Every V1 through V6 seed is barred. Selection must finish and
be hash-verified before gameplay.

## Gameplay

- Exact HFO/private Snow runtime and external same-country Supalosa.
- 10,000 credits, `shortGame=false`, superweapons disabled.
- Literal all-buildings endpoint with symmetric resignation suppression.
- 90,000 maximum ticks.
- Run all five arms once per case: 360 games.
- No retry, replacement, selective rerun, or outcome exclusion.
- Cap concurrency at 64 CPU tasks under `pi_jss233`.

## Frozen analysis and selection

For each arm report W/D/L, win and loss rates, one-sided 95% Wilson lower
bound, terminal summaries, country-level W/D/L, and paired W/D/L-score
differences from `default`. Score win=1, draw=0.5, loss=0. Use the one-sided
95% paired-t lower bound with `df=71` and critical value `1.66660`.

Only the three nonzero activation-stall arms are eligible. An arm advances
only if all of:

1. wins exceed losses overall;
2. the one-sided 95% Wilson lower bound for win probability exceeds 0.5;
3. draws are fewer than default draws;
4. losses are no greater than default losses;
5. the paired-score lower bound exceeds zero;
6. wins are at least losses in all nine countries; and
7. wins exceed losses in at least eight countries.

Rank eligible arms by fewer losses, fewer paired worsened cases, more wins,
fewer draws, larger paired mean, and declaration order. If no nonzero-stall
arm is eligible, V7 fails without weakening criteria.

## After V7

An eligible winner requires a larger fresh 30-case-per-country paired
replication against `default` and `current_retarget`. The winner must pass
loss non-inferiority and all-country gates before activation isolation or
deployment.

On failure, preserve the complete screen and continue prospective development.
All V7 seeds are barred from later replication and final confirmation.
