# Action-burst V1 smoke: Slurm export syntax failure

Date: 2026-09-06

## Disposition

Smoke job `25167210` failed at wrapper line 32 before the trace program,
output directory, game API, or engine was invoked. No game or artifact was
created.

## Cause

When the explicit-start environment export was inserted, the existing
`MANIFEST_PATH` and `MANIFEST_SHA256` validation operands were accidentally
left on the `export` command. Bash treated the manifest path as an invalid
identifier and exited immediately. The finalizer wrapper had the same dormant
syntax defect; the zero-game manifest wrapper did not.

## Frozen attempt

- source:
  `bb8b7ecc8a1c9d65591f14d264b0517b4978e9ad`
- program SHA-256:
  `1f7a1ff421a2f4d540a2bc980a8debeb8a86f7044bea3898e8321ae0df32d3ec`
- manifest job: `25120084`, `COMPLETED 0:0`
- manifest SHA-256:
  `a438ea9a306f8b79d5bab266e1529acb47e1c34080b5e0e8d94107f598c90d0c`
- smoke job: `25167210`, `FAILED 1:0`, `pi_jss233/day`, zero
  elapsed seconds
- node: `c1106u09n03`

## Prospective repair

Restore `MANIFEST_PATH` and `MANIFEST_SHA256` to a no-op validation line,
leave `CHRONO_GAME_API_PATH` as the export's only assignment, and apply the
same correction to the finalizer wrapper. Re-run shell syntax checks and use a
new source-bound manifest under
`execution-v1-a4-runtime-a1-certificate-a5`.

No protocol, seed, assignment, runtime, trace, metric, gate, or resource
changes.
