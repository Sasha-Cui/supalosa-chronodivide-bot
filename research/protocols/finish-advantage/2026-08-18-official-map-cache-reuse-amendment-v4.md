# Official-map authenticated cache-reuse amendment, version 4

Status: **prospectively frozen before replacement execution**

Recorded: 2026-08-18 UTC

## V2 disposition

Replacement array `22594851` passed its canonical transitive-runtime preflight
`22594804`. During the matrix, 233 tasks completed and 126 tasks failed before
the remainder and controller `22594852` were cancelled. The failures were
family-wide and had one exact message: `forward_create` observed zero alias-file
reads where the version-1 attestor required two.

The failed phase operation itself completed after initialization had already
read, hashed, and replaced the exact alias bytes with an authenticated in-memory
`File` snapshot. For these map families, the pinned game API reused its parsed
initialization state instead of reopening the alias during game creation. Other
families followed the previously certified two-read creation path. Neither path
depends on country, slot, policy outcome, or competitive performance.

The complete `22594851` population is inadmissible. No completed cell or failed
cell is reused, combined, or ranked, and private diagnostics were not inspected
for policy selection.

## Two admissible authenticated paths

Initialization must still perform exactly one intercepted alias read. That read
must resolve the sole exact regular alias, verify mode `0400`, byte count, and
SHA-256, and return a detached in-memory snapshot.

Each subsequent creation phase must follow one of two paths:

1. `authenticated_reopen`: exactly two intercepted reads, each independently
   resolving and hashing the exact alias; or
2. `authenticated_cache_reuse`: zero reads, permitted only when the exact
   initialization snapshot exists, the alias remains the sole exact regular
   file with unchanged mode, byte count, and hash before and after the phase,
   and both forward and reverse creation use the same path.

One read, more than two reads, mixed forward/reverse behavior, an absent or
drifted initialization snapshot, alias mutation, root collision, symlink,
unexpected path, or out-of-phase access fails closed. The artifact records the
expected count, observed count, read policy, and exact cache-reuse phases.

This amendment does not infer that zero reads are safe merely from absence. It
requires affirmative provenance from the authenticated initialization snapshot
and continuous disk/root integrity around each reuse phase.

## V3 replacement

The next campaign is schema 3 with status
`FROZEN_OFFICIAL_MAP_LIVE_COMPATIBILITY_V3_AUTHENTICATED_CACHE_REUSE` and fresh
seed base `4,226,200,000`. It binds the original live protocol, runtime repair,
and this amendment, and uses a new exclusive root.

The 41 families, nine countries, reciprocal slots, two replicates, V5 policy,
warning rule, target tick, and 1,476 planned games remain unchanged. The runtime
preflight must pass again at the exact replacement source commit. All 738 cells
then execute exactly once; no cell from V1 or V2 is reused.

This is a technical map-read attestation repair only. It does not inspect or
change winners, scores, map difficulty, policy actions, endpoint semantics, or
paper claims.
