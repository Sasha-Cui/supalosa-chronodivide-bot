# Outcome-free simulator-compatibility gate

`map-fidelity-gate-v1` is an infrastructure gate, not a policy benchmark.
It uses passive bots, never reads game outcomes or player statistics, and
rejects outcome-bearing JSON. A pass establishes only that the pinned Chrono
Divide simulator can parse, load, advance, and assign one reciprocal start pair
on an exact map artifact. It does not establish Red Alert 2 behavioral fidelity,
strategic suitability, StrongBot strength, or sealed-test validity.

## Frozen population and technical preflight

The full role-blind population is the 127 Tier-B families in
`research/artifacts/role_blind_fidelity_targets_v1.json`. The target artifact
contains family IDs and exact representative path/SHA bindings but no
train/validation/test role, policy outcome, or compatibility adjudication. The
gate independently cross-checks it against `map_family_catalog.json`.

Before a 127-family screen, the committed
`research/artifacts/map_fidelity_expanded_preflight_v2.json` selects exactly 11
families. The selection is outcome-free and covers every observed theater and
declared-start count plus global representative area and byte-size extrema.
Selected families retain their full-population indices and engine seeds. The
plan and its selected-family commitment are exact-hash-bound in the manifest.

The historical three-family job 21296316 passed its narrower legacy smoke test.
It remains useful provenance, but it does not authorize the new full screen.

## Per-family execution contract

After Python prepares the manifest, the compiled worker first executes a
manifest-only cross-language validator. That mode accepts only the manifest
argument, cannot initialize the simulator, and must pass before pre-worker
attestation or family launch.

Each family then runs in a fresh child process under one authoritative Slurm
job. The worker creates a private content-addressed map alias, rejects case-folded
filesystem collisions, intercepts the pinned Node filesystem adapter, and
attests the exact bytes returned to the engine. A complete family attempt
requires five attested map-settings reads: one initialization read, two forward
session reads, and two reverse session reads.

The two passive 1v1 sessions use the same explicit seed with participant order
reversed. Both must reach target tick 250, use distinct declared starts, and
preserve the physical-slot pair under reversal. Static checks validate exact
map bytes, required INI sections and payloads, and declared waypoints.

The supervisor enforces a 125-second monotonic timeout per attempt, terminates
the process group, bounds and hashes child stdout/stderr, and writes atomic
intent, terminal, shard, checkpoint, and campaign ledgers. At most two
prospectively allowed attempts may repair technical incompletion. A
schema-valid compatibility `review` or `fail` is technically complete and is
never retried.

## Provenance and durable evidence

Preparation fails closed on dirty tracked control source, untracked files in
critical source/control directories, Git-query failure, source-blob mismatch,
runtime drift, asset-tree drift, or invalid preflight binding. The manifest
binds the Git commit, source and compiled files, runtime executables, installed
game API and dependency trees, MIX tree, every selected map, environment
allowlist, scheduler identity, and canonical source/runtime bundles.

All new evidence is written directly, without overwrite and with private
permissions, under:

```text
/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/
  map-compatibility-gate-v2/{preflight|full}/<job-id>/
```

The job records private stdout/stderr, manifest, pre-worker attestation, every
attempt ledger and shard, campaign terminal, post-worker attestation, legacy
probe aggregate, gate summary, and supervisor exit code. A technical failure
returns nonzero and retains partial evidence. Compatibility `review` or `fail`
can still be a technically complete aggregate.

## Authorized execution sequence

The job requests one CPU, 4 GiB RAM, no GPU, and uses only `pi_jss233`. First
run scheduler validation and the one-attempt calibration:

```bash
/opt/slurm/current/bin/sbatch --test-only \
  --partition=devel --time=00:30:00 \
  --export=ALL,MAP_FIDELITY_SCOPE=preflight,MAP_FIDELITY_MAX_ATTEMPTS=1 \
  research/slurm/map_fidelity_gate_v1.sbatch

/opt/slurm/current/bin/sbatch \
  --partition=devel --time=00:30:00 \
  --export=ALL,MAP_FIDELITY_SCOPE=preflight,MAP_FIDELITY_MAX_ATTEMPTS=1 \
  research/slurm/map_fidelity_gate_v1.sbatch
```

At the 125-second cap, 11 one-attempt families require about 23 minutes before
build and hashing overhead. If calibration is technically complete and the
durable bundle independently revalidates, run the two-attempt confirmation:

```bash
/opt/slurm/current/bin/sbatch \
  --partition=day --time=01:00:00 \
  --export=ALL,MAP_FIDELITY_SCOPE=preflight,MAP_FIDELITY_MAX_ATTEMPTS=2 \
  research/slurm/map_fidelity_gate_v1.sbatch
```

After either job exits successfully, run the independent verifier from a new
session, substituting the returned job ID:

```bash
JOB_ID=<job-id>
RUN_ROOT=/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/map-compatibility-gate-v2/preflight/$JOB_ID
python3 research/scripts/verify_map_fidelity_execution.py \
  --job-id "$JOB_ID" --scope preflight \
  --run-root "$RUN_ROOT" \
  --output "$RUN_ROOT/execution-verification.json"
```

Eleven families with two capped attempts require about 46 minutes before
overhead. A preflight pass always has `fullCoverage=false`, `passed=false`, and
`eligibleForFidelityClearance=false`; it is infrastructure evidence only.

The 127-family screen remains unauthorized until calibration and confirmation
are technically complete, the evidence is reverified from a separate session,
and `FULL_SCREEN_READINESS_REVIEW.md` is updated. If authorized, its worst-case
two-attempt timeout budget is about 8.8 hours before overhead, so it requires a
separate reviewed submission with an approximately ten-hour wall-time request.
