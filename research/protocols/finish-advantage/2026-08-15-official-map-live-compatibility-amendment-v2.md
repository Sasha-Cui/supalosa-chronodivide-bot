# Official-map compatibility protocol, amendment 2

Status: **prospective technical correction frozen before live engine testing
or any policy outcome on the official expansion population**

Recorded: 2026-08-15 UTC

The V1 static ordinary-RA2 screen rejected all 41 official-client identity
representatives. Its result and exclusion reasons remain preserved. The V1
screen answers the narrower question, "is this a plain RA2 map with no embedded
official Chrono Divide extensions?" It does not answer the acquisition
protocol's actual question, "are the map's extensions supported by the pinned
Chrono Divide engine and exact two-bot configuration?"

This amendment does not waive V1 findings or select maps by performance. It
requires a complete, uniform, outcome-free engine gate for all 41 frozen
representatives. Static flags become declared complexity strata; the live gate
determines whether those features are technically supported.

## Frozen population and no substitution

Use exactly the 41 representatives committed by identity-audit SHA-256
`a824d66a1b42f7afa26cfaeb579aa673e43ff29383fdffad9592c42bcc0bd36b`.
Do not replace a failing representative with another filename, player-count
variant, alias, or lower-ranked map. Do not drop a slow or difficult map after
launch.

## Complete compatibility matrix

For every representative, test all nine countries and both candidate slots
with exact Supalosa and the current frozen candidate constructor. The unit is
one `family-country-slot` cell. Run two determinism replicates for each cell
with the same technical seed and settings, for 1,476 total short probes.

The probe may construct the map, engine, players, and bots and advance only the
fixed short technical horizon needed to execute initialization and early map
logic. It must not preserve or expose winners, losses, draws, scores, player
resources, surviving units, remaining buildings, policy actions, or terminal
orientation.

## Per-cell pass conditions

Both replicates must:

- attest the exact source map hash, resolved RFS alias, theater, map bounds,
  declared start count, chosen start locations, engine/runtime bundle, exact
  Supalosa source, and candidate source;
- construct both bots and advance the fixed technical horizon without an
  exception, invalid start, missing asset, unsupported theater, parse error,
  engine error, or forbidden outcome field;
- emit identical scrubbed initialization, map-load, start-location, warning,
  and fixed-horizon technical digests; and
- contain no fallback to another map, mode, participant, or resource file.

Known nonfatal warnings are retained and classified by a rule frozen in the
probe implementation before launch. A warning cannot be ignored per map after
results are observed. Missing assets, invalid objects, invalid trigger
definitions, parse warnings, and engine errors fail the cell.

A family passes only if all 36 cells pass. Partial country or slot support is
not enough for the all-country confirmation.

## Aggregate decision

The live-compatible reserve is the complete set of families that pass every
cell under the frozen rules. Technical failures may be repaired only by a
prospective engine/interface correction applied to the complete affected
failure class; no outcome-bearing game may run before the repaired full matrix
passes. Competitive results may not be consulted to choose a repair.

The final release will report both the V1 static complexity strata and the V2
live pass/fail flow so readers can see why official extensions were not
misrepresented as plain RA2 maps.
