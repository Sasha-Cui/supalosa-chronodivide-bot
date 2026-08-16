# Official-map static compatibility amendment V1

Status: **outcome-blind operationalization frozen before the official-map
static screen, live engine compatibility, or any policy outcome on the
expansion population**

Recorded: 2026-08-15 UTC

This amendment operationalizes the eligibility conditions already frozen in
`2026-08-15-official-map-reserve-acquisition-protocol-v1.md`. The rule is a
country-, policy-, and performance-blind generalization of the pre-existing
strict ordinary-skirmish byte screen used for external-map Blocks B--D. One
candidate was found to have appeared in the earlier outcome-blind Block-C byte
screen; no Block-C policy outcome or campaign identity was found, and the
same uniform rules remain applicable to the complete official population.

## Unit and no-backfill rule

Apply the screen to the single representative that was selected before this
screen for each of the 41 exact-identity components. If that representative
fails, the component fails. Do not substitute a different alias, rules
variant, player-count variant, or lower-ranked file from the component.

## Required ordinary-skirmish structure

Every representative must have:

- readable nonempty `Basic`, `Map`, `Waypoints`, `IsoMapPack5`, `OverlayPack`,
  and `OverlayDataPack` sections;
- `standard` among its declared game modes;
- a minimum player count of at least two, a maximum player count from two
  through eight, and consistent maximum/header/indexed-start counts;
- exactly the declared indexed start waypoints, with no additional live start
  waypoint through index seven; and
- a simulator-supported `TEMPERATE`, `SNOW`, or `URBAN` theater.

## Rejected map logic

Reject a representative with any nonempty map scripting or AI section:
`Triggers`, `Tags`, `Events`, `Actions`, `CellTags`, `TeamTypes`,
`TaskForces`, `ScriptTypes`, `AITriggerTypes`, or `AI`.

Reject any nonempty section outside the fixed ordinary map-data, preview,
payload, object-placement, lighting, digest/ranking, standard-house metadata,
and recognized lamp-section allowlist. This includes custom rules or object
type definitions. A provided `SpecialFlags` key must be known and equal the
ordinary RA2 value; omitted standard keys inherit their standard value.

## Placed-object rule

Preplaced structures, units, infantry, and aircraft must be neutral, and every
preplaced object or terrain identifier must exist in the pinned RA2
`rules.ini`. A playable/special-faction owner or unknown identifier fails the
representative. Standard neutral civilian and technology objects remain
eligible.

## Evidence boundary

The screen records hashes, declared metadata, section names, structural
counts, and exclusion reasons. It may not run a policy, expose a winner, score
an episode, or select a replacement. Passing this screen establishes only
static plausibility; every retained component must still pass exact parser,
two-bot construction, Slurm-only live-fidelity, historical-use, and rights
gates.
