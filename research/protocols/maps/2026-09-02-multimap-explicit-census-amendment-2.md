# Multi-map V2 replacement explicit-start census (amendment 2)

Frozen before replacement initializations; competitive screening is not part
of this amendment. The explicit-start compatibility prerequisite passed in
job 24565842; artifact SHA-256:
`51ab624f2e8aa7a094bff51d1fe675298c1eb30b8c72672dfefb041df3cdd752`.

## Unchanged quantities

Keep all 13 new map files, map bytes, bots, game rules and original full
country/directed-start/participant-slot population. Retain 4,068 selected
cases, with five repetitions for two-start maps and one for other maps.
Use only the validated evaluation-only loader; installed runtime bytes stay
unchanged. The effective runtime hash is
`4ad4a5dd7a6a8ae53a7e671a29d7dd0a5fbad1916d94e52c69c9eda133a30f0c`.

Preserve the original failed selector and five successful partial-map
technical artifacts. The replacement recreates every map in a new directory;
no artifact from the failed array contributes to its pass decision.

## Fresh deterministic seed reservation

In the original 13-map inventory order, map index m receives
`3,002,000,000 + 100,000*m` through that base +99,999.
Reserved half-open interval: [3,002,000,000, 3,003,300,000).

Enumerate each map by country ordinal, candidate slot, candidate waypoint,
opponent waypoint (distinct), then repetition. The zero-update engine seed is
map base + sequential mapCaseIndex. Set both bot start options explicitly and
require exact waypoint coordinates before returning initialization metadata.
No rejection sampling or outcome-based selection is allowed.

Two one-update census repeats per map use base +99,000 and fixed pair 0→1.
Totals are 4,068 zero-update initializations plus 26 one-update repeats.

## Historical recorded-seed collision audit

Before replacement gameplay initialization, one CPU job scans recorded text
artifacts under the following in-scope historical roots:

- project `research-evidence`;
- checkout `research/artifacts`;
- checkout `benchmark-results`;
- driver `benchmark-results`.

Exclude the new amendment-2 output root itself. Do not follow directory
symlinks, enter node_modules or git internals, or access external archives.
Record skipped links and extensions explicitly. Match decimal and
underscore-separated integer tokens conservatively, regardless of JSON key:
any occurrence in the reserved unsigned interval or its signed-int32
equivalent aborts the audit. Hash every scanned file, record scan coverage,
and fail on read errors or files changing during the scan.

This is a documented audit of retained text metadata, not an unsupported
claim about every encoding or off-tree archived byte. The source snapshot and
fresh reservation are part of reproducibility metadata. No competitive
statistics or game outcome fields are parsed, emitted, or interpreted by the
scanner. Preserve the complete scan manifest and checksum even on failure.

## Census and coverage decisions

Every selected case must be unique by seed+slot; every map/country/slot/
directed-pair/repetition cell must be present. Verify static map waypoint
coordinates against the live GameApi. Record map geometry, terrain, water,
bridges, initial neutral-building metadata and deterministic one-update hashes.
Use the validated pinned baseline and literal instrumentation with zero
forwarded resignations. Record both original and effective runtime identities,
the compatibility artifact, collision audit and exact Slurm account/job IDs.

Keep the original 900-case screen membership rule byte-for-byte in intent.
Audit country, candidate start, opponent start, slot, and cyclic opponent-offset
counts separately. Cyclic offset is an index class, not a claimed geometric
distance class. For six/eight-start maps the old rule does not give equal
offset-class counts (9 countries is not divisible by 5 or 7). Expose this
imbalance; do not relabel it as uniform balance. A complete technical census
does not authorize a screen while the interpretation of this original
opponent-class requirement remains unresolved. No screen subset, count,
weight, or gate is changed by this amendment.

All 13 replacement tasks and their fail-closed finalizer must finish before
the census aggregate is inspected. A future outcome-blind screen allocation
decision must explicitly address the coverage audit before any competitive
game, preserving disjoint confirmation cases.
