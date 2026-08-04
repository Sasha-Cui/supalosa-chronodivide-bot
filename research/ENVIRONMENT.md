# Research environment

Observed audit environment (2026-08-02):

- Bouchet module: `nodejs/20.13.1-GCCcore-13.3.0`
- Node: `v20.13.1`
- npm: `10.5.2`
- lockfile SHA-256: `59ad1d212f1ebe8fba5913ced9c096c97d5840c93abc76bfa863737c6589458d`
- Chrono Divide game API: exact lockfile package `0.75.0`
- TypeScript: `4.9.5`
- Vitest: `4.0.18`
- Canvas: `3.2.0`

The Vite dependency declares a newer Node engine than 20.13.1, so `npm ci`
emits an engine warning. Build and tests succeeded in the observed environment,
but a release artifact should be retested under Node >=20.19 or >=22.12 and
that runtime should then be pinned. Do not run `npm audit fix` as part of
reproduction: the audit observed 9 dependency findings (2 low, 6 high, 1
critical), and an automatic rewrite would change the evaluated stack.

The clean source baseline lives at
`/nfs/roberts/project/pi_jss233/zc362/chrono_divide/supalosa-chronodivide-bot`.
Chrono Divide checks bot identity with JavaScript `instanceof`; loading a
second physical copy of the API makes an otherwise clean baseline fail. Run
`research/scripts/prepare_external_baseline.sh` to build the clean source and
then share only the exact game-API runtime object with the candidate. The
baseline descriptor and both Git states are recorded in every new manifest.

Scheduler account labels in the schema-2 audit manifests are not authoritative:
the interactive fallback overrode `SLURM_JOB_ACCOUNT`, while `scontrol` and
`sacct` show job `20965700` was charged to `prio_btk22`. The requested
`pi_jss233` submission was rejected before job creation. Schema 3 now queries
Slurm for account, QOS, and partition and records environment labels separately;
see `artifacts/scheduler_accounting_correction.json`.

The transient 2026-08-04 `QOSMaxSubmitJobPerUserLimit` later cleared without
using or cancelling unrelated work. Seed replay job 21291720 then completed
under authoritative account `pi_jss233`, QOS `normal`, and partition
`devel`. Attempts 21291567 and 21291713 failed at time zero with exit 127 and
zero games because the compute-node batch shell did not expose the module
function, even after explicit Lmod initialization. The successful script pins
the Node, ICU, GCC, and OpenSSL dependency paths directly. See
`artifacts/pi_jss233_readiness_2026-08-04.json` for the earlier blocked state
and `artifacts/seed_replay_gate_v1_execution.json` for the completed gate and
both failed launcher attempts.

The pinned game API 0.75.0 has no public game-seed field in
`CreateOfflineOpts`; `TRAIN_SEED` controls only policy mutation. Inspection of
the exact runtime shows that offline creation seeds an internal Mersenne
Twister from game ID `"0"` and `floor(Date.now()/1000)`. Four fresh processes
requesting the same effective configuration produced four distinct terminal
signatures, including three distinct first-attempt runs. Cross-process
variability under the old unseeded harness is therefore established; those
runs are not independent seeded replicates.

The current audit branch now supplies an explicit uint32 engine seed without
silently modifying the installed package. At startup it validates the pinned
0.75.0 runtime markers, then temporarily maps
`Date.now() = requestedEngineSeed * 1000` while the offline game is created.
The same inspection also found that external `Bot` instances receive a
`GameApi` whose random calls use `Math.random`, not the engine Mersenne Twister.
The sequential match wrapper derives a root Mulberry32 seed as
`requestedEngineSeed xor 0x9e3779b9`, then installs separate candidate and
baseline streams by XORing that root with `fnv1a32(participantIdentity)` during
each synchronous bot callback. Extra candidate draws cannot advance Supalosa's
stream, and reversing the agent-array slot order does not exchange participant
streams. It restores callback wrappers and both globals in `finally`, disposes
failed matches, and rejects overlapping seeded sessions in one process.

Requested engine seed, root and participant bot seeds, and exact seed-to-epoch
mapping are recorded in manifests, match results, and traces. Unit tests prove
propagation, failure-path restoration, participant-stream isolation, and slot
invariance; an in-process engine/bot probe produces an identical trace for
repeated seed 424242 and a different trace for 424243. Reciprocal `0,1` slot
runs now reuse one explicit `seedBlockIndex`, while paired runs reject
rejection-based start filtering.

The fresh-process gate passed in Slurm job 21291720 under `pi_jss233`.
`research/slurm/seed_replay_gate_v1.sbatch` launched ten fresh benchmark
processes with seed 424242 plus one with seed 424243 and recorded state every
250 ticks. All ten same-seed processes yielded the identical 73-record
normalized trace (SHA-256
`448b3ed3ef2e46b82848b90d9e8a820ce2864dea0e7aeaf1004cfa58c86da873`);
the different seed yielded SHA-256
`e220a7d7f516bc7e297eb80167f784c429292c64770e26f9d1300143ad371571`.
All seed fields and authoritative scheduler fields validated. The eleven
matches were all tick-cap draws, which is acceptable for the deterministic
trace endpoint but supplies no evidence about match strength. The exact
registered outputs are
`artifacts/seed_replay_gate_v1_summary.json` and
`artifacts/seed_replay_gate_v1_execution.json`.
