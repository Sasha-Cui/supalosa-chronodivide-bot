# HFO Soviet-west rush-and-guard paired replication V4

Status: **prospectively frozen before V4 selection or outcomes**

## Fixed question and arms

V3 selected `rush_guard` after a four-arm factorial development screen. V4
asks whether that exact selected policy replicates across all four Soviet
countries on fresh west-versus-east initializations.

Compare exactly two arms:

1. `default`: deployed policy with no Soviet-west experimental override.
2. `winner_rush_guard`: the unchanged V3 winner, comprising:
   - explicit HFO attack composition;
   - the rush strategic plan;
   - grouped west home guard through tick 9,600, radius 72, six-tick ordering,
     four minimum combatants, zero engagement advantage, and
     `alliedOnly=false`.

No arm enables Soviet-west building retargeting. Bottom and Allied-west
deployed policies remain unchanged.

## Outcome-blind fresh cases

Use Libya, Iraq, Cuba, and Russia with seed base `4,257,000,000`. For each
country, enumerate offsets 0 through 399 and both participant slots in
ascending order. Initialize with zero updates and select the first 30 cases
with candidate west `39,82` and Supalosa east `151,119`.

Require 120 unique cases, exactly 30 per country, zero updates, and no outcome
fields. Every seed from V1 through V3 is barred. Selection must complete and
be hash-verified before gameplay.

## Gameplay

- Exact HFO/private Snow runtime and external same-country Supalosa.
- Literal all-buildings endpoint; 90,000 maximum ticks.
- 10,000 credits, `shortGame=false`, superweapons disabled.
- Symmetric resignation suppression.
- Run both arms once per case: 240 games.
- No retry, replacement, selective rerun, or outcome exclusion.
- At most 64 concurrent CPU tasks under `pi_jss233`.

## Frozen analysis and pass criteria

Report W/D/L, win and loss rates, one-sided 95% Wilson lower bounds, terminal
summaries, country-level W/D/L, and paired W/D/L-score differences from
`default`. Score win=1, draw=0.5, loss=0. Use the one-sided 95% paired-t lower
bound with `df=119` and critical value `1.65776`.

V4 passes only if `winner_rush_guard` satisfies all of:

1. wins exceed losses overall;
2. the one-sided 95% Wilson lower bound for win probability exceeds 0.5;
3. draws are fewer than default draws;
4. losses are no greater than default losses;
5. the paired-score lower bound versus default exceeds zero;
6. wins are at least losses in all four countries; and
7. wins exceed losses in at least three countries.

All criteria are fixed before selection and will not be weakened after
outcomes.

## After V4

On pass, run outcome-blind activation isolation across all nine countries and
all four HFO starts. Only after exact inactivity outside Soviet west may the
winner be enabled by default.

On failure, preserve the complete result and continue prospective development.
All V4 seeds are barred from final all-start confirmation.
