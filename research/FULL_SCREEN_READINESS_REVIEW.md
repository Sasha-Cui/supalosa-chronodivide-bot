# Full-screen readiness review

Status: **hard no-go for the 127-family screen** as of 2026-08-04.

This review follows the successful three-family, outcome-free preflight in
Slurm job 21296316. That job is credible infrastructure evidence: all three
role-blind representatives and all six reciprocal passive sessions reached tick
250 under `pi_jss233`, with no captured warning category or global provenance
finding. It remains a preflight, not a StrongBot result or population clearance.

## P0 requirements before another engine screen

### Exact map-load attestation

The current runner hashes `mixDir/mapName`, but the pinned game API resolves the
requested name through three case-insensitive real-filesystem roots and then
ordered archives. Its roots are `mixDir`, package resources, and
`process.cwd()`. The preflight ran with the repository as cwd, whose complete
contents were not bound as a VFS input. Matching starts are indirect evidence,
not proof of the exact bytes passed to the engine.

The replacement must:

1. create a deterministic, content-addressed map alias as a new regular file in
   a private per-family cwd;
2. enumerate all real-filesystem roots and reject every case-fold collision;
3. intercept the pinned Node filesystem adapter at the map read;
4. hash and retain the exact bytes returned to the engine in memory;
5. require one attested read during initialization and two during each of the
   forward and reverse game creations; and
6. independently validate the resulting five-event attestation.

Any API, adapter, marker, version, path, count, size, or hash drift must fail
closed. A same-basename/case-variant decoy test is required. No patch to the
unlicensed game-API bundle will be distributed.

### Per-family isolation and durability

The current Node process initializes one global engine, loops over every map,
and writes only the final aggregate. A hang, crash, or contaminated engine state
could therefore lose or bias the whole screen.

Use one sequential child process per family under one authoritative Slurm job.
A parent supervisor must enforce a monotonic wall-clock timeout, terminate the
child process group, escalate to `SIGKILL` after a fixed grace period, reap the
child, and retain only bounded byte counts and SHA-256 values for stdout/stderr.
It must write strict, role-free intent, terminal, shard, and completion records
with file `fsync`, atomic rename, and directory `fsync`. At most two
prospectively allowed attempts may repair technical incompletion. A schema-valid
compatibility `review` or `fail` is complete and must never trigger a retry.

The final schema-1 aggregate remains in immutable manifest order and is checked
independently. Full tree provenance is verified once before workers and again
after aggregation, rather than re-reading roughly 500 MiB for every child.

### Durable evidence stage-out

The scratch roots for jobs 21291720, 21296136, and 21296316 were readable and
hash-validated, then repeatedly alternated between readable and `ENOENT` on the
same host. The raw roots are currently not consistently accessible. The
committed summaries and exact hashes remain, but raw evidence retention must be
treated as unstable.

All future manifests, shards, summaries, logs, scheduler records, and attempt
ledgers must be atomically staged into versioned project storage before job exit
and then reverified from a separate session. Scratch may hold working data but
cannot be the sole evidence store. Stage-out must run even when compatible maps
produce `review` or `fail` classifications.

## P1 requirements for scientific use

### Evaluation-relevant start coverage

The 127 representatives have this declared-start distribution:

| Declared starts | Families |
|---:|---:|
| 2 | 33 |
| 3 | 6 |
| 4 | 55 |
| 6 | 20 |
| 8 | 13 |

Thus 94/127 families have more than two starts, while the present screen checks
one reciprocal pair at one seed. A map-level compatibility pass does not prove
every later evaluation start.

The study will use a two-stage rule: the population screen establishes basic
load/progress compatibility for one attested pair, then an outcome-free gate
checks every frozen engine-seed/start pair that an evaluation can use. Only
those prospectively enumerated pairs may enter policy evaluation. Exhaustive
coverage of unused starts is not claimed.

### Diagnostics and schemas

- Capture child stdout, stderr, and `process.emitWarning` in addition to
  `console.*`; unexplained nonempty output is a prespecified finding.
- Enforce exact required fields and types for manifests, child artifacts,
  aggregates, and summaries, not merely unknown-key rejection.
- Reload the role-blind target artifact and independently recompute its
  population commitment and every representative path/SHA.
- Verify source blobs against the recorded Git commit.
- Distinguish infrastructure completion from the scientific fact that some
  families are incompatible. A complete screen may contain per-family
  `review`/`fail` without losing stage-out.
- The next role-blind preflight must cover every theater plus start-count and
  map-size extremes. The first preflight covered two TEMPERATE and one URBAN
  representative; the full eligible pool contains 67 TEMPERATE, 41 SNOW, 18
  URBAN, and 1 DESERT representative.

## P2 improvements before paper freeze

- Call this a simulator-compatibility screen, not behavioral fidelity.
- Require `initialTick == 0` and consistent update/tick arithmetic.
- Align the static INI parser with engine duplicate-section, duplicate-key, and
  inline-comment behavior.
- Bind native libraries and OS/runtime metadata, preferably in an Apptainer
  image, before confirmatory execution.
- Add a longer outcome-free scripted smoke test for building, pathfinding, and
  delayed triggers, or explicitly include those failures in the estimand.
- Record final scheduler state, exit code, node, resources, Slurm version, and
  every attempt/retry in the durable evidence bundle.

## Authorization criterion

Do not submit the 127-family run until all three P0 controls and their
adversarial no-engine tests pass, an isolated role-blind preflight covers the
technical strata above, every checkpoint is role-free and exact-hash-bound, and
the durable bundle is independently reverified. The later StrongBot diagnostic
remains separately blocked on method-interface and baseline gates.
