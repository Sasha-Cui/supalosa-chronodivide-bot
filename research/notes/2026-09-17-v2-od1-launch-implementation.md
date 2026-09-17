# V2 OD1 launch/analysis implementation checkpoint

Date: 2026-09-17. This supersedes the *remaining implementation* list in
`2026-09-17-v2-od1-implementation.md`, without changing its historical account
or the frozen OD1 protocol.

## Completed implementation

The six-stage runner now covers zero-update selection, four canary tasks and
their aggregate, the outcome-discarding smoke, 900 paired tasks, and the sealed
finalizer. A submission helper enforces clean synchronized main, no active
source-bound job, immutable submission intents/receipts, one CPU, pi_jss233/day,
no requeue, exact arrays, and afterok finalizers.

Each task journals every engine initialization/episode attempt **before** the
call. Its existing completion marker retains those launch lines and appends
the final checksum rather than discarding the journal. Successful tasks use
only a payload and marker. Incomplete journals and generic failures remain
preserved. Exact counts are reconstructed from all journals, case assignments,
and scheduler identities; no retry path is provided.

Current-source program/script/compiled-driver/policy identities, map bytes,
335 runtime assets, pinned external Supalosa, Advanced bundle, the prior Gate 2
manifest/result, and the original seed certificate are bound. The metadata
audit discovers post-certificate registration files and rejects unreviewed
schemas/paths or collisions. It reads only registered plans, not sealed
competitive records. New OD1 registrations belong to this frozen study and are
bound by its manifest; failed V1 M2 payloads remain unopened.

Scheduler accounting is reconciled by submission/control/finalizer stages.
Individual array cells validate immutable prerequisite markers and their own
Slurm identities instead of issuing thousands of redundant accounting queries.

## Frozen analysis implementation

- Deterministic 200,000-replicate SHA-256 counter-mode bootstrap with named
  streams, unbiased rejection sampling, empirical sorted-index 20,000 lower
  quantile, and sampled-index/ordered-statistic digests.
- Benchmark-stratum paired score and literal-win effects; the five-topology
  grouped sensitivity keeps original case weights within sampled groups.
- Opponent-specific 18-country/direction cluster bounds and leave-one-topology
  point effects.
- Complete v6 primary/v5 secondary W/D/L, statuses, paired transitions,
  first-result times, map/country/faction/direction/slot tables, and measurement
  transitions. All 900 flattened paired records remain in the aggregate.
- The complete frozen decision checks; broad relative improvement, absolute
  Advanced development eligibility, confirmation, and deployment are separate.
- Independent ledger reconstruction before analysis; complete scheduler
  reconciliation before any paired payload is read by the finalizer.

## Validation and next execution

Fourteen Node tests currently pass, including an independent SHA/bootstrap
reference, exact gate boundaries, a full 900-pair synthetic null study,
scheduler failures, outcome-free canary projections, and two-file launch
journal integrity. TypeScript and the existing 208-test suite are unchanged.
The expanded pure job requires those 208 tests, one runtime test, and these
14 tests: 223 checks. Syntax checks cover the launcher and Slurm entrypoint.

The current-source pure job must complete before selector initialization.
Thereafter use `submit-unified-intent-v2-od1.mjs prepare`, then `canary`,
then `smoke`, then `pairs`, inspecting only complete technical gates between
stages. The helper must not be rerun after a submission intent exists; first
reconcile the receipt and scheduler.

The competitive population, seeds, 24,000-update cap, two arms, endpoint rules,
uncertainty methods, and advancement thresholds are unchanged. No competitive
OD1 evidence has been generated and no policy improvement is claimed.
