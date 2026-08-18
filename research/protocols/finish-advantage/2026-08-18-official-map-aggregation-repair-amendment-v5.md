# Official-map aggregation validator repair, amendment 5

Status: **prospectively frozen before repaired aggregation**

Recorded: 2026-08-18 UTC

## Complete V3 population

Official-map V3 array `22596084` completed all 738 scheduler tasks and all 1,476
fixed-horizon technical probes under `pi_jss233` with zero stderr. Every task
produced a public outcome-free cell, private warning diagnostic, hashes, and a
completion marker. The immutable campaign SHA-256 is
`fb887bbc5ca2f827550e47337a207de862ecd39f95177dbde9f4ac7b0d5b03d4` and
its source commit is `0bfd3ef1b2487b3914936d7b516e4abb1ca99b43`.

Controller `22596085` failed before writing an aggregate because its structural
validator required every replicate to have the success shape. The campaign and
cell schemas intentionally allow technical failure records so the aggregate can
report which official map families are unsupported. The mismatch made the
controller reject task 0's valid `engine_error` failure record as “malformed.”

The public cell population contains 270 pass cells and 468 cells with frozen
technical failure categories. No winner, score, policy action, terminal
orientation, surviving-unit count, remaining-building count, or private warning
message was inspected to diagnose this validator defect.

## Exact repaired validator

Every replicate retains the common provenance, country, slot, seed, warnings,
failure-category arrays, and technical digest checks. It must then match exactly
one of two shapes:

1. **Reached horizon:** non-null game-mode hash and tick/start witnesses, 120
   updates, consistent arithmetic, distinct declared starts, and null error.
   Frozen warning categories may still make the cell technically incompatible.
2. **Failed before horizon:** zero updates, null ticks and starts, false progress
   and start predicates, a structured error, and at least one frozen failure
   category. The game-mode hash may be null only when failure preceded mode
   selection; otherwise it must be a SHA-256.

Any hybrid shape fails closed. First/repeat technical digests still determine
the cell's determinism verdict, and the cell's pass flag must still equal an
empty validation-error list.

## Provenance-safe re-aggregation

No game is rerun. A new controller may aggregate only the exact campaign SHA,
source commit, array `22596084`, 738 successful scheduler tasks, and immutable
cell/private-diagnostic hashes above. The repaired controller runs from clean
pushed `main`, records its own aggregator commit and this amendment SHA-256, and
writes to a new exclusive controller root.

The repair changes no cell, warning rule, map status, family membership, seed,
policy, or result. It merely permits the already designed compatible/incompatible
flow to be summarized. The original failed controller logs remain preserved.
