# Unified intent arbiter V1 Gate 3 B1: ceiling-150 compatibility

Frozen: 2026-09-11, after the complete A1 categorical diagnostic and before
any B1 initialization or trace.

Parents:

- `research/protocols/method/2026-09-09-unified-intent-arbiter-v1-gate-3.md`
- `research/protocols/method/2026-09-10-unified-intent-arbiter-v1-gate-3-amendment-a1.md`

Evidence bound:

- `research/results/2026-09-10-unified-intent-arbiter-v1-gate-3-failed.md`
- `research/results/2026-09-11-unified-intent-arbiter-v1-gate-3-diagnostic-a1.md`

## Decision and question

A1 found exact rolling-budget failures for ceiling 75 and ceiling 300, while
ceiling 150 was clean in all 72 fresh diagnostic cases. B1 permanently drops
the two technically infeasible variants from the current method family.

B1 asks only whether ceiling 150 is compatible across the full frozen
map/opponent population. This is outcome-blind technical selection. It does
not estimate strength.

## Fresh seeds and population

Use the audited reserved interval at offsets 102,000–102,899:

`3,350,102,000 + caseIndex`, for case indices 0–899.

This interval is disjoint from Gate 2, the first Gate 3 population, and A1.

Reuse the exact original Gate 3 base-case crossing:

- pinned external Supalosa on all 15 frozen physical maps;
- pinned RA2Web Advanced on the ten frozen HFO variants;
- first two start ordinals in both directions;
- all nine countries; and
- candidate slots 0 and 1.

There are exactly 540 Supalosa cases, 360 Advanced cases, and 900 unique base
cases.

## Arms and task packing

Each base case runs two arms sequentially in this fixed order:

1. disabled: `intentArbiter.enabled=false`;
2. ceiling_150: enabled, total ceiling 150, reserve 35, order cap 115.

No other arbiter, strategy, retry, TTL, priority, grouping, chunk, terminal,
map-profile, observation, or game option changes.

Add 25 duplicate tasks selected by the same smallest-SHA rule as Gate 3, with
the domain separator `unified-intent-gate3-b1-duplicate-v1`. This yields 925
case tasks and 1,850 sequential arm traces. A successful task writes one case
JSON and one marker, keeping the final execution below 2,000 files.

## Selector and trace

Run one zero-update initialization for each of the 900 unique cases. Bind the
complete seed certificate, Gate 1, Gate 2, the first Gate 3 failure, A1 result,
runtime, assets, all map bytes, both opponent implementations, source, program,
Slurm scripts, and transitive dependencies. Verify the exact population,
seeds, starts, countries, slots, arms, duplicates, and recursive absence of
competitive fields.

Run one preserved task-0 smoke, then the complete array. Every arm must reach
exactly 3,600 updates and the five original public snapshots. Early finish or
any contract failure fails the complete population without orientation.

## Frozen technical gates

Disabled must emit no arbiter telemetry and must pass its original trace and
identity gates.

Every enabled trace must satisfy all original ceiling-150 gates:

- exact ceiling 150, reserve 35, and order cap 115;
- zero gameplay-reserve and total-ceiling overflow updates;
- maximum rolling total at most 150 and rolling order calls at most 115;
- maximum forwarded chunk size at most 128;
- zero multiple-forward, forwarded-validation, and partial-production-batch
  violations;
- finite, nonnegative, schema-valid telemetry;
- fixed source/runtime/map/opponent/assignment/scheduler identities; and
- valid action, trajectory, snapshot, and telemetry hashes.

Across the complete enabled population require at least one proposal, one
forwarded order, one same-unit conflict, and one duplicate suppression.
Deferral is reported but not required.

All 25 duplicate tasks must be exact for both arms after excluding scheduler
and task-index metadata. Bind a current-source pure terminal/firewall gate.

## Scheduler and inspection

- clean synchronized `main`;
- Node 20.13.1 and pinned runtime;
- `pi_jss233/day`, CPU only, no requeue;
- selector: one CPU, 8 GiB, at most one hour;
- smoke/case task: one CPU, 8 GiB, at most three hours;
- exact array `0-924%64`;
- afterok fail-closed finalizer: one CPU, 24 GiB, at most eight hours;
- exact unique scheduler IDs and zero restarts/retries/exclusions;
- successful case stdout/stderr to `/dev/null`; and
- final file count below 2,000.

Do not inspect any individual or partial trace. Inspect technical findings only
after all 925 tasks and the finalizer complete cleanly.

## Advancement

B1 passes only if every trace, aggregate mechanism, duplicate, pure,
provenance, scheduler, and storage gate passes. Preserve and commit the complete
result.

Only then may M2 be frozen as an open-development comparison of disabled versus
ceiling 150. The A1 diagnostic cannot be used as competitive evidence, and
the rejected 75/300 arms cannot be revived without an entirely new method and
fresh technical validation.
