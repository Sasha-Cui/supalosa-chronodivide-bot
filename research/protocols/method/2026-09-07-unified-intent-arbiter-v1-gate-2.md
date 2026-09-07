# Unified intent arbiter V1 Gate 2: disabled live equivalence

Frozen: 2026-09-07, after pure Gate 1 passed and before seed audit,
selection, game initialization, or live-equivalence observation.

Parent:

research/protocols/method/2026-09-07-unified-intent-arbiter-v1.md

Gate 1 result:

research/results/2026-09-07-unified-intent-arbiter-v1-gate-1.md

## Question

Does adding the dormant integration surface leave live StrongBot behavior
exactly unchanged when the arbiter is explicitly disabled?

This is an outcome-blind technical identity test. It neither enables an
arbiter ceiling nor evaluates strength.

## Seed reservation

Audit the complete retained project evidence recursively for the unsigned
interval [3,070,000,000, 3,071,000,000) and its signed-int32 equivalent
[-1,224,967,296, -1,223,967,296). Scan JSON, JSONL, CSV, TSV, Markdown,
plain-text logs, compressed gzip text, and file/path tokens using both numeric
representations. Record every path, size, read error, candidate token, and
collision. The audit must run as one CPU job under pi_jss233/day and write an
immutable complete artifact plus SHA-256 marker.

The earlier complete A2 audit found zero collisions in this interval, but that
audit predates the action-burst execution. The new complete scan is
authoritative. No game may initialize from this interval unless the new scan
finishes with zero collision and zero read error. On failure, preserve the
artifact and freeze an amendment before choosing another range.

## Frozen population

Use the pinned M0 runtime, exact map bytes, explicit-start loader, Node
20.13.1, and pinned external Supalosa opponent. Declare observation mode
api_full_state for both agents.

Five maps cover the five physical topology families:

| Map | SHA-256 | Start A | Start B |
|---|---|---|---|
| HFO LE | e4dfc736a6355e0e68d4681e4d67419516e6bb94549e2d42880c9414e95e2e8d | 39,82 | 88,34 |
| Peak of Perfection | 440715dc154ac10b4b922159824140d40c48990311c6838345b66958f3b3a442 | 118,73 | 37,73 |
| Tour of Egypt | 2e660f22cf5ef994ca7453d14b9f68349063f9086b7c7c038f58e2067706236e | 22,72 | 41,91 |
| South Pacific | 89a428f214d5ca2a5f650b94e2847fc493d51805aac04f869f1fcc76e4db3381 | 57,98 | 99,148 |
| Pacific Heights | 8ba46066a7e034c37b2367bd07df94be8d6252757d4396ea68d21bc226fa8898 | 83,146 | 43,80 |

For every map use both directed orientations A-to-B and B-to-A, all nine
countries, and candidate slots 0 and 1. Countries in order are Americans,
Alliance, French, Germans, British, Africans, Arabs, Confederation, and
Russians.

This gives 5 x 2 x 9 x 2 = 180 paired cases.

## Frozen arms and seeds

Each paired case runs two arms:

- unwrapped: deployed StrongBot with no intentArbiter option;
- disabled: deployed StrongBot with intentArbiter enabled false and no
  boundary installation.

Both arms in a pair use the identical engine seed:

3,070,000,000 + mapOrdinal x 36 + directionOrdinal x 18 +
countryOrdinal x 2 + candidateSlot.

There are exactly 180 distinct seeds and 360 game tasks. No seed is reused
outside its two-arm pair.

## Outcome-blind selector

Before the array, run a zero-update selector that initializes candidate and
opponent for every distinct case and verifies:

- exact map hash and advertised game mode;
- exact requested and effective seed;
- exact candidate/opponent start coordinates and ordinals;
- exact country and candidate slot;
- pinned external opponent/runtime identity;
- source, program, protocol, seed-audit, asset, dependency, and loader hashes;
- zero engine updates;
- 180 unique cases and exact map/direction/country/slot balance; and
- recursive absence of W/D/L, winner, outcome, score, endpoint, defeated
  state, terminal building state, or ranking.

The selector writes one immutable 360-task manifest. A preserved task-0 smoke
must then complete the fixed horizon and pass all technical checks before the
array launches.

## Fixed-horizon trace

Every task runs exactly 3,600 engine updates. If either arm ends earlier, emit
only a bounded generic technical failure and fail the complete population. Do
not record game-finish orientation.

For candidate and opponent record canonical incremental hashes and counts of
all 15 public ActionsApi methods. Do not suppress or modify any action. At
updates 0, 900, 1,800, 2,700, and 3,600, record canonical player-relative
technical snapshots containing:

- credits and power;
- production queue status, object name, quantity, and progress for every
  queue;
- sorted own visible unit inventory with ID, owner, type/name, tile,
  hit points, stance, idle/movement state, and production/build state;
- sorted currently visible enemy inventory using the same public fields;
- exact observed starts; and
- snapshot and cumulative action hashes.

The trace may record whether the fixed horizon was reached. It may not record
W/D/L, score, winner, defeated side, endpoint orientation, terminal building
count, or policy ranking. Each successful task writes exactly one compact
trace JSON and one combined completion/checksum marker.

## Pairwise identity gate

After all 360 tasks complete cleanly, a fail-closed finalizer reads the
complete population only. For each of the 180 pairs require exact equality of:

- candidate action count and hash;
- opponent action count and hash;
- every per-method count;
- all five candidate snapshots;
- all five opponent snapshots;
- production queues and credits;
- unit inventories and public object fields;
- requested/effective seeds, starts, country, slot, map, and runtime;
- fixed update count; and
- trace schema.

Require zero unequal pair in every map, direction, country, and slot stratum.
Do not average mismatches and do not exclude a pair.

## Scheduler, storage, and provenance

- source-bound main and fork/main must be identical and clean;
- account pi_jss233, CPU partition day, no GPU, no requeue;
- selector: one CPU, 8 GiB, at most one hour;
- smoke: one CPU, 8 GiB, at most two hours;
- array: exactly tasks 0-359 at concurrency at most 64, one CPU and 8 GiB
  each, at most two hours;
- finalizer: afterok with kill-on-invalid-dependency, one CPU, 16 GiB, at most
  four hours;
- successful array stdout/stderr go to /dev/null;
- preserve exact scheduler job IDs, states, exits, CPU counts, restarts, and
  elapsed seconds;
- no retry, replacement, or selective rerun; and
- the complete execution must remain below 1,000 new files.

Bind source commit and SHA-256 for the parent protocol, this Gate 2 protocol,
seed audit, selector/trace/finalizer programs, all Slurm scripts, runtime
freeze, candidate and external opponent trees, transitive dependencies,
assets, all five maps, and the generated manifest.

## Advancement

Gate 2 passes only with 180/180 exact pairs and every technical/provenance
gate. Preserve and commit the full result.

On any mismatch, do not launch Gate 3. Diagnose the disabled integration using
open technical fields, repair prospectively, and rerun a newly frozen complete
population without excluding the mismatch.

Only after Gate 2 passes may the already specified enabled fixed-horizon Gate
3 campaign be frozen and implemented. No competitive endpoint is authorized
by Gate 2.
