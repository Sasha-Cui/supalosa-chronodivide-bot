# Outcome-blind timestamped action-burst diagnostic V1

Frozen: 2026-09-05, after M0 closure and before any new diagnostic
initialization, trace, or policy modification

## Purpose

This diagnostic measures when the current deployed StrongBot, pinned Supalosa,
and RA2Web Advanced request public actions. It provides the missing temporal
evidence needed to define a non-order reservation for
`unified-intent-arbiter-v1`.

It is a technical measurement, not a gameplay experiment. It produces no
competitive outcome, policy ranking, W/D/L, score, endpoint orientation,
defeated state, terminal building count, or performance claim. The current
policy and all opponents are frozen; no action is suppressed, added, removed,
or reordered except symmetric `quitGame` non-forwarding required to keep the
technical horizon. Suppressed quit attempts are recorded in a separate class
and are ineligible for the gameplay non-order reserve.

## Prerequisites

The diagnostic may begin only from:

- completed M0 result
  `research/results/2026-09-05-fresh-dual-v2-complete.md`;
- V2 candidate runtime-tree SHA-256
  `c2bfaf67767ef675fbce2f6c00c6164d77f93a2f58501cd9f4424175996598fc`;
- pinned external Supalosa commit
  `165b77a71d0cf5ebd27c65b19d0486bcbae78d0f` and runtime-tree SHA-256
  `34349919500c8019f9d9b1c2b2a7e2269dd57dde6b3414216bb6336e02977199`;
- RA2Web Advanced bundle SHA-256
  `81d8797b6dd1371ba2dcbd79e25df8b42254290c820159e121a82650fd97a143`;
- game-api file SHA-256
  `dd398f5c8c2b4c3e3d6eb0f9ca6d7549bf70fee16c5950cd8902616ac922497d`;
- the exact 335-asset and 15-map runtime freeze used by V2; and
- clean synchronized `main`.

The implementation must rehash every transitive dependency, asset, map,
runtime, source file, and opponent before launch and again in the finalizer.

## Fresh seed namespace

Reserve unsigned engine seeds
`4,100,000,000 <= seed < 4,101,000,000`. No initialization may use this
range until a new retained-metadata audit checks both the unsigned literals and
their signed-int32 equivalents against project evidence, tracked source,
artifacts, manifests, results, Slurm logs, and known reservation declarations.

The audit must preserve its complete path/hash manifest, exclusions, read
errors, and a collision list. Any unresolved collision requires a new
prospective amendment and a different complete range. A passed lexical audit
does not prove absence from inaccessible archives; report that limitation.

Within the range:

- pinned-Supalosa map block `i`: `4,100,000,000 + 1,000*i`;
- Advanced HFO map block `i`: `4,100,100,000 + 1,000*i`; and
- seed within a block:
  `100*countryOrdinal + 10*candidateStartOrdinal + replicateOrdinal`.

The two reciprocal participant slots share the same engine seed. The tuple of
opponent, map, country, candidate start, slot, and replicate remains unique.

## Population

Use all nine candidate countries and every physical candidate start:

| Opponent | Maps | Starts | Countries | Slots | Base traces |
| --- | ---: | ---: | ---: | ---: | ---: |
| pinned Supalosa | all 15 maps | 56 | 9 | 2 | 1,008 |
| RA2Web Advanced | all ten HFO variants | 38 | 9 | 2 | 684 |

For a map with (S) starts and candidate start ordinal (s), set opponent
start ordinal to:

[
(s + 1 + (c mod (S-1))) mod S,
]

where (c) is the candidate-country ordinal. Use the same country for both
participants. This covers every candidate start, every country, reciprocal
participant slots, and all legal opponent starts without using an outcome.

Add exactly 25 deterministic duplicate traces:

- one base case from each of the 15 pinned-Supalosa maps; and
- one base case from each of the ten Advanced HFO maps.

For map ordinal (i), duplicate the case with country ordinal (i mod 9),
candidate start ordinal zero, and slot (i mod 2). The duplicate uses
`replicateOrdinal=1`; its paired base uses zero. The final population is
exactly 1,717 traces.

Each trace runs exactly 3,600 updates. M0's minimum observed v6 result was
5,549 updates, but that historical observation is not a guarantee for fresh
seeds. Any new trace that cannot reach the horizon is a generic technical
failure that invalidates the complete diagnostic. Do not serialize its
winner, side, endpoint, buildings, score, or termination orientation. A repair
must prospectively replace the entire population or lower the horizon for the
entire population; never drop or selectively replace an early trace.

## Instrumentation boundary

Wrap all 15 methods in the exact pinned `ActionsApi` on both participants:

- `placeBuilding`;
- `sellObject`;
- `sellBuilding`;
- `toggleRepairWrench`;
- `toggleAlliance`;
- `pauseProduction`;
- `resumeProduction`;
- `queueForProduction`;
- `unqueueFromProduction`;
- `activateSuperWeapon`;
- `orderUnits`;
- `sayAll`;
- `setGlobalDebugText`;
- `setUnitDebugText`; and
- `quitGame`.

Preserve each method's physical receiver. For every request record only:

- update, participant side, and method;
- canonical argument SHA-256;
- bounded argument byte length;
- for `orderUnits`, unit-ID count, order type, overload class, and a digest of
  sorted unit IDs;
