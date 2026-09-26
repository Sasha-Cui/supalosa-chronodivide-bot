# S1 immutable storage, registration and provenance foundation

Updated 2026-09-26 after trusted access was restored. The unchanged prospective
S1 protocol still governs the study. This is implementation and development
verification only: no real S1 initializer, game, full seed census, launch intent
or Slurm stage has run. The execution harness is not yet complete.

## Implemented runtime modules

- `research/runtime/strategic-s1-io.mjs` owns the new canonical study/execution
  namespace, stage paths, immutable directory reservations, fsynced exclusive
  publication and launch journals, checksums, exact published-file sets,
  failure preservation and CPU scheduler/resource accounting checks.
- `strategic-s1-registration.mjs` implements the exact metadata census and
  historical registration checks. The slow real census is callable only in
  the future pi_jss233/day Slurm prepare stage, before any initializer.
- `strategic-s1-contract.mjs` reconstructs exact cases; fixes disabled deployed
  factory options, names, participant RNG identities, api_full_state mode,
  starts, slot order and unchanged game settings; defines exact launches and
  outcome-free zero-update observations.
- `strategic-s1-provenance.mjs` binds protocol, source/program/wrapper,
  configuration, source inventory, runtime trees, original/effective API,
  pinned opponents/maps/assets and optional ai.ini. It intentionally rejects
  readiness until every required harness file exists and main/fork are clean
  and synchronized inside the expected CPU Slurm environment.

Historical D1/OD1 programs, policies, protocols and evidence were not changed.
There is no initializer or advancing simulation call in these new modules.
The future runner must invoke the validated factories with the actual pinned
dependencies and enforce every prerequisite before loading/initializing a game.

## Namespace, integrity and resource contract

The new layout is `research-evidence/strategic-diagnostic-s1/execution-v1`:
manifest; canary/task-00 through03; canary-finalizer; smoke; cases/task-0000
through0199; finalizer. Each completed stage/task has exactly record.json and
COMPLETE, totaling 416 execution files. Logs stay outside that namespace.

Reservations fail on EEXIST, including failed/partial attempts. Launch records
bind exact case/role/seed/policy/mode and reject duplicate case/mode tuples.
Publication requires literal complete/passed flags, correct stage, matching
durable journal and exclusive output creation. Unknown extra files, corrupted
markers/hashes, symlinked ancestors/markers (including dangling symlinks),
duplicate publication and post-failure launches fail closed. Failed artifacts
are never cleaned or silently replaced. Marker append uses O_NOFOLLOW.
JSON rejects nonfinite/undefined/sparse/circular/non-plain/symbol-keyed values
instead of silently normalizing them. Shared noncyclic references are allowed.

The main-game bound remains exactly 32 MiB. The prospectively selected complete
finalizer artifact bound is 384 MiB, below Node's single-string ceiling and
separate from per-game limits. It accommodates the earlier 55,109,610-byte
synthetic aggregate without deleting frequencies/groups. A development test
publishes/reads an aggregate larger than 32 MiB and verifies that the same
payload is rejected as a main-game artifact. No actual aggregate is published.

Declared requests for the future wrappers are one CPU, one node, no GPUs and
no restarts/requeue, account pi_jss233, partition day:

- Pure: 8 GiB, two hours.
- Prepare: 8 GiB, eight hours, allowing the complete metadata census.
- Canary workers, smoke and main workers: 8 GiB, six hours.
- Canary finalizer: 8 GiB, one hour.
- Main finalizer: 24 GiB, eight hours.

These are implementation requests, not submitted jobs or duration predictions.
The future wrappers/submission helper must implement them exactly. Accounting
requires the full 4/200 allocation population, completed0:0, exact account,
partition, CPU, zero restarts, requested memory/time and repository workdir.
The parser handles K/M/G/T and node/per-CPU request units without assuming
integer-K memory. Publication resource limits do not imply playing strength.

## Registration and observation boundaries

The metadata census allows exactly 11 discovered paths: nine prior registrations,
the original seed certificate and its Gate2 submission receipt. It includes all
205 D1 definitions in addition to all 905 OD1 A1 definitions, canaries/smoke and
earlier registrations. It reconstructs the failed original OD1 905-definition
journal and binds its failure/audit/accounting evidence. Unknown, missing,
duplicated, changed or colliding registrations fail closed, even under current
or historical study roots. There are no blanket directory exemptions.

