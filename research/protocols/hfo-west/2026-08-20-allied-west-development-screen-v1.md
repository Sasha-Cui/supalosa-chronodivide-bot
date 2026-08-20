# HFO Allied west-start development screen V1

Status: **prospectively fixed before fresh-seed selection or variant outcomes**

## Motivation and scope

The complete literal pilot establishes pooled StrongBot superiority but shows a
10W/19D/22L failure from HFO start `39,82`. The fixed diagnostic reproduces the
earliest Korean loss: the current `hfoWestRush` plan produces only dogs, miners,
and tanks, sells the construction yard at tick 5,400, and has 11 combatants
against Supalosa's 19 infantry at tick 6,000. This screen asks whether an
Allied-only west-start production and defense profile repairs that opening.

This is open development, not confirmation. Soviet west behavior and the other
three starts are held byte-identical to the pooled-positive control.

## Outcome-blind case selection

Use countries USA, Korea, France, Germany, and Great Britain. For country
ordinal `c`, enumerate engine seeds

`4,240,000,000 + 1,000*c + offset`, for offsets 0 through 399, and both
participant slots in ascending order. Initialize the game but perform zero
updates. Select the first four `(seed, slot)` settings per country for which the
candidate starts at `39,82` and Supalosa starts at `151,119`. Emit no gameplay,
unit, credit, resignation, or outcome field. Fail closed unless exactly 20
unique cases are selected.

## Fixed variants

All variants retain default StrongBot exact-map tactics. Only StrongStrategy
options differ:

1. `default`: unmodified deployed policy (`hfoWestRush`, HFO composition).
2. `rush_tanks`: `rush` strategic plan, HFO composition (tanks at west).
3. `rush_infantry`: `rush` strategic plan, infantry attack composition.
4. `rush_assault`: `rush` strategic plan, combined-arms assault composition.
5. `antiinf_assault`: `otmqAntiInfantry` strategic plan, assault composition.
6. `rush_assault_pillbox`: `rush_assault` plus two Allied pillboxes beginning
   at tick 2,700, priority 132, anchored toward the southeast approach at
   `(50,91)` and `(54,95)`.

The `rush` plan differs causally from `hfoWestRush`: it produces 16 early
infantry, retains four-miner targets, and delays construction-yard sale from
tick 5,400 to 7,200. The composition variants isolate mission composition; the
pillbox variant tests whether local defense adds value beyond production.

## Gameplay and endpoint

- Map and private runtime are identical to the complete literal pilot.
- Candidate and Supalosa use the same country.
- `shortGame=false`, 10,000 credits, superweapons disabled, and the literal
  all-buildings endpoint with both resignation actions suppressed and audited.
- Maximum horizon: 60,000 ticks.
- Every selected case is run once for every variant: `20 * 6 = 120` games.
- No retry, seed replacement, start filtering after selection, or outcome-based
  exclusion is permitted.

## Selection rule

For each variant report W/D/L, raw literal win rate, loss rate, status counts,
median terminal tick, per-country W/D/L, and paired differences versus the
default on the identical 20 cases.

Rank variants lexicographically by:

1. greatest `wins - losses`;
2. greatest wins;
3. fewest losses;
4. fewest tick-cap draws;
5. lower median terminal tick;
6. variant declaration order.

A variant is eligible for the larger Allied-west development replication only
if it has at least 11 wins, wins exceed losses, and at least four of five
countries have wins greater than or equal to losses. Otherwise preserve the
screen and design a new opening from its complete evidence; do not weaken the
criteria post hoc.

## Next gates

An eligible winner must pass:

1. a fresh larger Allied-west replication against the frozen default control;
2. a technical and deterministic all-country compatibility gate;
3. regression checks proving the profile activates only for Allied west versus
   east on exact HFO; and
4. a fresh all-country, reciprocal-slot, all-start confirmation whose primary
   unit is the country-seed family and whose start-stratified report requires
   west wins to exceed west losses.

Confirmation seeds must not overlap pilot, diagnostic, selection, or
development seeds.
