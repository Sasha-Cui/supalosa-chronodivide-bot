# Multi-map V2 screen allocation amendment 3

Frozen before any multi-map competitive endpoint. This is an explicit
allocation change, not a declaration that the earlier allocation passed.

## Prerequisite and unchanged study

The complete explicit census passed in jobs 24591131/24591132, aggregate
`5715eef27a8dc0b4b24f3ea2909c83ef2d15c3ea546a7c16b9b3a61b1583d1c5`.
Its 4,068 cases, exact map bytes, seeds, countries and slot identities remain
immutable. The original census and 900 screen flags are preserved permanently.

Keep 900 screen games, 3,168 confirmation cases, every map, every performance
gate, unit game weights and the pinned StrongBot-versus-external-Supalosa
comparison. No V8 policy returns. Only six/eight-start screen memberships
change; two/four-start memberships stay unchanged. Publish all added/removed
case indices. No case has produced a competitive outcome.

## Balance and its arithmetic limit

Both participant slots must use the same physical country/start/opponent
scenario, so every offset-class count is even. Six-start maps have 108 games
across five nonzero cyclic offsets; eight-start HFO has 144 across seven.
Equal class counts are impossible at these sizes. A nonuniform set of even
counts must differ by at least two. We require and attain that minimum range.

Game counts by cyclic offset 1 through S-1 become:

- six starts: 22, 22, 20, 22, 22;
- eight starts: 22, 20, 20, 20, 20, 20, 22.

These are closest-feasible paired counts, **not uniform counts**. Cyclic index
offset is not geometric distance or a claim of equivalent task difficulty.

Every country/candidate-start/slot cell has exactly one game. Each country's
opponent assignment is a derangement (a permutation with no self-pair), so
opponent-start marginals are also exact within country and slot. Across
countries, every candidate start meets every opponent with floor/ceiling
counts of 9/(S-1) paired scenarios. Revised six/eight-start allocations also
have closest-feasible offset counts within faction side and expose all those
counts. No weighting correction is introduced.

## Frozen country permutations

Country order is USA, Korea, France, Germany, Great Britain, Libya, Iraq, Cuba,
Russia. For each candidate waypoint index a, the corresponding row value is
its opponent waypoint index, identically in both participant slots.

Six starts:

```json
[[1,3,5,0,2,4],[3,0,4,1,5,2],[2,0,1,4,5,3],
 [3,5,4,2,1,0],[4,2,0,5,3,1],[5,4,3,1,0,2],
 [4,5,3,2,0,1],[2,4,1,5,3,0],[5,2,0,4,1,3]]
```

Eight starts:

```json
[[1,0,5,7,6,2,4,3],[1,0,6,5,7,2,4,3],[2,3,0,1,7,6,5,4],
 [2,4,0,7,5,1,3,6],[3,6,1,4,2,7,5,0],[4,2,7,5,0,3,1,6],
 [5,7,3,6,1,4,0,2],[6,5,4,2,3,0,7,1],[7,4,3,0,1,6,2,5]]
```

These were derived by a bounded, outcome-free integer matching calculation.
The executable certificate independently checks all margins and quotas;
there is no stochastic or performance-conditioned choice at runtime.

## Confirmation boundary

The amended screen and its complementary confirmation set are disjoint and
exhaust all original cases. Membership is sealed before the first outcome;
neither unsuccessful screens nor promising subsets may change it afterward.
Moving a prior metadata-only screen flag is disclosed in the ledger and does
not reuse a previously observed competitive outcome.

## Competitive Stage 1

Evaluate only frozen deployed StrongBot against pinned external Supalosa
(commit 165b77a71d0cf5ebd27c65b19d0486bcbae78d0f). Use the validated explicit
start interface, unchanged runtime/map hashes, 10,000 starting credits,
no crates/superweapons/starting army, symmetric resignation suppression,
literal all-enemy-buildings elimination and a 90,000-update cap.

Unchanged screen gates: wins exceed losses overall, in both faction sides and
both participant slots; every candidate start has wins at least losses; at
least eight countries have wins at least losses; no technical/literal failure.
The original conditional paired-deployed-control gate is not applicable here:
there is only the zero-shot deployed-policy head-to-head, not an adapted arm
with a separate deployed control. It remains mandatory for later adaptation.

Report all W/D/L, win and score rates, one-sided 95% Wilson lower bounds,
faction/start/slot/country strata, median literal-win updates and cap counts.
These descriptive intervals introduce no new screen gate. Use z=1.644853626951
for the one-sided lower bound. A clean completed map may fail scientifically.

One 900-cell CPU array, concurrency at most 64, and its afterok fail-closed
finalizer must finish completely before any competitive aggregate is opened.
No game is selectively retried or excluded. An allocation seal is a prerequisite
to launch, not a performance result. Passing maps may later proceed unchanged
to their sealed confirmation only under the original stricter gates.

The recorded-seed audit remains scoped to retained metadata, with omissions
disclosed. This amendment does not relabel it as universal archive coverage.
The paper stays frozen.
