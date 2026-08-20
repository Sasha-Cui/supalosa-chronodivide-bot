# HFO Allied west group-guard development screen V2

Status: **prospectively fixed before V2 seed selection or outcomes**

## Evidence motivating V2

V1 ran all 120 declared games. The deployed default was 1W/2D/17L. Replacing
`hfoWestRush` with `rush` reduced losses to 10 but produced 0W/10D/10L: in every
tick-cap draw Supalosa retained all 18 buildings while StrongBot retained only
one or two. Infantry, tank, and assault mission compositions were endpoint-
identical, the anti-infantry plan lost all 20, and pillboxes did not improve the
opening. No V1 variant met advancement criteria.

The fixed loss diagnostic recorded 1,394 repeated single-unit attack orders.
At tick 6,000 the west candidate had 11 combatants against 19 baseline
combatants, yet defense logic continued assigning individual units into the
approaching group. V2 tests a new group home guard: before generic emergency
defense, it assembles all mobile combatants at six west-base anchors and only
focus-engages when a declared group-strength condition is met. After the threat
clears or the hold horizon passes, the existing HFO west sweep regains control.

## Outcome-blind V2 cases

Repeat the V1 zero-update selection algorithm with fresh seed base
`4,241,000,000`. Use USA, Korea, France, Germany, and Great Britain; enumerate
offsets 0 through 399 and both slots in ascending order. Select the first four
settings per country where the candidate is `39,82` and Supalosa is `151,119`.
Require 20 unique cases, zero game updates, and no outcome-bearing field.

## Fixed variants

1. `default`: byte-current deployed policy, with the new guard disabled.
2. `rush_tanks`: V1's best survival control (`rush`, HFO/tank composition), no
   guard.
3. `hfo_guard_hold_9600`: original `hfoWestRush` production plus group guard
   through tick 9,600; engage only at numerical parity or better.
4. `rush_guard_hold_9600`: `rush` production plus the same parity guard through
   tick 9,600.
5. `rush_guard_group_9600`: `rush` plus guard through tick 9,600, allowing a
   grouped engagement when no more than four combatants behind.
6. `rush_guard_hold_12000`: `rush` plus parity guard through tick 12,000.

Every guard uses radius 72, six-tick order intervals, minimum four combatants,
the six declared west anchors in source, and `alliedOnly=true`. No Soviet or
non-west game can activate it.

## Gameplay and endpoint

- Exact HFO map, private Snow runtime, same-country Supalosa baseline, 10,000
  credits, `shortGame=false`, and superweapons disabled.
- Literal physical destruction of all opponent buildings; suppress and audit
  both resignation actions.
- Maximum 90,000 ticks to distinguish survival from conversion.
- One run for every case and variant: `20 * 6 = 120` games.
- Every attempt counts; no retry, replacement, or post-selection filtering.

## Fixed ranking and advancement

Report W/D/L, literal win rate, loss rate, status counts, median ticks,
terminal buildings, per-country W/D/L, and paired score differences versus the
default on identical cases. Rank lexicographically by:

1. greatest wins minus losses;
2. greatest wins;
3. fewest losses;
4. fewest tick-cap draws;
5. lower median terminal tick;
6. declaration order.

Advance only if the winner has at least 11 wins, wins exceed losses, and at
least four of five countries have wins greater than or equal to losses. A
survival-only result with zero or few wins is not eligible, regardless of its
loss reduction.

## Required post-screen evidence

An eligible winner is not deployed immediately. It must first pass a larger
fresh Allied-west replication and activation-isolation tests proving:

- guarded orders occur in Allied west-versus-east games;
- the guard is inert for all Soviet countries;
- it is inert at HFO east, top, and bottom starts; and
- disabling the guard reproduces the current deployed control.

Only then may an Allied-west profile be integrated and frozen for full
all-country/all-start confirmation. V2 selection and gameplay seeds are barred
from that confirmation.