- target object or tile availability as a boolean technical precondition,
  without owner, health, building totals, endpoint meaning, or outcome; and
- whether the request was forwarded. Only `quitGame` may be unforwarded.

Do not retain raw chat/debug strings, complete unit-ID lists, target identity,
coordinates, hidden economy, opponent queues, or full state. Cap canonical
arguments at 64 KiB before hashing and fail on a larger value. Emit bounded
gzip JSONL, per-trace SHA-256, method counters, and an ordered trace hash.

## Prohibited fields

Recursively reject keys or labels containing, case-insensitively:

`winner`, `outcome`, `score`, `endpoint`, `defeated`,
`gameFinished`, `terminalBuilding`, `remainingBuilding`,
`buildingCount`, or `rank`.

A completed trace may state only that the fixed horizon was reached. Generic
failure metadata may state that the horizon was not reached, but no partial
trace enters the aggregate.

## Frozen action classes

Report four non-overlapping classes:

1. `order`: `orderUnits`;
2. `gameplay_nonorder`: building placement/sale/repair/alliance, production
   pause/resume/queue/unqueue, and superweapon activation;
3. `debug_or_communication`: both debug methods and `sayAll`; and
4. `suppressed_quit`: `quitGame`, which is recorded but never forwarded.

`gameplay_nonorder` alone determines the protected non-order reserve.
All forwarded classes count toward reported total API pressure.

## Temporal summaries

For each trace, side, method, and class compute:

- total calls and calls per 900 updates;
- calls per exact nonoverlapping 900-update quarter;
- maximum calls in any half-open rolling interval ([t,t+900)), with candidate
  windows anchored at every observed request update;
- maximum same-update calls;
- number of updates with multiple calls;
- `orderUnits` IDs requested per call and per rolling window; and
- fraction of exact duplicate method/argument digests within the same update
  and within 30 updates.

Report the complete distributions by opponent, map, topology family, country,
candidate start, opponent start, and participant slot. Report game-equal,
equal-`map,country,start`-cluster, equal-map, and equal-family summaries.
Show (n), mean, median, linear-interpolated IQR, minimum, maximum, and the
0.90, 0.95, 0.99, and 0.999 empirical quantiles. No row may be removed as an
outlier.

The 25 deterministic duplicate pairs must have exact event bytes, counters,
ordered trace hashes, and aggregate summaries. Any mismatch fails the
diagnostic.

## Frozen reserve rule

Let (M_j) be the maximum rolling-900 forwarded
`gameplay_nonorder` call count for trace-side (j). After every technical
gate passes, set:

[
R = maxleft(8, leftlceil max_j M_j ightceil + 4ight).
]

This maximum-plus-four rule is deliberately conservative and uses both
participants, all maps, all countries, all starts, both slots, and both
opponent families. Do not substitute a favorable quantile.

The planned total rolling-900 ceilings remain 75, 150, and 300. If
(R ge 75), record that the smallest ceiling is technically infeasible and
freeze an amendment before implementing the arbiter; do not silently alter
the grid. The diagnostic does not select among total ceilings or establish
that any budget improves performance.

## Technical gates

The finalizer must require:

- exactly 1,717 unique manifest assignments and scheduler task IDs;
- 1,717/1,717 `COMPLETED 0:0`, zero restarts, one CPU, `pi_jss233/day`,
  no GPU and no requeue;
- exact 1,008 Supalosa, 684 Advanced, and 25 duplicate-trace coverage;
- all nine countries, 15 maps, five topology families, all 56 Supalosa starts,
  all 38 Advanced HFO starts, both slots, and prescribed opponent starts;
- exactly 3,600 updates and no early termination for every trace;
- exact runtime/source/map/asset/opponent/seed hashes;
- complete 15-method/two-side wrapper coverage;
- no oversized canonical argument and no prohibited field;
- no unforwarded method other than `quitGame`;
- exact duplicate-pair determinism;
- internally reconciled event, class, method, ID, rolling-window, file, and
  checksum totals; and
- all output and storage limits.

Analyze only after every task and the fail-closed finalizer complete. Never
inspect an individual or partial trace. Preserve any failed population and
repair prospectively.

## Storage and Slurm

Use one selector/reservation-audit job, one disposable preserved outcome-blind
smoke, a `0-1716%64` trace array, and one `afterok` fail-closed finalizer.
Use only CPU partition `day`, account `pi_jss233`, one CPU and at most
8 GiB per trace, no GPU, and no requeue.

Limit each compressed trace to 2 MiB, the complete compressed event population
to 2 GiB, and the execution to fewer than 4,000 new files. Write immutable
sidecars and completion markers only after closing every artifact.

## Advancement

A pass fixes only the technical reserve (R) and closes the diagnostic portion
of M1. Next, before policy outcomes:

1. freeze the `unified-intent-arbiter-v1` implementation contract;
2. attach explicit semantic scope at all 52 direct StrongBot order sites and
   validate the inherited boundary;
3. add proposed/normalized/deferred/emitted telemetry and deterministic
   arbitration tests;
4. extend the strict staggered-damage/base-loss guard to a certified
   final-building race; and
5. implement and test the symmetric API-full-state/fog-respecting observation
   firewall.

Only after those technical gates pass may M2 open-development games begin.
