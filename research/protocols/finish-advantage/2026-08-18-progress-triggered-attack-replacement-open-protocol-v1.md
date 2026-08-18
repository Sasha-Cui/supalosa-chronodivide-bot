# Progress-triggered attack-factory replacement: open protocol V1

Status: **prospectively frozen before implementation and before any V1 gameplay outcome**

Recorded: 2026-08-18 UTC.

## Question

Can delayed, progress-triggered replacement preserve Supalosa+V5 wins while
using the replacement factory only to escape late multi-building stagnation?

The policy observes public complete state only: tick, enemy building identifiers
and hit points, and current mission names. It cannot observe winner, score,
endpoint adjudication, future state, baseline state, or sealed-family identity.

## Architecture and invariant

Each intervention constructs the exact external Supalosa `DefaultStrategy` and
unchanged strict-base-race V5. The external attack factory remains active until
both a fixed minimum tick and a fixed no-building-progress interval pass. At
that moment the strategy's audited attack-factory seam is replaced once. Existing
missions are never disbanded, transferred, retargeted, or reordered. The new
factory controls only missions created on later strategy updates, uses the exact
composition supplied by external Supalosa, cannot steal locked defence units,
and adds no independent production mission.

Building progress means a hit-point decrease in a surviving enemy building or
disappearance of a previously observed building identifier. New construction
does not reset the clock. Observations occur every 120 ticks.

## Complete arms

1. exact external Supalosa control;
2. unchanged V5;
3. V5 + early distance replacement: minimum tick 9,000, stagnation 3,000;
4. V5 + conservative distance replacement: minimum tick 12,000, stagnation 3,600;
5. V5 + conservative forces-first replacement: 12,000 / 3,600;
6. V5 + conservative buildings-first replacement: 12,000 / 3,600.

There are no other thresholds or priority arms in V1.

## Technical gate

Before competitive launch, all nine countries and both slots must prove:

- disabled construction is exact external Supalosa;
- no replacement occurs before both thresholds;
- damage or building disappearance resets the clock, while new construction does not;
- each enabled priority replaces the seam exactly once;
- existing mission names and ownership are unchanged at replacement;
- later replacement missions have unique names, the declared priority, and the
  exact composition supplied by external Supalosa;
- deterministic same-seed traces match;
- both ground and mixed-domain maps exercise the interface; and
- no telemetry field contains outcome information.

## Fresh open screen

After a pass, use the same ten permanently open families, all nine countries,
reciprocal slots, 24,000-tick literal endpoint, and fresh seed base
`4,227,400,000`. Six arms imply 90 shards and 1,080 games. No filters, retries,
substitutions, selective reruns, or subgroup rescue are permitted.

An arm advances only if its one-sided 80% family-clustered paired-score lower
bound versus exact Supalosa is positive; its literal-win lower bound exceeds
both comparator point win rates; baseline win-to-loss transitions do not exceed
draw-to-win transitions; Allied and Soviet paired effects are positive; and its
draw-rate upper bound is below V5. Rank eligible arms by literal-win lower bound,
paired-score lower bound, draw upper bound, then lexical arm ID.

Passing authorizes fresh confirmation only. Failure is preserved and development
continues on a new mechanism and fresh seeds.
