# Unified intent arbiter V1 Gate 3: enabled compatibility

Frozen: 2026-09-09, after Gate 2 passed 180/180 exact pairs and before any
enabled live trace or Gate 3 initialization.

Parents:

- research/protocols/method/2026-09-07-unified-intent-arbiter-v1.md
- research/protocols/method/2026-09-07-unified-intent-arbiter-v1-gate-2.md
- Gate 2 Amendments A1–A7

Gate 2 result:

research/results/2026-09-09-unified-intent-arbiter-v1-gate-2-complete.md

## Question

Can the enabled unified intent boundary execute every supported map/opponent
family under all three frozen ceilings while preserving essential actions,
valid order semantics, deterministic repeats, and exact rolling budgets?

This is an outcome-blind compatibility gate. It does not choose a ceiling and
does not measure policy strength.

## Reserved seed subnamespace

Reuse the already audited and reserved interval
[3,350,000,000, 3,351,000,000). Gate 2 used only offsets 0–179. Gate 3 uses
offsets 100,000–100,899, which are disjoint.

Each base case receives:

3,350,100,000 + caseIndex.

All four arms within the case share that seed. The 25 deterministic duplicate
tasks reuse their selected original case seed exactly. No other seed is reused.
Bind complete audit 25480245, compact certificate 25670843, and Gate 2 result.

## Maps and opponents

Against pinned external Supalosa, cover all 15 frozen physical maps:

1. HFO LE
2. Peak of Perfection
3. HFO original
4. HFO Golden
5. HFO Corners
6. HFO Corners B
7. HFO Corners B Golden
8. HFO B v B
9. HFO L v L
10. HFO R v R
11. HFO T v T
12. Tour of Egypt
13. South Pacific original
14. South Pacific two-start
15. Pacific Heights

Against pinned RA2Web Advanced, cover the ten HFO variants: HFO LE plus maps
3–11 above.

For each map use its first two frozen start ordinals and both directed
orientations. Use all nine countries and candidate slots 0 and 1. Observation
mode is api_full_state for both agents and must be labeled explicitly.

This yields:

- Supalosa: 15 x 2 x 9 x 2 = 540 cases;
- Advanced: 10 x 2 x 9 x 2 = 360 cases;
- 900 unique base cases total.

## Arms

Every case runs four sequential arms:

1. disabled: intentArbiter enabled false;
2. ceiling_75: enabled true, totalCeiling 75;
3. ceiling_150: enabled true, totalCeiling 150;
4. ceiling_300: enabled true, totalCeiling 300.

Reserve is fixed at 35, so the corresponding rolling order-call caps are 40,
115, and 265. No other arbiter, retry, TTL, priority, grouping, chunk, terminal,
strategy, map-profile, or observation option changes.

## Case-task packing

One Slurm array task runs all four arms for one base case sequentially. This
keeps paired technical evidence atomic and reduces file count. Add 25 duplicate
tasks selected as the 25 base cases with the smallest SHA-256 of:

unified-intent-gate3-duplicate-v1 + NUL + canonical base-case identity.

Duplicate tasks use the same case definition, seed, arm order, and runtime as
their originals. The final plan has exactly 925 case tasks and 3,700 game
traces.

Each successful case task writes exactly one compact case JSON and one combined
checksum/completion marker. The complete execution must remain below 2,000
files.

## Zero-update selector

Before traces, initialize each of the 900 unique cases once with disabled
StrongBot and its assigned opponent. Verify exact:

- source, runtime, dependencies, assets, map bytes, and opponent identity;
- complete seed audit/certificate and disjoint Gate 2/Gate 3 offsets;
- advertised game mode;
- requested/effective deterministic seed seam;
- country, start ordinals/coordinates, and slot;
- zero updates;
- 900 unique cases, 925 tasks, 3,700 traces, and all coverage counts;
- four-arm order and 25 deterministic duplicate identities; and
- recursive absence of W/D/L, score, winner, endpoint, defeated state,
  terminal building count, or ranking.

Write one immutable manifest. Then run one preserved task-0 outcome-blind smoke
before the full array.

## Fixed-horizon trace

Every arm runs exactly 3,600 updates and records the same five public snapshots
and forwarding action hashes used by Gate 2. All public action requests,
including essential non-order and quit, retain the frozen boundary behavior.
Early engine finish is a generic complete-population technical failure and must
not serialize orientation.

