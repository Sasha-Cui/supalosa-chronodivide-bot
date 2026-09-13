# Unified intent M2: canceled technical failure

Date: 2026-09-13

Status: **FAIL — no complete-population outcome result**

The first frozen M2 outcome array produced many generic technical failures.
Because any failed task invalidated the complete population, the remaining
array was canceled uniformly to avoid spending additional allocation on an
unusable outcome set. No partial outcome was inspected.

## Bound design

- Protocol: commit `6c9603f`
- Population plan: commit `6ac6e7f`
- Episode and analysis implementation: commit `dbf3d2a`
- Main runner and Slurm implementation: commit `f26d300`
- Pure-artifact schema repair/source: commit `8bd9eb0`
- Fresh requested seeds: `3,350,103,000`–`3,350,103,899`
- Planned population: 900 paired tasks / 1,800 games

The earlier pure-gate schema failure `26049202` is preserved separately and
created no simulation. Replacement pure gate `26067392`, manifest `26082029`,
and outcome-payload-discarding smoke `26095364` all passed before launch.

## Scheduler result

- Array: `26114584`, submitted as exact `0-899%64`
- Finalizer: `26114585`, submitted `afterok`
- Account/partition: `pi_jss233/day`
- Per-task resources: one CPU, 8 GiB, no requeue
- Restarts: zero

At cancellation, scheduler accounting contained:

- 485 completed array elements;
- 149 failed array elements;
- 65 materialized array elements canceled uniformly;
- 201 unmaterialized array indices canceled with the parent array; and
- finalizer `26114585` canceled without execution.

The evidence tree contains 693 task directories:

- 485 complete `pair.json` plus marker pairs;
- 149 generic `FAILURE.json` files; and
- 59 empty directories from tasks interrupted after directory creation.

Every failure artifact contains only the frozen generic schema, task index, and
`errorType: Error`. Successful task artifacts remain sealed. No finalizer
directory or aggregate exists.

## Inspection boundary

No `pair.json` was opened. No W/D/L, score, endpoint class, terminal update,
transition, family effect, or partial aggregate was computed. The smoke
discarded both episode payloads by construction. Scheduler state, file counts,
and generic failure records are the only inspected evidence.

The 485 completed pairs cannot be analyzed as a selected subset. Canceled or
failed indices cannot be selectively rerun to complete this population. The
entire M2 attempt is scientifically unusable and remains preserved as a
technical failure.

## Decision

The generic schema does not distinguish long-horizon budget overflow from
endpoint, telemetry-schema, setup, or trace failure. A fresh outcome-blind
complete diagnostic must identify the technical gate before any new outcome
array. The disabled-versus-ceiling-150 M2 comparison remains unresolved.
