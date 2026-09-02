# Multi-map V2 explicit-start interface amendment 1

Frozen before any replacement initialization or competitive endpoint.

## Scope and reason

The original selector cannot realize all directed pairs because pinned
game-api 0.75.0 forces offline starts to random and then separates the first
two players using farthest-point selection. The failure is preserved in
`research/results/2026-09-02-multimap-v2-infeasible-start-selector.md`.

This amendment changes only the evaluation start-setting interface. It does
not relax coverage, remove maps, change bots, game rules, resource amounts,
victory conditions, rankings, or statistical gates. Prior technical output
directories are immutable and are not mixed into a replacement aggregate.

## Adapter boundary

Use a per-process ESM loader, enabled only on the Slurm evaluation command.
Keep installed game-api and all map files byte-identical. Hash and pin the
original bundle:
`dd398f5c8c2b4c3e3d6eb0f9ca6d7549bf70fee16c5950cd8902616ac922497d`.

The loader may replace only the single offline/online shared participant
option expression `startPos:RANDOM_START_POS` with a checked optional
participant start value. The existing engine already accepts numeric fixed
start options; no spawn algorithm or unit state is changed. Reject explicit
options in online games. Missing explicit options retain the original random
value. Reject malformed, duplicate, negative, out-of-range, or observer
assignments. Assert requested coordinates after creation and before updates.

All consumers must resolve the same physical game-api module and exact Bot
class. Fail closed on any second game-api runtime URL. Record original bundle,
effective source, loader, and smoke-program SHA-256 values. Results must label
the start mechanism as evaluation-only explicit starts, not stock random
spawning.

## Single CPU compatibility job before a replacement census

Reserve namespace 3,009,000,000--3,009,129,999, divided into 13 ordered
10,000-seed map blocks in the original inventory order, excluding HFO LE and
Peak. These are technical-only repeated checks, not outcome-bearing samples.

Within each map block:

1. Reference process without the loader: USA, both participant slots, seed
   base + slot; capture exact initial and one-update state/action hashes.
2. Loader process with no explicit option: repeat the same cases and require
   exact reference hashes.
3. Loader process fixing both starts to the naturally selected reference
   coordinates: repeat and require exact state/action hashes.
4. Explicit process: USA, every directed pair, both participant slots. Use
   seed base + 1,000 + 2*(candidateIndex*S+opponentIndex) + slot.
5. All-country construction: all nine countries, both slots, fixed pair
   0→1, seed base + 2,000 + 2*countryOrdinal + slot.
6. Repeat each explicit case once and require exact hashes. All cases stop at
   one update, with no competitive endpoint evaluation.

The driver must compare actual coordinates to the requested pair, check exact
start counts, install literal-endpoint instrumentation, and prove zero
forwarded resignations. Snapshot unit state only as opaque hashes at updates
0 and 1; never emit W/D/L, scores, defeat orientation, terminal building counts,
or policy rankings. Neither branch calls competitive adjudication. Record
both participant views and canonical action hashes.

Require every map, every requested pair, both slots, every country, all
deterministic repeats, source/runtime identities, recursive prohibited-field
checks, and Slurm account/exit/completion markers. Any mismatch fails the
whole compatibility job. Do not inspect partial smoke JSON. This is one
Slurm CPU job on pi_jss233, 8 GiB, two-hour limit.

## Subsequent census remains gated

Only after that compatibility result passes may a replacement full census
use deterministic explicit start settings. Freeze replacement seed blocks and
check historical seed+slot collisions before launch. Recreate all 4,068
selected cases in new paths and retain the previously frozen 900-case screen
membership rule, subject to an outcome-blind coverage audit. Preserve the
reference/interface difference in provenance.

No competitive transfer screen is authorized by an interface pass alone:
the full repaired census and selector still must pass. No V8 policy is
revived, and the paper remains frozen.
