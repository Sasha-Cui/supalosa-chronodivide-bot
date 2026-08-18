# Finish-advantage open finalizer repair, amendment 6

Status: **prospectively frozen before repaired complete-population aggregation**

Recorded: 2026-08-18 UTC

## Complete immutable population

Open causal-screen array `22610506` completed all 90 shards and all 1,080 games
under `pi_jss233`. Every shard has an immutable manifest, event stream, summary,
hash record, and completion marker; no shard emitted stderr. The campaign
SHA-256 is `133d49d2a8ed1f0ed467c986c5c2d017df2adc675f0686972495973fc53b3edc`
at source commit `9455404e96522b75bba3779d63765c9964e9ecdc`.

Finalizer `22610507` failed on task 0 before reading its event outcomes. The
validator required `manifest.source.runtimeTrees` to be a non-array record, but
the provenance schema and campaign generator correctly serialize runtime trees
as an ordered array. Task 0 contains a three-element array whose canonical hash
is exactly the campaign source-runtime commitment
`89ed199650e9f8c656164c03f635f7de5623321f959bd6bfe3228b58fbd90472`.
Its scheduler IDs, clean source, exact external baseline, game API, package lock,
and map hash also match.

No shard summary or event outcome was manually opened to diagnose this type
error.

## Exact repair

Replace the `isRecord(source.runtimeTrees)` predicate with
`Array.isArray(source.runtimeTrees)` while retaining the exact canonical SHA-256
comparison. No source/runtime, scheduler, map, episode, endpoint, mechanism,
outcome, uncertainty, or advancement check is removed or weakened.

## Provenance-safe aggregation

No game is rerun. A repaired finalizer may aggregate only:

- exact campaign SHA-256 above;
- campaign source commit above;
- array `22610506` with exactly 90 successful tasks;
- all 1,080 accounted complete games;
- the exact committed manifest/event/summary files; and
- this amendment SHA-256.

It must run from clean pushed `main`, record its own aggregator commit and repair
commitment, and write to a new exclusive finalizer root. The original failed
finalizer logs remain preserved. Any other campaign, array, source, task count,
artifact drift, or runtime-tree shape fails closed.

The repaired finalizer applies the already frozen positive and mechanism gates
and reports the complete result regardless of direction. This amendment changes
validation type handling only; it cannot alter policy selection or outcomes.
