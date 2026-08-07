# Full-screen readiness review

Status: **hard no-go for the 127-family screen** as of 2026-08-06.

The legacy three-family job 21296316 passed a narrow, outcome-free smoke test.
The replacement 11-family protocol is implemented and passes mock/no-engine
tests, but it has not yet produced engine evidence. No StrongBot result or
population clearance follows from either state.

## P0 implementation status

### Exact map-load attestation: implemented, engine confirmation pending

The worker now creates a private content-addressed map alias, enumerates every
real-filesystem lookup root, rejects case-fold collisions, intercepts the
pinned filesystem adapter, and hashes the exact bytes supplied to the engine.
It requires one initialization plus two forward and two reverse map-settings
reads. Adapter, marker, count, path, byte-size, or hash drift fails closed.
Adversarial no-engine tests include same-basename/case-variant decoys and exact
read-count checks.

### Per-family isolation and durability: implemented, engine confirmation pending

A sequential supervisor launches one fresh process group per family, imposes a
monotonic timeout, escalates termination after a fixed grace period, reaps the
child, and retains only bounded byte counts and SHA-256 values for streams.
Intent, terminal, shard, checkpoint, and campaign records are strict,
role-free, atomically written, fsynced, and independently re-read by the gate.
Only technical incompletion is retryable, with a prospective maximum of two
attempts. A compatibility `review` or `fail` is complete and cannot trigger a
retry.

### Durable evidence storage: implemented, external recheck pending

Future artifacts are written directly to versioned private project storage at
`research-evidence/map-compatibility-gate-v2`, rather than relying on unstable
scratch retention. The job preserves its logs, scheduler-bound manifest,
pre/post attestations, complete attempt ledger, aggregate, and gate summary.
After the job exits, a separate session must verify scheduler accounting and
rehash the durable bundle with
`scripts/verify_map_fidelity_execution.py` before it is entered in
`RESULT_REGISTRY.tsv`.

## Expanded preflight coverage

The committed `map_fidelity_expanded_preflight_v2.json` contains 11 role-blind
families selected without outcomes or dataset roles. It covers all observed
theaters and declared-start counts and includes global area and byte-size
extrema. Identities, catalog descriptors, the target-population commitment,
and the selected-set commitment are fixed before engine execution.

The expanded preflight is a technical stress test, not a random sample and not
scientific evidence about policy quality. Compatibility status may be examined
because it is the declared purpose of this infrastructure gate; gameplay
outcomes are neither consumed nor emitted.

## P1 requirements before policy evaluation

The 127 representatives contain 33 two-start, 6 three-start, 55 four-start,
20 six-start, and 13 eight-start families. The population compatibility screen
checks one reciprocal pair, so it cannot certify every later evaluation start.
The study therefore requires a second outcome-free gate over every frozen
engine-seed/start pair used by policy evaluation. Only prospectively enumerated
pairs that pass may enter the benchmark.

The confirmatory runner must also satisfy `METHOD_INTERFACE_GATE.md`: no map
identity or coordinates in the conditioned policy interface, equal launched
budgets, prospective family roles, deterministic seeds, fixed retry rules, and
no test-period hyperparameter selection.

## Remaining paper-freeze improvements

- Record final Slurm state, exit code, node, allocation, elapsed time, and
  resource use after each job exits.
- Align the static INI parser with engine duplicate-section, duplicate-key, and
  inline-comment behavior or bound the discrepancy as a limitation.
- Bind OS/native-library metadata, preferably through an immutable container,
  before confirmatory policy evaluation.
- Add an outcome-free delayed-trigger/build/pathfinding smoke test or narrow the
  estimand explicitly to parser/load/early-progress compatibility.
- Release only original code and derived metadata; do not redistribute maps,
  MIX archives, copied game assets, or other third-party material without
  permission.

## Authorization sequence

1. Commit a clean source state and pass build, focused TypeScript tests, all
   research Python tests, shell syntax checks, and `sbatch --test-only`.
2. Run the 11-family calibration with one attempt per family on `pi_jss233`.
3. Rehash the durable bundle from a separate session and diagnose every
   technical failure; code or protocol changes invalidate that calibration
   source commitment and require a new calibration.
4. If technically complete, run the same committed plan with at most two
   attempts and independently verify it again.
5. Review family compatibility classifications and all P0 evidence. Only then
   may this document change from hard no-go to a scoped authorization for the
   127-family compatibility screen.

The later StrongBot diagnostic remains separately blocked until the
method-interface runner and evaluation-seed/start gate pass. No compatibility
preflight, including a perfect one, is a positive paper result.