For enabled arms, collect every per-update UnifiedIntentUpdateTelemetry and
reduce it to:

- update count and canonical telemetry SHA-256;
- sums and maxima for proposals, conflicts, invalid units/targets/tiles,
  suppressions, superseded/expired/revoked/deferred/pending intents,
  production batches, debug proposals/coalescing/forward/drop, groups, chunks,
  order calls, and ordered unit IDs;
- maximum rolling total, order, gameplay-nonorder, and debug calls;
- maximum forwarded chunk size;
- per-scope proposal/winner/forwarded-unit totals;
- count of reserve/total overflow updates; and
- count of updates with one-unit/multiple-forward invariant violation.

Extend telemetry only to expose maximum forwarded chunk size and the
one-forward-per-unit invariant. Do not add gameplay state or outcomes.

Disabled must have no arbiter telemetry. Enabled arms must have exactly 3,600
telemetry updates with tick labels 1–3,600.

## Per-arm gates

For every enabled trace:

- reserve is 35 and configured ceiling is the assigned 75/150/300;
- zero gameplay-reserve overflow and zero total-ceiling overflow update;
- maximum rolling total calls at most its ceiling;
- maximum rolling order calls at most ceiling minus 35;
- maximum forwarded chunk size at most 128;
- zero one-unit/multiple-forward violation;
- zero forwarded missing, dead, or foreign unit;
- zero forwarded invalid object target or tile;
- no partial essential production batch;
- every telemetry field is finite, nonnegative, and schema-valid;
- every snapshot/action/telemetry hash is valid; and
- fixed horizon, source, runtime, map, opponent, assignment, and scheduler
  identities pass.

Across the complete enabled population require at least one proposal, one
forwarded order, one same-unit conflict, and one duplicate suppression for each
ceiling. Deferral may be zero at a larger ceiling; it is reported, not forced.

## Disabled and duplicate gates

Every disabled trace must:

- emit no arbiter telemetry;
- forward all public actions through the Gate 2 instrumentation;
- reach all five snapshots; and
- pass the same identity/prohibited-field checks.

All 25 duplicate tasks must be exact for all four arms on action summaries,
full snapshots, trajectory hashes, enabled telemetry summaries/hashes, and
fixed update count. Scheduler metadata and task/duplicate indices are excluded
from the equality comparison. No duplicate may be dropped or replaced.

## Pure terminal and firewall gates

At the Gate 3 source commit rerun and bind:

- complete 52-site/29-routine inventory;
- one-building/100-off-route-tank terminal bypass;
- lethal-blocker bounded screen;
- one-to-two-building, owner-change, and target-destruction revocation;
- physical damage/destruction progress deadlines;
- full-state firewall identity; and
- fog-respecting two-slot symmetry and hidden-object rejection.

These are technical gates, not additional game outcomes.

## Scheduler and storage

- clean synchronized main;
- Node 20.13.1 and pinned runtime;
- pi_jss233/day, CPU only, no requeue;
- selector: 1 CPU, 8 GiB, at most one hour;
- smoke/case task: 1 CPU, 8 GiB, at most four hours;
- array exactly 0–924 at concurrency at most 64;
- finalizer: afterok, kill-on-invalid-dependency, 1 CPU, 24 GiB, at most eight
  hours;
- successful array stdout/stderr to /dev/null;
- exact unique scheduler IDs, zero restarts, no retry/exclusion/replacement;
  and
- final file count below 2,000.

Bind protocol/source/program/Slurm hashes, all Gate 1/2 results, seed audit and
certificate, runtime freeze, candidate/external Supalosa/Advanced trees,
transitive dependencies, assets, all 15 maps, manifest, smoke, tasks, and
finalizer outputs.

## Advancement

Analyze only after all 925 tasks and finalizer complete. Gate 3 passes only if
every per-trace, aggregate, duplicate, pure, scheduler, provenance, and storage
gate passes. Preserve a detailed tracked result and commit/push.

On any failure, do not inspect or infer competitive strength and do not launch
M2 outcomes. Repair only the failed technical interface prospectively.

After Gate 3 passes, freeze a separate open-development outcome protocol. It
may compare disabled and the three ceilings, but it cannot change this gate or
use Gate 3 technical traces as competitive evidence.
