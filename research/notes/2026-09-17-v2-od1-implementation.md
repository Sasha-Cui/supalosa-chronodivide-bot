# V2 OD1 implementation checkpoint — 2026-09-17

This is an engineering checkpoint, not an empirical result. No OD1 simulator
initializations, canary episodes, smoke episodes, or competitive games have
been run. The frozen protocol remains
`research/protocols/method/2026-09-17-unified-intent-v2-open-development-od1.md`.

## Implemented

- Exact reconstruction of the 900 competitive pairs, four canary definitions,
  and one smoke definition. The plan distinguishes 25 opponent-map strata from
  five topology groups and preserves country/slot/direction balance. It rejects
  changed map order, eligibility, starts, seeds, arms, and unexpected fields.
- A bounded embedded gzip ledger using the existing validated delta/event
  encoding. Synthetic tests show byte-for-byte agreement with the historical
  file writer. The only change to the historical ledger module exports its
  existing replay verifier; endpoint rules are unchanged.
- An episode adapter with fixed 3,600-update canaries and 24,000-update
  competitive trajectories. V6 is primary and V5 is retained passively. Early
  V6 results remain immutable while V5 continues; unexplained native finish
  fails technically instead of becoming a draw.
- Explicit outcome-free canary projection, symmetric resignation suppression,
  per-arm V2 telemetry checks, and essential-call reconciliation. Disabled
  trajectories must not emit arbiter telemetry.
- Fail-closed CPU-only Slurm pure-test entrypoint, with exact source hashes,
  synchronized clean main, preserved starts/failures/reports, no restarts, and
  single-worker tests. Its planned population is 208 tests across 25 files plus
  one runtime-schema test, not a claim that the scheduled gate has passed.

## Resource bounds and storage

Each embedded ledger is capped at 11 MiB compressed, 512 MiB uncompressed, and
4 MiB per JSONL record. Compression and replay stream; replay does not retain
the whole decoded ledger. Two base64 payloads fit below 32 MiB, but the future
publisher must enforce the bound on the **complete pair JSON**, including
metadata. Successful competitive pairs must still produce only one payload
and one checksum/completion marker. No ledger is replaced by a hash alone.

Canaries hash normalized public state at every update. Competitive episodes
hash initial state, every 6,000 updates, and final state; this cadence is
explicit in each record. Building-state/event evidence remains per-update
through lossless stable-run compression. State-hash cadence does not weaken
endpoint reconstruction.

## Checks already run

Current-source TypeScript build, JavaScript syntax, and Slurm shell syntax
passed. Focused synthetic/endpoint checks passed 49/49 tests in eight files.
These tests use toy state transitions, not the RA2 simulator. A synthetic cap
fixture initially failed strict serialized-state equality; its property order
was corrected to the existing endpoint schema without changing adjudication.

## Not implemented / not authorized to launch

The OD1 metadata-only post-certificate seed-collision audit, runtime/source-bound
zero-update selector, canary/smoke orchestration, paired publisher, scheduler
reconciliation, and complete statistical finalizer are still missing.
The broad pure-test pass alone cannot authorize games.

Next steps:

1. Reconcile the new pure-test job against its launch receipt and immutable
   marker. Preserve any failure. No source edits while it runs.
2. Once idle, finish the sealed runner and deterministic 200,000-replicate
   analysis exactly as frozen. Test gates, grouping, replay, checksums, and
   all failure paths synthetically. Do not copy dead legacy runner branches.
3. Bind all source/runtime/map/opponent/endpoint identities; audit only seed
   metadata, never sealed V1 or rejected-study outcomes.
4. Run the 905 zero-update definitions, complete all four noninterference
   canaries, then the two-arm outcome-discarding smoke before the 900-pair
   array. Preserve exact receipts and launch counts.
5. Inspect scientific results only after every pair and the finalizer finish
   cleanly. Replication/ablation decisions follow the frozen gates.

The confirmed Supalosa policy has not changed. Manuscript preparation and
positive Advanced/cross-map claims remain blocked on competitive evidence,
not on whether the instrumentation compiles.
