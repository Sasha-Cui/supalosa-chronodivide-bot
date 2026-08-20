# HFO Allied west winner replication V3

Status: **prospectively frozen before V3 seed selection or outcomes**

## Candidate and control

V2 selected `rush_guard_hold_9600` at 17W/1D/2L on 20 fresh Allied-west
cases. V3 compares two arms:

1. `default`: current deployed StrongBot with the west guard disabled.
2. `winner_conditional`: an opt-in profile that applies `rush` strategic
   production and the parity group guard only when the map is exact HFO, the
   candidate start is `39,82`, the opponent start is `151,119`, and the
   candidate country is Allied. Guard settings are fixed at radius 72,
   six-tick ordering, minimum four combatants, parity engagement, and release
   tick 9,600.

The opt-in profile must not alter Soviet west or any east/top/bottom behavior.
It is not the deployed default during V3.

## Outcome-blind fresh cases

Use seed base `4,242,000,000`, disjoint from pilot, diagnostics, V1, and V2.
For each of USA, Korea, France, Germany, and Great Britain, enumerate offsets 0
through 399 and both participant slots in ascending order. Initialize games but
perform zero updates. Select the first ten settings per country where the
candidate starts west (`39,82`) and Supalosa starts east (`151,119`). Require
exactly 50 unique cases, zero updates, and no outcome-bearing field.

## Replication gameplay

- Exact HFO map and private Snow runtime.
- Same-country candidate and external Supalosa baseline.
- 10,000 credits, `shortGame=false`, superweapons disabled.
- Literal physical destruction of every opponent building, with both
  resignation actions suppressed and audited.
- 90,000 maximum ticks.
- Run both arms once on every case: `50 * 2 = 100` games.
- Every attempt counts; no retry, replacement, or exclusion.

## Fixed analysis

Report W/D/L, literal win rate, one-sided 95% Wilson lower bound, loss rate,
status counts, terminal ticks and buildings, each country's W/D/L, and paired
case differences. For paired comparison score candidate win as 1, draw as 0.5,
and loss as 0. Compute the mean winner-minus-default score and a one-sided 95%
paired t lower bound using 50 cases (`df=49`, critical value 1.676550893).

V3 passes only if the conditional winner satisfies all of:

1. wins exceed losses overall;
2. its one-sided 95% Wilson lower bound for literal win probability exceeds
   0.5;
3. wins exceed losses separately in all five countries;
4. the paired-score one-sided 95% t lower bound exceeds zero; and
5. its loss rate is below default's loss rate.

No threshold may be relaxed after outcomes.

## Actions after V3

On failure, preserve the complete result and continue open development. On
pass, run an outcome-blind activation-isolation gate comparing default and the
opt-in policy across all nine countries and all four HFO starts. Require a
difference for Allied west and exact equality everywhere else. Only after that
gate may the profile become the deployed default and be frozen for a fresh
all-country/all-start confirmation.

V3 remains development replication, not final confirmation. Its cases and
seeds are barred from later confirmatory evaluation.
