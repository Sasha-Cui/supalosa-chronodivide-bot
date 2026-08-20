# HFO bottom retarget paired replication V2

Status: **prospectively frozen before V2 selection or outcomes**

## Motivation and arms

V1 did not pass its strict lower-loss requirement, but every retarget mode
converted the same three draws into wins without changing either loss. V2 asks
a distinct prospective question: does the simplest ranked mechanism convert
bottom draws to literal wins while remaining non-inferior on losses?

Compare two arms:

1. `default`: deployed policy with bottom retargeting disabled.
2. `winner_retarget`: `stalled_rotate` with 600-tick stall/rotation horizon,
   enabled after tick 42,000 at no more than six enemy buildings/four enemy
   combatants and at least four attackers.

## Outcome-blind fresh cases

Use all nine countries and seed base `4,245,000,000`. For each country,
enumerate offsets 0 through 399 and both slots in ascending order; initialize
with zero updates and select the first five settings with candidate bottom
`88,157` and Supalosa top `88,34`. Require 45 unique cases, five per country,
zero updates, and no outcome fields.

## Gameplay

- Exact HFO/private Snow runtime, same-country external Supalosa.
- 10,000 credits, `shortGame=false`, superweapons disabled.
- Literal all-buildings endpoint and symmetric resignation suppression.
- 90,000 maximum ticks.
- Run both arms once per case: `45 * 2 = 90` games.
- No retry, replacement, or outcome exclusion.

## Fixed analysis

Report W/D/L, literal win and loss rates, one-sided 95% Wilson lower bound,
status/terminal tick/building summaries, each country's W/D/L, and paired score
differences. Score win=1, draw=0.5, loss=0 and compute winner-minus-default mean
and one-sided 95% paired t lower bound (`df=44`, critical value 1.68023).

V2 passes only if `winner_retarget` satisfies all of:

1. wins exceed losses overall;
2. one-sided 95% Wilson lower bound for literal win probability exceeds 0.5;
3. draws are fewer than default draws;
4. losses are no greater than default losses;
5. paired-score one-sided 95% lower bound exceeds zero;
6. wins are at least losses in all nine countries; and
7. wins exceed losses in at least seven countries.

These criteria are fixed before outcomes and do not alter V1's failed status.

## After a pass

On pass, run an outcome-blind activation-isolation gate covering all countries
and HFO starts. Require trace differences at bottom only and exact equality
elsewhere. Only then enable the retarget controller by default and freeze the
combined west+bottom candidate for full all-start confirmation.

On failure, preserve the result and continue development without weakening V2.
All V2 seeds are barred from final confirmation.
