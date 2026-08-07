# Full-screen readiness review

Status: **hard no-go for the 127-family screen** as of 2026-08-06.

The legacy three-family job 21296316 passed a narrow, outcome-free smoke test.
The replacement 11-family protocol has now produced two independently verified
engine runs at the same committed source revision. Both reproducibly returned
four `pass`, two `review`, and five `fail` family classifications. No StrongBot
result or population clearance follows from this compatibility evidence.

## P0 implementation status

### Exact map-load attestation: implemented and confirmed

The worker now creates a private content-addressed map alias, enumerates every
real-filesystem lookup root, rejects case-fold collisions, intercepts the
pinned filesystem adapter, and hashes the exact bytes supplied to the engine.
It requires one initialization plus two forward and two reverse map-settings
reads. Adapter, marker, count, path, byte-size, or hash drift fails closed.
Adversarial no-engine tests include same-basename/case-variant decoys and exact
read-count checks. Jobs 21599648 and 21600745 each authenticated all five reads
for every technically complete family attempt.

### Per-family isolation and durability: implemented and confirmed

A sequential supervisor launches one fresh process group per family, imposes a
monotonic timeout, escalates termination after a fixed grace period, reaps the
child, and retains only bounded byte counts and SHA-256 values for streams.
Intent, terminal, shard, checkpoint, and campaign records are strict,
role-free, atomically written, fsynced, and independently re-read by the gate.
Only technical incompletion is retryable, with a prospective maximum of two
attempts. A compatibility `review` or `fail` is complete and cannot trigger a
retry. The confirmation completed all 11 families on their first attempt,
demonstrating that none of the negative classifications was retried away.

### Durable evidence storage: implemented and independently rechecked

Future artifacts are written directly to versioned private project storage at
`research-evidence/map-compatibility-gate-v2`, rather than relying on unstable
scratch retention. The job preserves its logs, scheduler-bound manifest,
pre/post attestations, complete attempt ledger, aggregate, and gate summary.
After each job exited, a separate session verified scheduler accounting,
runtime and source provenance, all schemas and cross-file bindings, and a fresh
tree commitment with `scripts/verify_map_fidelity_execution.py`. The final
calibration and confirmation are registered in `RESULT_REGISTRY.tsv`.

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

## Executed evidence and decision

Final calibration job 21599648 and confirmation job 21600745 both used commit
`eab4925d420a28b5c04ae72c473d7d5bf74ac3e7`, completed 22/22 reciprocal
passive sessions, and were independently verified. Their evidence-tree
commitments are respectively
`85b92025795aa842149d2d7f6c5ad3f89d299555c7b59124bf38b6d03dd6b4c0` and
`f1528632f4026251b13ae0c7315ce937a3c483aba85394f3dbe49dab1e81d718`.

The normalized family evidence is exactly reproducible: four `pass`, two
`review`, and five `fail`. Three failures share one `missing_asset` diagnostic,
one has a distinct `missing_asset` diagnostic, and one is
`unsupported_theater`. Both review families reach tick 250 but emit stable
non-outcome warnings. The aggregate has `technicalChecksPassed=true` while its
compatibility verdict is `FAIL`, `screenComplete=false`, and
`eligibleForFidelityClearance=false`.

This combination means the infrastructure worked and exposed a real scope
problem. It does not authorize the 127-family screen. The next admissible step
is outcome-free diagnosis of these classifications, followed either by a
source/asset repair and repeated preflight or by a prospectively justified,
fully reported supported-map universe. Policy outcomes must remain sealed
during that choice.

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

## Completed authorization steps and remaining gate

1. **Complete:** clean source, build, focused TypeScript tests, all research
   Python tests, shell syntax checks, and scheduler validation.
2. **Complete:** one-attempt calibration on `pi_jss233`.
3. **Complete:** independent rehash and validation of the calibration bundle.
4. **Complete:** same-commit confirmation with at most two attempts, followed
   by independent validation; no family needed a retry.
5. **Failed compatibility gate:** review of the reproducible classifications
   found five `fail` and two `review` families. Diagnose and repair them, or
   freeze a defensible supported-map population without examining policy
   outcomes, then repeat this gate before considering the 127-family screen.

The later StrongBot diagnostic remains separately blocked until the
method-interface runner and evaluation-seed/start gate pass. No compatibility
preflight, including a perfect one, is a positive paper result.
