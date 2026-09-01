# HFO Advanced V8 Generation-0 infrastructure failure V1

## Status

This launch is a preserved **technical infrastructure failure**, not a
scientific Generation-0 result. No W/D/L, endpoint, score, or candidate ranking
was inspected. No cell artifact or completion marker was produced.

## Frozen launch identity

- Source commit: `d392bfa02d37a8c369fdfe4820e7d8927dae8ca8`.
- Program SHA-256:
  `b01a4a91bc1c752779ef0e7d42b4f25893465fb79f80e0c6454bf7532ef8c9f4`.
- Protocol SHA-256:
  `186ede4a712c68d2c0324dc350de4de8428f3b52cb55d344224b50934c447f88`.
- Selection SHA-256:
  `9730745e171ecc73531369ddfd8308700eec44a7586491852713806fb097f713`.
- Array job: `24384010`, account `pi_jss233`, requested tasks `0-1835%64`.
- Afterok finalizer: `24384011`.

## Scheduler reconciliation

The first 84 array elements entered the scheduler before cancellation:

- 18 tasks (`18-35`) failed with exit `1:0`;
- 66 tasks were cancelled prospectively after the common technical defect was
  identified; and
- the afterok finalizer was cancelled.

The evidence directory contains zero `cell.json` files and zero `COMPLETE`
markers. The remaining 1,752 tasks never launched. Consequently there is no
partial scientific result to aggregate, reuse, exclude, or interpret.

## Root cause

Two deterministic pre-aggregate integration defects were found from failed
stderr only:

1. Generation 0 imported the executable V8 technical-campaign module merely to
   reuse two constants. With `MODE=cell`, that module's entry point rejected the
   mode and set a nonzero process exit status.
2. Relocating the pnpm content-addressed store caused pnpm to recreate the
   driver dependency tree. The pinned external Supalosa checkout still resolved
   `@chronodivide/game-api` through the old repository-root path, whereas the
   driver resolved the recreated package-local path. Byte-identical but distinct
   module instances fail the simulator's required `Bot instanceof` identity.

## Prospective repair

- Generation 0 now owns its frozen country list and 1,620-case constant and no
  longer imports an executable campaign module.
- The external checkout's ignored `node_modules/@chronodivide/game-api` link was
  repointed to the driver's exact runtime module. A zero-game compatibility
  check confirmed `PASS_EXTERNAL_BASELINE_RUNTIME_IDENTITY` and identical
  device/inode identity for both imports.
- The scratch-backed pnpm store remains configured at
  `/nfs/roberts/scratch/pi_jss233/zc362/.pnpm-store`; the project-level path is
  only a symlink. Native `canvas` was rebuilt and verified.

A replacement launch must use an entirely new results root, run every one of
the original 1,836 cells, retain the original cases and policies unchanged, and
be inspected only after its fail-closed finalizer completes.
