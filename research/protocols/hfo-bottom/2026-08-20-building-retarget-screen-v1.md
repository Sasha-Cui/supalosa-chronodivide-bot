# HFO bottom building-retarget development screen V1

Status: **prospectively frozen before fresh selection or outcomes**

## Motivation

The fixed bottom diagnostic reproduced a draw in which StrongBot held ten
buildings and 12 combatants against four buildings and one combatant for nearly
6,000 ticks. It issued all final orders against one target/coordinate and made
no building progress. This screen tests progress-aware building retargeting.

The new controller defaults disabled and activates only on exact HFO bottom
versus top after tick 42,000, with at most six known enemy buildings, at most
four enemy combatants, and at least four non-dog mobile attackers. When active,
it takes priority over existing bottom cleanup controllers and targets buildings
only.

## Outcome-blind cases

For all nine countries, enumerate seeds from

`4,244,000,000 + 1,000*countryOrdinal + offset`, offsets 0 through 399, and both
participant slots in ascending order. Initialize games with zero updates and
select the first two settings per country where StrongBot starts bottom
`88,157` and Supalosa starts top `88,34`. Require 18 unique cases, two per
country, zero updates, and no outcome fields.

## Fixed variants

1. `default`: deployed policy, retarget controller disabled.
2. `stalled_rotate_600`: direct building attack; rotate after 600 ticks without
   a building-count or aggregate-building-HP decrease.
3. `stalled_rotate_1200`: identical with 1,200-tick stall horizon.
4. `round_robin_600`: rotate building target every 600 ticks regardless of
   observed HP progress.
5. `top_first_600`: prioritize top-pocket buildings, then rotate after 600
   stalled ticks.
6. `split_buildings`: split attackers among all known buildings and issue
   direct attacks every six ticks.

All variants otherwise use the identical deployed policy, including the now
replicated Allied-west behavior (which is inert at bottom).

## Gameplay

- Exact HFO and private Snow runtime.
- Same-country StrongBot versus external Supalosa.
- 10,000 credits, superweapons disabled, `shortGame=false`.
- Literal all-buildings endpoint with symmetric resignation suppression.
- 90,000 maximum ticks.
- Every case runs once per variant: `18 * 6 = 108` games.
- No retry, replacement, or outcome filtering.

## Analysis and advancement

Report each variant's W/D/L, literal win and loss rates, terminal status,
terminal ticks/buildings, per-country W/D/L, and paired W/D/L-score differences
versus default. Rank by greatest wins-minus-losses, greatest wins, fewest
losses, fewest tick-cap draws, lower median tick, then declaration order.

Advance only if the winner:

- has at least 11 wins of 18;
- has wins greater than losses;
- has loss rate below default;
- has wins greater than or equal to losses in at least seven countries; and
- improves the paired score over default.

Otherwise preserve the complete result and redesign without relaxing criteria.

## After advancement

An eligible mechanism requires a larger fresh all-country bottom replication
and activation-isolation gate before default deployment. Final all-start HFO
confirmation remains disjoint from pilot, diagnostics, and all development
screens.