The original certificate and its 585,357,862-byte supporting audit remain
hash-bound. The implementation will rehash that supporting audit in Slurm,
without interpreting gameplay payloads. The actual full census has NOT run.
The nine registrations are cross-bound to D1's audited registration chain.
Prior zero-update initialization count is 2,015; S1 adds 205 only when its real
selector completes. No proposed seed is marked consumed by synthetic tests.

The factory contract fixes unchanged StrongBot: empty strategy overrides,
intentArbiter enabled=false, unchanged deployed map/default tactics, names
OD1Candidate/OD1Opponent and stable candidate/opponent RNG identities.
All 205 definitions are tested for identical game settings and map mode1.

The public PlayerData interface does not expose a slot-number field. Slot
verification is explicitly labeled source-bound agent order plus the pinned
offline creator mapping, not an independent engine-slot read. Country/start
coordinates and participant identities are checked through public APIs.
Seed verification retains the pinned Date.now-seconds shim and participant
stream derivation; it is not a second engine PRNG trace. Zero-update validation
also requires literal unfinished/not-defeated state and absent arbiter telemetry.

The provenance configuration forbids a new CHRONO_AI_INI_PATH override or
repository data/ai.ini, and pins driver/data/ai.ini at 84,972 bytes and SHA-256
`1feac6ddea6886b177ddf7e5f8580b7a99a63f12684f2cbb42831671bb7a8a79`.
It checks the original and explicitly transformed game API identities and the
loaded adapter marker. Original API SHA-256:
`dd398f5c8c2b4c3e3d6eb0f9ca6d7549bf70fee16c5950cd8902616ac922497d`;
effective SHA-256:
`4ad4a5dd7a6a8ae53a7e671a29d7dd0a5fbad1916d94e52c69c9eda133a30f0c`.

## Development verification

Current formatted-source build and **388 development checks passed**:
329 Vitest assertions across33files plus59Nodechecks, including20new runtime
checks. All failed/pending/todo/skipped/cancelled counts are zero. The new tests
cover durable I/O and corruption, byte limits, full scheduler populations,
strict census/collisions/history, disabled factories, all205settings, zero-update
observation semantics, launch counts and fail-closed incomplete-harness detection.

Read-only runtime verification matched335assets,15maps, the172-file pinned
external runtime tree and original/effective API hashes. This is not a formal
Slurm gate or permission to launch games. Current candidate/driver runtime
trees will be source-bound by the complete formal gate and stage context.

Evidence:
`research-evidence/strategic-diagnostic-s1/development/runtime-regression-uNu5Iu/result.json`,
15,737 bytes, SHA-256
`d625e374e86bf0035696478f35074c9c75977968216bea8825909c403c9ce408`.
All source/report/log identities and synthetic filesystem fixtures are preserved.
The earlier `runtime-foundation-kWpiuT` retains the first20-check pass.
Test fixtures use unique development subdirectories, never real execution
reservations or fake manifest/record.json registrations. Corrupt/dangling
fixtures are intentional, preserved negative test evidence, not study failures.

One local tool-script quoting error prevented the first runtime-test patch
command from executing remotely; corrected quoting succeeded. A helper inserted
into a nested scope during patching was moved to module scope during review,
before execution. No engine or source-bound job ran in those intermediate states.

## Remaining before any formal gate

Still missing: complete stage-envelope validation, stage runner and finalizer
integration, formal pure-gate program, immutable submission helper, CPU Slurm
wrappers and their complete integration tests. These missing files are explicit
in the source guard; it must not be bypassed to submit the pure or selector job.
The submission path must require independently verified prerequisite completions,
not merely native passed flags or historical D1 receipts.

Before initialization, validate the complete preparation metadata envelope,
including source/runtime/pure/plan/seed audit; only then permit API initialization.
Use the exact stage layout/requests and the separate aggregate bound. Confirm
full scheduler completion before any competitive payload read; preserve every
launch/attempt and keep source unchanged through dependent jobs/audits.

After the full implementation is committed/pushed, proceed only through formal
pure →205selector →8canary →1smoke →200main/finalizer, independently verifying
each gate, then independently replay the complete retained study. No manuscript,
deployment, superiority or M2-completion claim is authorized by these checks.
