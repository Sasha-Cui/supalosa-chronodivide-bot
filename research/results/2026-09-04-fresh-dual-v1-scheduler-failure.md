# Fresh dual-endpoint execution V1: scheduler failure

Date: 2026-09-04

## Disposition

Execution V1 is a preserved technical failure. It is not a scientific result,
must not be aggregated, and must not be combined with a later execution.
No competitive outcome, endpoint orientation, map subset, arm subset, or
scientific aggregate was inspected before this disposition.

The complete-population retry is specified prospectively in
`research/protocols/maps/2026-09-04-fresh-dual-full-retry-v2.md`. It reruns
all 2,700 assignments rather than selectively rerunning the two scheduler
failures.

## Frozen identities

- array job: `24734770`
- fail-closed finalizer: `24734771`
- source commit: `7e902f6fed790890e4a4dd9eab3834795ad85462`
- program SHA-256:
  `894b056ed2289aba30556e953776e1d8273b6f1ee1943f8d555290658ddc63cb`
- Slurm script SHA-256:
  `834301a9ab714fe839bde4c33c7e51ee91bda5b97a27e4485dea897d36214b40`
- manifest SHA-256:
  `137575de8d55b7a832ceced58f23f22b84b132416bb4d58ff7ec43e9bb1a7197`
- account and partition: `pi_jss233/day`
- array specification: `0-2699%64`
- requeue: disabled

## Failure evidence

Slurm accounting reported:

| Task | Raw job ID | State | Exit | Node | End |
|---:|---:|---|---|---|---|
| 2604 | 24796195 | `NODE_FAIL` | `1:0` | `c1102u07n01` | 2026-09-04 10:00:26 EDT |
| 2607 | 24796199 | `NODE_FAIL` | `1:0` | `c1102u03n03` | 2026-09-04 10:00:26 EDT |

Both tasks had already written their exclusive cell JSON, compressed ledger,
SHA-256 sidecars, stdout completion record, and `COMPLETE` marker roughly
eleven minutes before the simultaneous node-failure accounting event.
Those artifacts remain preserved, but the frozen V1 rule required every
array task to be `COMPLETED 0:0`; post-seal artifacts do not override that
rule.

Tasks 2643 and 2644 also wrote complete artifacts before the same two nodes
lost scheduler synchronization. At the final reconciliation, `sacct`
retained stale `RUNNING` rows for those tasks while `squeue` had no live
array or task handle. All 2,700 cell directories contained immutable
completion markers. The dependency finalizer was cancelled and never created
an aggregate directory or scientific output.

## Integrity boundary

Only scheduler state, file names, sizes, timestamps, completion markers,
source identities, and generic technical logs were inspected. The two
`NODE_FAIL` cells reported `technicalPass=true` before the node event, but
that does not make the execution eligible under the frozen scheduler gate.

No task was requeued. No cell was excluded. No successful subset was
aggregated. No result was used to change an arm, map, seed, endpoint, or gate.

## Prospective repair

The repair must:

1. preserve this execution byte-for-byte;
2. use a new exclusive evidence root and new source/program/Slurm hashes;
3. verify the original 2,700 assignment records are byte-for-byte identical;
4. rerun all 2,700 assignments under one new fail-closed array;
5. require 2,700 unique `COMPLETED 0:0` scheduler rows with zero restarts;
6. incorporate the independently discovered map-aware descriptive-analysis
   correction before launch;
7. open no scientific field until the replacement aggregate is complete and
   independently verified; and
8. treat V1 only as failed infrastructure evidence, never as replication or
   additional sample size.
