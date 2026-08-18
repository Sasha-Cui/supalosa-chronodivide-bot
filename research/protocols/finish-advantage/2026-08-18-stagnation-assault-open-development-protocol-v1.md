# Stagnation-triggered additive assault: open development protocol V1

Status: **prospectively frozen before implementation and before any V1 gameplay outcome**

Recorded: 2026-08-18 UTC.

## Question and information boundary

Does a bounded, additive assault mission triggered by lack of physical
enemy-building progress convert the dominant multi-building draw population
without sacrificing the exact Supalosa core's wins?

The policy may observe only public complete simulator state available to the bot:
tick, country, current enemy building identifiers/hit points, current mission
names, and production availability. It cannot observe winner, score, resignation,
endpoint adjudication, future state, baseline state, or sealed-family identity.

## Fixed architecture

Every intervention arm executes, in order:

1. the exact pinned external Supalosa `DefaultStrategy`;
2. the stagnation observer and at most one additive assault mission; and
3. the unchanged V5 final-building conversion layer in strict literal base-race mode.

The assault mission requests tanks through the ordinary production queue, has
`allowDefenceSteal=false`, never directly reassigns a unit, and may not create a
second stagnation assault while one is active. Strategic target priority is:
selectable combatant, construction yard, weapons factory, refinery, harvester,
other building, then other unit.

Building progress is any hit-point decrease in a surviving enemy building or
disappearance of a previously observed enemy-building identifier. New enemy
construction does not count as progress and does not reset the clock. The clock
starts at the first observation. Observation interval is 120 ticks.

## Complete arms

All arms use the same 24,000-tick literal physical-building endpoint.

| Arm | Minimum activation | Stagnation | Minimum/maximum squad | Composition |
|---|---:|---:|---:|---|
| exact external Supalosa | n/a | n/a | n/a | exact baseline |
| unchanged V5 | n/a | n/a | n/a | exact baseline + V5 |
| conservative additive assault | 12,000 | 3,600 | 6/12 | Allied 5 MTNK:1 FV; Soviet 5 HTNK:1 HTK |
| early additive assault | 9,000 | 3,000 | 6/12 | same |
| early strong additive assault | 9,000 | 3,000 | 8/16 | same |

There are no other arms or tunable thresholds in V1.

## Technical gate

Before competitive launch, unit tests and an outcome-blind live gate must show:

- disabled policy is trace-equivalent to its inner strategy;
- identical state produces identical telemetry and mission creation;
- every country and both physical slots can run the wrapper;
- at most one stagnation mission is active;
- no activation occurs before both thresholds;
- damage or disappearance resets the clock, while new construction does not;
- both faction compositions are producible when an assault is created;
- online telemetry contains no outcome-bearing field; and
- the base-race validator accepts unknown blocker completion only when no own-base
  destruction deadline is established.

No live-gate winner, score, endpoint label, or terminal building count may be
written or inspected.

## Fresh open screen

If the technical gate passes, evaluate all five arms on the same ten permanently
open development families and all nine countries, with reciprocal physical slots
and a new seed block beginning at `4,227,200,000`: 90 shards and 900 games. There
are no retries; any technical failure invalidates the campaign version.

The complete population is unblinded once. An intervention arm advances only if:

1. its one-sided 80% family-clustered paired-score lower bound versus exact
   Supalosa is above zero;
2. its literal-win lower bound exceeds both exact Supalosa and unchanged V5 point
   win rates;
3. baseline-win-to-loss transitions do not exceed draw-to-win transitions;
4. paired score improves in both Allied and Soviet countries; and
5. its draw-rate upper bound is below unchanged V5's.

Rank eligible arms by literal-win lower bound, paired-score lower bound, draw-rate
upper bound, then lexical arm ID. Passing authorizes fresh confirmation, not a
paper claim. Failure retains the complete negative result; a new mechanism needs
a new protocol, new seeds, and a complete screen. Selective reruns are forbidden.
