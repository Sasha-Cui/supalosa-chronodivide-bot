# Unified intent arbiter V1 Gate 2 amendment A4

Frozen: 2026-09-09, after Amendment A3 and before certificate implementation
was committed or run and before any selector or game initialization.

Parents: Gate 2 and Amendments A1–A3.

## Pre-certificate ordering correction

Amendment A3 required file-ledger paths to be strictly increasing. The
completed audit writes deterministic os.walk traversal order: files in a
parent directory precede files in its sorted child directories. That order is
deterministic but not globally lexicographic. For example, a root-level
endpoint file precedes the later action-burst child directory even though the
child path sorts first.

The contradiction was found by inspecting the completed, immutable artifact
format before any certificate job. It does not affect token detection, file
hashes, collision counts, or selected-base order.

## Exact uniqueness replacement

Remove the strictly-increasing requirement. Preserve ledger order exactly and
require every path to be absolute and unique through a temporary disk-backed
SQLite table with the full path as a WITHOUT ROWID primary key. Insert records
in batches of at most 10,000, fail on any duplicate, and require SQLite row
count to equal the streamed file count of 1,818,439.

The temporary index is technical state, not evidence. Use journal mode OFF,
synchronous OFF, and file-backed temporary storage. Delete it only after all
file records, totals, candidate assessments, the deterministic sample, and
sample rehashes pass. Preserve it on failure.

## Certificate update

Use new root seed-certificate-v1-a4 and marker
COMPLETE_UNIFIED_INTENT_GATE2_SEED_CERTIFICATE_V1_A4. Bind A3 and A4 hashes
and report pathUniquenessMode as sqlite_full_path_primary_key.

The 2,048-file sample remains ordered by
SHA-256(auditSha256 + NUL + absolutePath), then absolute path. The sample
selection does not depend on ledger traversal order.

## Unchanged requirements

The full audit identity and selected interval, all 20 assessment checks,
streamed record schema and totals, exact path/size/hash/gzip fields, scheduler
checks, 2,048 file rehashes, compact output, resources, selector ingestion,
180 pairs, 360 tasks, fixed horizon, outcome prohibitions, and advancement
rules are unchanged.
