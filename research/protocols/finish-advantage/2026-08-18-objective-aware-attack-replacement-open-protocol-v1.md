# Objective-aware attack-factory replacement: open development protocol V1

Status: **prospectively frozen before implementation and before any V1 gameplay outcome**

Recorded: 2026-08-18 UTC.

## Research question

Can target selection inside Supalosa's existing attack missions increase literal
building-elimination wins while preserving its economy, defence, scouting,
engineer behavior, attack timing, and side-specific composition selection?

This isolates a middle intervention between two rejected extremes: broad
mission takeover was destructive, while a second generic attack producer was
redundant. The policy may use only public state available to the bot and may not
observe winner, score, endpoint adjudication, future state, baseline state, or
sealed-family identity.

## Fixed architecture

Construct the exact pinned external Supalosa `DefaultStrategy`, then replace
only its private `attackFactory` through a new audited factory-construction
interface. The external strategy continues to call its exact expansion,
scouting, random buildable-composition selection, defence, and engineer
factories in the exact original order. The replacement factory adds missions
through the ordinary external mission controller and never commandeers units.
Unchanged strict-base-race V5 remains the outer final-building layer.

Every replacement uses deterministic target weighting and must not consume an
extra random draw for micro target choice. The external strategy's original
random composition draw remains unchanged.

## Complete target-priority arms

1. `external_supalosa_control`: exact external Supalosa.
2. `unchanged_v5`: exact external Supalosa plus unchanged strict V5.
3. `v5_plus_replacement_distance`: local replacement factory with original
   distance-nearest combat targeting; isolates replacement-factory liveness.
4. `v5_plus_replacement_forces_first`: selectable combatants first, then
   construction yard, weapons factory, refinery, harvester, other building.
5. `v5_plus_replacement_buildings_first`: construction yard, weapons factory,
   refinery, other building, harvester, selectable combatant.

All replacement arms retain the exact external composition supplied by
Supalosa. There is at most one preparing replacement mission. They use the same
minimum/maximum squad sizes, factory cadence, and visible/base retarget cadence
as the external strategy. No additive stagnation mission runs.

## Outcome-blind technical gate

Before competitive execution, all nine countries and both reciprocal slots
must demonstrate:

- the exact external strategy object contains the expected attack-factory seam;
- disabled/direct construction remains exact external Supalosa;
- distance, forces-first, and buildings-first replacements are deterministic;
- the three replacements receive identical composition objects and factory-call
  schedules under identical public traces;
- mission names are unique and at most one replacement mission is preparing;
- the replacement never steals locked defence units;
- target-choice witnesses distinguish all three priorities when buildings and
  combatants are jointly attackable;
- Allied, Soviet, ground, air, and naval buildable compositions pass through
  without policy-side country exceptions; and
- telemetry contains no outcome-bearing field.

## Fresh complete open screen

After a pass, use the same ten permanently open families, all nine countries,
reciprocal slots, 24,000-tick literal endpoint, and a new seed block beginning
at `4,227,300,000`. Five arms imply 90 shards and 900 games. There are no
filters, retries, substitutions, or selective reruns.

One complete-population finalizer applies the same advancement conditions as
the stagnation screen: positive family-clustered paired-score lower bound versus
exact Supalosa; literal-win lower bound above both comparator point rates;
baseline win-to-loss transitions no greater than draw-to-win transitions;
positive Allied and Soviet paired score; and draw-rate upper bound below V5.
Rank eligible arms by literal-win lower bound, paired-score lower bound,
draw-rate upper bound, then lexical arm ID.

If no arm advances, preserve the negative result and redesign on fresh seeds.
Passing authorizes fresh confirmation only and is not a paper claim.
