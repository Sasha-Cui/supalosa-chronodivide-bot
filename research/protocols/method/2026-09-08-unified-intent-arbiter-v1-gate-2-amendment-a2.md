# Unified intent arbiter V1 Gate 2 amendment A2

Frozen: 2026-09-08, after zero-game audit 25323885 timed out and before the
replacement implementation or submission.

Parents: Gate 2 and Amendment A1.

Failure record:

research/results/2026-09-08-unified-intent-gate2-seed-audit-timeout.md

## Preserved failure

Audit 25323885 timed out at 06:00:11 with one CPU, 05:16:26 total CPU,
8,387,004 KiB maximum RSS, and 13,741.36 MiB maximum disk read. It wrote no
audit JSON, checksum, or completion marker and initialized no game.

## Exact matcher optimization

The candidate intervals remain the same ordered 20 intervals from A1. Replace
the general numeric-token matcher with a conservative coarse matcher that
emits only:

- unsigned decimal tokens beginning with 3 and containing 10–15 digits,
  commas, or underscores;
- signed decimal tokens containing 10–15 digits, commas, or underscores;
- hexadecimal integer tokens with 8–12 hexadecimal digits or underscores; and
- the unchanged reserved-range key expressions.

Every emitted token is normalized and then passed through the unchanged exact
unsigned/signed-int32 conversion and candidate interval lookup. Boundaries must
still reject numeric substrings inside identifiers, decimals, or longer
tokens. Unit tests must prove equality with the parent general matcher on:

- every candidate lower bound, lower bound plus one, upper bound minus one,
  and upper bound;
- every signed-int32 equivalent boundary;
- plain, comma, underscore, and hexadecimal representations;
- declared arrays and range objects;
- chunk boundaries in gzip text; and
- noncandidate long values and identifier substrings.

This is a performance optimization, not a collision-definition change.

## Streaming file ledger

Write each complete path/size/SHA-256/gzip-size record to an exclusive
temporary JSONL ledger while scanning. Retain only aggregate counts,
collisions, ranges, errors, and skips in memory. After the complete scan,
stream the ledger into the single final seed-audit JSON and append the
aggregate sections. Delete the temporary ledger only after the final JSON has
been closed and re-read successfully.

A failure may leave the temporary ledger in the new output root. It is
technical evidence and must not be resumed or treated as complete.

## Replacement execution

- use new root seed-audit-v1-a2;
- run the complete scan from the beginning;
- one CPU, 12 GiB, 12-hour limit, pi_jss233/day, zero GPU, no requeue;
- emit periodic progress only to the internal technical log, never a partial
  candidate assessment;
- preserve source/program/protocol/A1/A2/Slurm hashes and exact scheduler
  accounting; and
- require final JSON, SHA-256 sidecar, and immutable completion marker before
  inspecting any candidate result.

## Unchanged requirements

The 20 candidates and first-clean rule, complete retained-evidence roots,
current-source exclusions, unsigned/signed semantics, path and declared-range
checks, gzip decompression, zero read errors, 180 paired cases, 360 tasks,
fixed horizon, exact disabled identity gate, outcome prohibitions, and all
later advancement rules are unchanged.
