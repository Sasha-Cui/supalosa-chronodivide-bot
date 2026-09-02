# Multi-map V2 fresh seed reservation: retained-metadata audit

Status: passed within the prospectively specified scan scope. This is not a
competitive result or a claim to have inspected every archived encoding.

## Identity and verification

- Slurm CPU job `24580836`, `pi_jss233`, completed `0:0` in 22m17s.
- Source: `10b74cfc06984ae7bb3bdd9aa814acde5ac4063b`.
- Audit program SHA-256:
  `7d9c1c5124a68dddf91e4655c8893ee03311353d81c0378a9fe2fe4b1dbca0c7`.
- Census amendment SHA-256:
  `e1fc6fdf9b69a52c381a4c0988cb21dc2374f4d4649f46431e448fd495c50117`.
- Audit artifact SHA-256:
  `3493eef7ef56acc4da4a92e9093eb005767e70228dd5fd62f415cedbefb8e826`.

The completion marker and artifact checksum were independently verified.
The manifest contains 126,690 unique scanned paths, valid SHA-256 values for
every entry, and a byte sum matching the report. The scanner itself hashed each
file and checked for input changes during scanning; this review did not perform
a second complete read of all historical files.

## Observations

Reserved unsigned interval: [3,002,000,000, 3,003,300,000).
Both unsigned and signed-int32-equivalent decimal tokens were checked.

- 126,690 retained text-metadata files scanned.
- 10,100,585,345 bytes scanned.
- Zero matching tokens in the reserved interval.
- Zero read errors or detected input changes.

The four roots were project `research-evidence`, checkout
`research/artifacts`, and the root/driver `benchmark-results` directories.
The new amendment-2 output subtree was excluded to avoid auditing its own
reservation records.

## Scope limitations, kept explicit

Nine symlinks were not followed, including the two generated-verification
paths and historical environment links. Off-tree archives were not accessed.

The manifest records every omitted extension count. Notably, the selected
text suffixes excluded 818,896 `.err` files, 819,614 `.out` files, one
`.seed` file, three each `.stdout`/`.stderr` files, and 38 `.env` files.
Binary/replay encodings were also outside this lexical audit. This audit must
not be summarized as proving absence across all historical bytes.

The result satisfies the frozen retained-metadata prerequisite for the
outcome-free replacement census. It does not itself authorize competitive
screening or remove the requirement to trace final evidence to its complete
input provenance.

## Next stage

Submit the 13-map explicit-start census in fresh amendment-2 paths, retaining
all original failed-array evidence. Require 4,068 zero-update selections,
26 one-update repeats, exact directed-pair/country/slot coverage and a complete
fail-closed finalizer. The existing opponent-class coverage hold remains:
`screenAuthorized=false`.
