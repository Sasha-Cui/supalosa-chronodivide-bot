# HFO Soviet-west rush and guard factorial screen V3

Status: **prospectively frozen before selection or outcomes**

## Motivation

Soviet-west retarget screens V1 and V2 did not materially change outcomes.
The weakness precedes late building closeout. V3 transfers the two mechanisms
that produced the replicated Allied-west improvement while testing them
separately: rush-oriented production and grouped home guarding.

## Fixed factorial arms

1. `default`: deployed Soviet-west policy.
2. `rush_only`: explicit HFO attack composition plus the rush strategic plan.
3. `guard_only`: grouped west home guard through tick 9,600, radius 72,
   six-tick ordering, four minimum combatants, zero engagement advantage, and
   non-Allied activation.
4. `rush_guard`: combine arms 2 and 3.

No arm enables Soviet-west building retargeting. Bottom and Allied-west
deployed policies are unchanged.

## Outcome-blind fresh cases

Use Libya, Iraq, Cuba, and Russia with seed base `4,256,000,000`. Select the
first ten zero-update west `39,82` versus east `151,119` cases per country
using ascending offsets and participant slots.

Require 40 unique cases, ten per country, zero updates, and no outcome fields.
All prior HFO seeds are barred.

## Gameplay

- Exact HFO/private Snow runtime and external same-country Supalosa.
- Literal all-buildings endpoint; 90,000 maximum ticks.
- 10,000 credits, `shortGame=false`, superweapons disabled.
- Symmetric resignation suppression.
- Run all four arms once per case: 160 games.
- No retry, replacement, selective rerun, or exclusion.
- At most 64 concurrent CPU tasks under `pi_jss233`.

## Frozen analysis and selection

Report W/D/L, one-sided 95% Wilson lower bounds, terminal summaries, country
strata, and paired W/D/L-score differences from default. Use the one-sided
95% paired-t lower bound with `df=39` and critical value `1.68488`.

An experimental arm advances only if:

1. wins exceed losses;
2. the Wilson lower bound exceeds 0.5;
3. draws are fewer than default;
4. losses are no greater than default;
5. paired lower bound exceeds zero;
6. every country has wins at least losses; and
7. at least three countries have wins exceed losses.

Rank eligible arms by fewer losses, fewer worsened cases, more wins, fewer
draws, larger paired mean, and declaration order. Report rush and guard main
effects and interaction descriptively from the four paired arms.

## After a pass

Replicate the fixed winner on at least 25 fresh cases per Soviet country
against default. Require loss non-inferiority, paired benefit, and all-country
strength, then activation isolation before deployment.

All V3 seeds are barred from replication and final confirmation.
