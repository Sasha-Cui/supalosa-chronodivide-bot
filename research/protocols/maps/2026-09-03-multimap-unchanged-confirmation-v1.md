# Multi-map V2 unchanged-policy confirmation, first eligible maps

Frozen before any confirmation outcome.

## Inputs and population

Completed screen aggregate:
`8e760c72605cbe6c67fcc088cba5a3e460fecf53f28b4b614158abe050bef341`.
Only HFO L v L and HFO R v R passed every frozen screen gate. They are
geometry controls within one HFO family, not independent-map replications.

Use the canonical amendment-3 allocation:
`5a838bd9cb3edf06df288914ad5cea60b61983f29d183a1efdeb5a3c90e3295e`.
For each eligible map use ALL 144 confirmationIndices, never the old census
flags or a favorable subset. These are nine countries, two starts, both slots,
and four repetitions per country/start/slot cell. There are 288 games total,
with zero overlap with the observed competitive screen.

The candidate remains deployed StrongBot, unchanged. Opponent is pinned
external Supalosa at 165b77a71d0cf5ebd27c65b19d0486bcbae78d0f. Keep the
validated explicit-start interface, map/runtime bytes, 10,000 credits, no
crates/superweapons/starting army, 90,000-update cap and literal physical
all-enemy-buildings endpoint with symmetric resignation suppression.

## Operationalization of original confirmation gates

Reuse the project's existing equal-weight country-by-start convention from
the Peak confirmation: the 18 country/start literal-win proportions form
the cluster observations. Their equal-weight mean has one-sided 95% lower
bound mean - 1.73961 * sampleSD / sqrt(18), with 17 degrees of freedom.
This is a clustered normal/t approximation, not an exact finite-sample
guarantee. Freeze this method now, not after inspecting outcomes.

A map is positive only if ALL original gates hold:

1. Wins exceed losses overall, in both factions, both slots, and both starts.
2. Pooled one-sided 95% Wilson win lower bound exceeds 0.65 (z=1.644853626951).
3. Equal-weight country/start one-sided 95% lower bound exceeds 0.60.
4. At least ceil(0.90*18)=17 country/start cells have wins exceed losses.
5. Every remaining country/start cell has wins at least losses.
6. Every task passes technical checks and every claimed win has the frozen
   literal physical-destruction certificate; no resignation is forwarded.

The conditional adapted-policy paired-improvement gate is inapplicable because
the policy is unchanged. It remains required for future adapted variants.

The stricter aspirational result requires the above gates AND point win rate
at least 0.80, pooled lower bound above 0.75, and all 18 country/start cells
strictly positive. Otherwise do not describe the map as dominated.

## Reporting and execution

Report W/D/L, all faction/slot/start/country and country/start strata,
pooled Wilson lower, clustered mean/SD/critical value/lower, literal-win
times, cap and nonliteral termination draws, every gate and exact job ID.
Draws remain draws; no retrospective endpoint change is allowed.

Use one 288-cell pi_jss233 CPU day array, concurrency at most 64, 8 GiB per
cell, no automatic requeue, and an afterok fail-closed finalizer. No partial
outcomes are inspected. Both map aggregates are opened only after the whole
array and finalizer complete cleanly. No task is replayed or excluded.

If either map fails, preserve that failure without moving thresholds or
reusing the confirmation population. Failed-screen maps remain reserved for
prospective development on their amended screenIndices only. Advanced
remains unsolved; no V8 policy is revived. The manuscript remains frozen.
