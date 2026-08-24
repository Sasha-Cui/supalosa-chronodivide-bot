# HFO Soviet-west early-retarget development screen V2

Status: **prospectively frozen before selection or outcomes**

## Motivation

V1 found that the 42,000-tick bottom-derived threshold changed essentially no
Soviet-west outcomes because median termination occurred at tick 30,774.5.
V2 isolates west-specific activation timing while holding the replicated
1,200-tick progress gate and all target logic fixed.

## Fixed arms

1. `default`: deployed policy with Soviet-west retargeting disabled.
2. `current_42000`: 42,000-tick eligibility; calibration only.
3. `early_18000`: 18,000-tick eligibility and 1,200-tick progress stall.
4. `early_24000`: 24,000-tick eligibility and 1,200-tick progress stall.
5. `early_30000`: 30,000-tick eligibility and 1,200-tick progress stall.

Every enabled arm remains non-Allied-only at exact HFO west versus east, with
four minimum attackers, zero combatant-advantage margin, at most six enemy
buildings and four enemy combatants, six-tick orders, and 600-tick
post-activation progress and rotation horizons.

## Outcome-blind fresh cases

Use Libya, Iraq, Cuba, and Russia with seed base `4,255,000,000`. Select the
first ten zero-update west `39,82` versus east `151,119` cases per country
using ascending offsets and participant slots.

Require 40 unique cases, ten per country, zero updates, and no outcome fields.
All prior seeds are barred. Selection must complete before gameplay.

## Gameplay

- Exact HFO/private Snow runtime and external same-country Supalosa.
- Literal all-buildings endpoint; 90,000 maximum ticks.
- 10,000 credits, `shortGame=false`, superweapons disabled.
- Symmetric resignation suppression.
- Run all five arms once per case: 200 games.
- No retry, replacement, selective rerun, or exclusion.
- At most 64 concurrent CPU tasks under `pi_jss233`.

## Frozen analysis and selection

Report W/D/L, win and loss rates, one-sided 95% Wilson lower bounds, terminal
summaries, country strata, and paired W/D/L-score differences from default.
Use the one-sided 95% paired-t lower bound with `df=39` and critical value
`1.68488`.

Only the three early arms are eligible. An arm advances only if:

1. wins exceed losses;
2. the Wilson lower bound exceeds 0.5;
3. draws are fewer than default;
4. losses are no greater than default;
5. paired lower bound exceeds zero;
6. every country has wins at least losses; and
7. at least three countries have wins exceed losses.

Rank eligible arms by fewer losses, fewer worsened cases, more wins, fewer
draws, larger paired mean, and declaration order.

## After a pass

Replicate the fixed winner on at least 25 fresh cases per country against
default and 42,000-tick calibration. Require loss non-inferiority and
all-country paired benefit, followed by activation isolation.

All V2 seeds are barred from replication and final confirmation.
