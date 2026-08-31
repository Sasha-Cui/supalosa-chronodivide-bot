# HFO RA2Web Advanced V8 technical gate V1 result

Status: **technical failure; no aggregate and no competitive endpoint**

## Complete scheduler evidence

- Master selector job `24291942` passed with selection SHA-256
  `9730745e171ecc73531369ddfd8308700eec44a7586491852713806fb097f713`.
- Outcome-blind fallback smoke job `24309875` passed 12,000 updates with cell
  SHA-256
  `9aa17370407ff7efe94fe8154451442c4a220ef45dd00f1b2199697d93ff944f`.
- Technical array `24369344` launched exactly 234 tasks at concurrency 64.
- 233 tasks completed `0:0` under `pi_jss233`.
- Task `24369344_36` / scheduler ID `24369382` failed `1:0`.
- Dependent finalizer `24369345` was cancelled without running.
- Source commit:
  `108bd9792dbcbe07538f7a9bc8c74d681cee549a`.
- Program SHA-256:
  `2abde90b34e6b00de5a0eb91f491ede6327d30aa0636247a7d55c01d18248a79`.
- Protocol SHA-256:
  `186ede4a712c68d2c0324dc350de4de8428f3b52cb55d344224b50934c447f88`.

No completed cell was opened and no partial aggregate was constructed.

## Failure

Task 36 is the first case of the `advanced-recover` technical fixture. It
failed with the generic fail-closed message:

`V8 technical trace ended before fixed horizon`

The implementation did not emit termination update, winner, defeated side,
terminal buildings, score, or endpoint orientation. None was inspected from
another artifact. The failure therefore establishes only that the fixed
12,000-update outcome-blind horizon is too long for at least one required
fixture/case.

## Decision

V1 does not pass. Do not run its finalizer, inspect completed cells, or launch
competitive V8 search. Freeze a technical-only amendment using the previously
validated 9,600-update horizon, run both fallback and recover case-0 smoke
probes without endpoint fields, then rerun all 234 technical cells. This is a
full-population interface repair, not a selective scientific rerun.
