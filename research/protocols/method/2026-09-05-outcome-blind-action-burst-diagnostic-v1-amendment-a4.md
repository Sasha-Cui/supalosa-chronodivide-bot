# Outcome-blind timestamped action-burst diagnostic V1 amendment A4

Frozen: 2026-09-05, before manifest generation or game initialization

Parents: the V1 protocol and Amendments A1–A3.

Failure record:

`../../results/2026-09-05-action-burst-v1-file-budget-preimplementation-failure.md`

## Reason

The parent independently requires per-artifact checksums/completion and fewer
than 4,000 new files. Naive per-task trace, metadata, sidecar, and marker files
cannot satisfy both requirements for 1,717 tasks.

## Per-task artifact

Each successful task writes exactly:

- `trace.jsonl.gz`; and
- `COMPLETE`.

The gzip JSONL contains exactly:

1. one technical header record;
2. zero or more ordered action-event records; and
3. one final technical-summary record.

The `COMPLETE` line is:

`COMPLETE_ACTION_BURST_TRACE_V1 <sha256> <bytes>`

where SHA-256 and bytes describe the already closed gzip file. This record is
both the checksum sidecar and completion marker. It must be created with
exclusive semantics after the gzip is closed and re-read.

Successful array tasks emit no separate task stdout, stderr, JSON metadata,
or checksum file. Slurm stdout/stderr for successful cells go to
`/dev/null`. The trace and completion record contain all admissible technical
metadata and scheduler identity.

A failed task may write exactly one bounded `FAILURE.json` containing generic
technical stage, exception class, message digest, bounded stack-frame hashes,
and scheduler/source identity. It must not serialize a partial action trace,
current update, termination orientation, or prohibited competitive field and
must not write `COMPLETE`.

## File gate

The full successful array contributes exactly 3,434 files. The complete study,
including seed audits, manifest, smoke, scheduler capture, finalizer outputs,
sidecars, markers, and bounded logs, must contain fewer than 4,000 files under
the A2 execution root. Earlier failed seed-audit roots are preserved evidence
but are not duplicated into that root.

## Unchanged requirements

The selected seed interval, 846-seed A3 multiplicity, 1,717 traces, maps,
opponents, countries, starts, slots, 3,600-update horizon, action fields,
temporal summaries, reserve rule, determinism, prohibited fields, storage
bytes, scientific boundary, and Slurm compute resources are unchanged.
