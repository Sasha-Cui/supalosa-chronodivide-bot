# Finish-advantage V18 integration plan

Recorded: 2026-08-15 (America/New_York)

This plan is outcome-blind and was written while sealed V5 array `22312734`
was still active. It does not authorize modifying the tracked checkout before
array `22312734`, technical gate `22312776`, and unblinder `22312779` are all
terminal and fully reconciled.

Required source state before integration:

- repository `/nfs/roberts/project/pi_jss233/zc362/chrono_divide/strong-chronodivide-bot`
- branch `main`
- `HEAD == fork/main == d6b7190e77f4ad730f37ac43e0e0b0ceaf6f5ff6`
- no tracked changes
- staging manifest
  `IMPLEMENTATION_STAGING_MANIFEST_V18.md` SHA-256
  `3a4f2c655ba1ef6e6bf575eeb827ea607626b6a8426e9060865f56a029ef7ae4`

## Commit 1: policy and controller

Type: `feat`

Copy production files for finish-advantage control, policy, strategy, mission
ownership, passive observation, explicit composite construction, terminal
base-race guard, and the prospective `terminalObjectiveStrategy.ts` change into
`packages/chronodivide-bot-driver/src/training/`. Copy their focused tests into
`packages/chronodivide-bot-driver/src/test/`.

The commit must pass the focused unit suite and repository build independently.
The external Supalosa package remains untouched.

## Commit 2: outcome-blind technical gates

Type: `test`

Copy state-audit, all-official-map compatibility, composite compatibility, and
their tests into the driver source/test directories. Copy the corresponding
Slurm scripts into `research/slurm/`. This commit may depend on commit 1 but
must not access competitive outcomes.

Run deterministic diagnostics locally first. Then run the frozen Slurm gates
under `pi_jss233` with exact job IDs recorded in the experiment ledger.

## Commit 3: complete open causal screen

Type: `feat`

Copy open-screen analysis, episode, campaign, cell, finalizer, tests, and Slurm
controller/shard scripts. This commit must retain the four-to-six-arm freeze,
all nine countries, reciprocal slots, ten open map families, common seeds,
literal endpoint, and no-retry scheduler accounting.

Do not launch until the state audit, official-map gate, and composite gate have
all passed on this exact clean pushed commit.

## Commit 4: protocols and reproducibility notes

Type: `docs`

Copy the frozen prospective-design, doctrine, state-audit, official-map,
composite-gate, open-screen, confirmatory, compute, mission-interface, and
process-lessons documents into a tracked `research/protocols/finish-advantage/`
directory without altering their content. Record original external evidence
paths and SHA-256 values in an index.

## Verification and launch order

1. Compare every copied staging file against the V18 manifest.
2. Run focused Vitest, strict TypeScript build, package build, and `bash -n`.
3. Verify clean `main`, commit IDs, `fork/main`, external Supalosa commit, map
   bytes, package lock, and runtime-tree hashes.
4. Run the outcome-blind state audit.
5. Run the official-map live compatibility gate.
6. Run the 72-game composite technical gate, including the five deterministic
   terminal base-race cases and live all-country/slot coverage.
7. Generate the complete open causal screen only after all three gates pass.
8. Launch once, with no outcome-conditioned retries; finalize only after all 90
   shards complete cleanly under `pi_jss233`.
9. Advance exactly one arm only if every frozen positive-signal and mechanism
   criterion passes. Otherwise revise prospectively on open development data;
   never inspect or reuse sealed test-family outcomes.

Paper writing and screenshot selection remain prohibited until a candidate
passes the later fresh-family confirmation with uncertainty analysis.
