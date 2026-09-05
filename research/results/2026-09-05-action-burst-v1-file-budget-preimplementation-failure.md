# Action-burst V1 file-budget preimplementation failure

Date: 2026-09-05

## Disposition

Preimplementation accounting found that the parent artifact requirements
cannot satisfy their own fewer-than-4,000-file gate.

With 1,717 traces, a separate trace, metadata file, checksum sidecar, and
completion marker would require at least 6,868 files before the manifest,
smoke, finalizer, or logs. Even one trace plus a separate sidecar and marker
would require 5,151 files.

No manifest, action trace, or game initialization existed when this
contradiction was found.

## Repair

Amendment A4 requires exactly two successful per-task files:

1. one bounded gzip JSONL containing a header, ordered action events, and a
   final technical summary; and
2. one `COMPLETE` record that simultaneously carries the completion label,
   SHA-256, and byte length for the closed gzip artifact.

The combined record is both checksum sidecar and completion marker. Successful
array tasks write no separate stdout, stderr, JSON metadata, or checksum file.
A failed task may write one bounded generic `FAILURE.json` without a
completion record.

This yields 3,434 successful task files and leaves more than 500 files for the
manifest, smoke, scheduler capture, aggregate, tables, checksums, and logs.
The trace population and measurements do not change.
