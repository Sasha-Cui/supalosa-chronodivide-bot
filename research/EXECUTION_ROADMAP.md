# Prioritized execution and compute plan

## Isolation and preservation

All new work is on branch `codex/chrono-divide-paper-audit` in the existing
candidate checkout. Historical result trees, Slurm logs, checkpoint directories,
dirty HFO snapshots, and the clean upstream source checkout remain untouched.
New generated outputs go to the append-only scratch root:

`/nfs/roberts/scratch/pi_jss233/zc362/chrono_divide-paper-audit`

The research harness refuses to overwrite a run ID and writes a manifest,
JSONL event stream, structured failure record, and summary per run.

Manifest hashes fingerprint exact runtime trees but do not preserve their
bytes. The schema-2 pilot therefore also has a 603-entry source/runtime archive
in `scratch/.../snapshots` (SHA-256 `494c5d38...834149`). Every scientific run
must use a clean committed source snapshot or create and register an equivalent
archive before later edits or rebuilds.

## Priority order

### P0 — infrastructure and falsification pilot

1. Build/test candidate and clean upstream.
2. Verify both bots share the exact game-API runtime object while source remains
   separate; otherwise Chrono Divide's `instanceof` bot check rejects the game.
3. Run the four-task `audit_pilot_v1` array: profiled versus genuinely generic
   candidate, each at both physical starts, against clean upstream.
4. Verify manifests, map/lock/source hashes, W/D/L score, failure records, start
   rejections, and authoritative `scontrol`/`sacct` accounting.
5. Treat the result only as harness validation: it uses one simple map, one
   opponent, unresolved simulator dependence, and eight repeated calls per cell.

### P1 — scientific readiness gates

1. Explicit engine and identity-separated candidate/baseline RNG control is
   implemented with unit and same-process evidence. Run the packaged
   `seed_replay_gate_v1` under `pi_jss233` and require 10/10 fresh-process
   trace identity plus different-seed divergence.
2. Validate full-map fidelity beyond tick 1 and turn parser warnings into
   explicit failure categories.
3. The outcome-blind catalog currently groups 333 files into 145 conservative
   families. Preserve both the strict 7-family ceiling and the evidence-based
   127-family provisional pool; manually adjudicate revision links and exclude
   all 18 families with adaptive evidence.
4. Freeze a provisional 16-train/8-validation/26-test family split and test-
   access policy only after family adjudication and fidelity screening.
5. Implement fixed generic, clean upstream, random search, and a current
   profiled development-only upper bound with equal launched-simulation
   accounting; never fit the upper bound on a sealed zero-shot map.
6. Add tests proving that both automatic profiles and exact-coordinate tactics
   are disabled in the generic condition.
7. Add shuffled policy execution and independent optimizer-run IDs.
8. Freeze a clean source commit or registered source/runtime archive before any
   confirmatory job starts.

Do not launch the MVP until all eight gates pass.

### P2 — workshop MVP

1. Use 100–300 launched simulations total for diagnostic calibration across
   methods/contexts; this is not the final 1,000-game-per-optimizer-run budget.
2. Run ten independent optimizer repetitions for the primary global and
   conditioned methods. Use five-run screens only for development and secondary
   methods; add SMAC, irace, or NTBEA only after a small integration test.
3. Select hyperparameters on validation families only.
4. Freeze policies and analysis code.
5. Execute the sealed test once, with paired physical starts and prespecified
   context counts.
6. Run clustered analysis and error decomposition without changing the primary
   outcome.

### P3 — archival expansion

Add 16+ map families, 4–8 opponent policies/versions, two standard
configurators, robust-objective tuning, ten primary optimizer runs, and
0.5–0.6 million launched attempts. Add a second environment before making a general-ML
claim.

## Resource estimates

The coherent historical campaign provides an empirical calibration: 192 games
used 3,825 CPU-seconds, or 19.9 seconds/game. Batch peak RSS was 701–871 MB.
Longer tick caps and difficult maps can be several times slower, so every new
map/context receives a 20-attempt timing calibration before scaling.

| Stage | Target completed games | CPU estimate at 20 s/game | Conservative scheduling | Memory | GPU | Result storage |
|---|---:|---:|---|---|---:|---:|
| Audit pilot v1 | 32 | 0.18 CPU-h before rejection overhead | Four 30-minute devel tasks; expected under 10 minutes each | 4 GB requested; <1 GB historically observed | 0 h | <5 MB |
| Workshop MVP | 30k–45k | 167–250 CPU-h | 32–64 CPU tasks; 3–8 ideal wall-hours, budget 12–24 h for slow maps/retries | 2–4 GB/task | 0 h | about 0.1–0.3 GB summaries/manifests; more with traces |
| Strong study | 0.5–0.6M | 2,778–3,333 CPU-h | 64–128 CPU tasks; 1–3 ideal days, reserve 2–4 days | 2–4 GB/task | 0 h | about 1–3 GB without replays |

These are CPU simulations. Requesting GPUs would waste the `pi_jss233`
allocation unless the methodology later introduces a genuinely GPU-dependent
model. Trace only a stratified subset because verbose snapshots dominate
storage and I/O. Never write replays for every optimization game.

The table is a throughput baseline, not the fairness ledger. Reserve 25–50%
until rejection, timeout, and failure overhead is calibrated. Every launched
game creation—including a rejected start, timeout, parser failure, or retry—must
be charged to the method budget; otherwise unreliable methods receive extra
search effort.

For contexts (c), methods (m), optimizer repetitions (r), and maximum launched
attempts per block (n), the budget is

$$
L = \sum_{m,r,c} n_{m,r,c}.
$$

The registry must reconcile `L` with accepted/completed, rejected-start,
failed, timed-out, and censored attempts before analysis.

## Current small pilot

`research/slurm/audit_pilot_v1.sbatch` defines four cells:

| Task | Candidate condition | Candidate physical start | Baseline physical start | Accepted games |
|---:|---|---|---|---:|
| 0 | profiles and exact tactics on | 37,63 | 62,39 | 8 |
| 1 | profiles and exact tactics on | 62,39 | 37,63 | 8 |
| 2 | profiles and exact tactics off | 37,63 | 62,39 | 8 |
| 3 | profiles and exact tactics off | 62,39 | 37,63 | 8 |

All use the simple map, Arabs mirror, candidate slot 0, 18,000-tick cap, clean
external baseline, one CPU, and 4 GB. The Slurm array definition requests
`pi_jss233` and explicitly swaps physical starts rather than assuming slot
reversal is a side swap.

Execution outcome (schema-2 rerun, 2026-08-02):

| Condition | Games | W | D | L | Score |
|---|---:|---:|---:|---:|---:|
| Profiles/tactics on | 16 | 7 | 7 | 2 | 65.625% |
| Profiles/tactics off | 16 | 4 | 5 | 7 | 40.625% |

A fresh array submission requesting `pi_jss233` was rejected by Slurm's
`QOSMaxSubmitJobPerUserLimit`; unrelated user jobs were not cancelled. The
four cells instead ran on the node held by job `20965700`. All 32 requested
games completed with no structured failure, all four schema-2 manifests had
uniform candidate, baseline, API, lockfile, and map runtime/content hashes, and
aggregate game wall time was 684.864 seconds (21.4 seconds/game). There were 78
rejected start-filter attempts before the 32 accepted games.

Authoritative `scontrol` and `sacct` checks show that job `20965700` was charged
to `prio_btk22`, not `pi_jss233`; its schema-2 manifests contain a manually
overridden environment label. The raw records are preserved and corrected by
`research/artifacts/scheduler_accounting_correction.json`. Both the 32-game
pilot and four-process seed screen are affected; no further work will run
outside `pi_jss233`. Future schema-3 manifests query Slurm directly.

The two physical starts show why blocking is mandatory: profiled/generic score
was 87.5%/18.75% at candidate start 37,63, but 43.75%/62.5% at 62,39. All 12
draws were unfinished at the tick cap. The pooled profiled-minus-generic
difference of 25 percentage points is an infrastructure diagnostic only; it is
not an effect estimate because there is one simple map, one opponent/country,
eight calls per cell with unresolved dependence, a large start interaction, and
no independent policy/optimizer replication. Exact outputs are summarized in
`research/artifacts/audit_pilot_v1_summary.json`.

## Fresh-process seed diagnostic

Four fresh processes requested one identical generic match tuple. Their
terminal results were:

| Task | Rejected creations | Winner | Ticks | Finished |
|---:|---:|---|---:|---|
| 0 | 0 | draw | 18,000 | no |
| 1 | 23 | baseline | 8,068 | yes |
| 2 | 0 | baseline | 7,956 | yes |
| 3 | 0 | baseline | 9,092 | yes |

All four normalized terminal signatures differ. The three first-attempt runs
also differ, so rejected-start history is not required for the observed
cross-process variability. Source inspection shows that offline game creation
seeds an internal Mersenne Twister from game ID `"0"` and wall-clock epoch
seconds, but the public API cannot set or report that seed. This is an
infrastructure failure, not four scientific replicates: exact seeds,
independence, same-seed replay, and first trace divergence remain unknown. The
screen also used corrected fallback job `20965700` (`prio_btk22`). See
`research/artifacts/determinism_screen_v1.json`.

## Week-by-week roadmap

### Week 1 — audit closure and pilot

- Complete provenance, baseline isolation, map hash inventory, raw result
  reconstruction, build/tests, and four-cell Slurm pilot.
- Write the evidence ledger and mark invalid historical ablations.
- Gate: zero overwritten artifacts; every pilot game has a manifest and exact
  clean-baseline descriptor.

### Week 2 — dataset and simulator validity

- Manually family-group candidate maps and document sources/rights.
- Select development and candidate-held-out families.
- Expose/log the wall-clock-derived engine seed in a pinned API fork and prove
  same-seed trace identity within and across fresh processes.
- Run parser/fidelity checks and 20-attempt timing calibrations.
- Gate: no exact/revised map crosses splits; warning policy is frozen.

### Week 3 — baselines and configuration interface

- Implement generic, random search, pooled GA, one standard configurator, and a
  profiled development-only upper bound excluded from zero-shot test claims.
  Keep any transductive per-map study separate.
- Normalize configuration domains and launched-attempt budgets.
- Add profile/tactic, baseline-identity, start-pair, and failure-path tests.
- Gate: identical planned game budgets and passing integration tests.

### Week 4 — optimizer pilot and preregistration

- Run small multi-seed searches on training families.
- Estimate variance by optimizer run, map family, and start.
- Freeze primary outcome, sample counts, exclusions, split, and analysis script.
- Require the prespecified validation effect, conditioned-policy score, and
  design-stage power gate before creating or opening a sealed test campaign.
- Do not pursue EXAG because it requires an in-person presentation.

### Week 5 — MVP training

- Run ten independent searches for each primary method; use five only for
  explicitly secondary development screens.
- Monitor throughput, failure rates, and CPU utilization; stop any chain whose
  progress diverges from calibration.
- Select only on validation families.

### Week 6 — sealed evaluation

- Freeze selected policies and source revision.
- Execute the sealed test once in randomized, paired blocks.
- Reconcile planned/completed counts before viewing aggregate method results.

### Week 7 — analysis

- Compute macro, micro, worst-family, and hierarchical intervals; report CVaR
  only when the preregistered minimum family count is met.
- Run prespecified mechanism ablations and validate error labels manually.
- Perform split/tick-cap/duplicate-family sensitivity analyses.

### Week 8 — paper and artifact

- Replace abstract placeholders with confirmatory estimates.
- Produce figures/tables directly from registered manifests.
- Package original code, configs, hashes, metadata, and aggregates; exclude
  proprietary assets.
- Produce the first complete EvoApplications/SCAG draft and conduct an internal
  skeptical review.

### Weeks 9–12 — SCAG completion if MVP passes

- Run only prespecified sensitivity analyses and artifact-reproduction checks;
  do not turn the sealed test into new development data.
- Complete related work, limitations, legal/release documentation, and
  anonymous artifact instructions.
- Reach a paper-ready draft by 2026-10-20 for the 2026-11-01 SCAG deadline.
- If the confirmatory gate or paper quality is inadequate, hold for a verified
  hybrid FDG 2027 call instead of reframing exploratory subgroups as positive.

## Stop rules

Stop scaling and diagnose if any of the following occurs:

- clean and local baselines load different game-API instances;
- required start acceptance exceeds the preregistered retry budget;
- parser warnings correlate with method or outcome;
- task failure exceeds 1% or summaries do not match JSONL events;
- source/lock/map hashes differ within a registered campaign;
- authoritative scheduler account differs from the preregistered allocation;
- launched/completed attempt counts or wall time differ from calibration by more than 2x;
- any test-family aggregate is inspected before policy/analysis freeze.

## Go/no-go recommendation

**No-go for a paper submission today. The infrastructure pilot is complete; go only for the P1 readiness gates.**
Proceed to an MVP only if those gates pass and an effect appears across
families and optimizer runs. If the only advantage remains exact coordinate
knowledge on previously tuned maps, present it as an engineering result or
negative evaluation lesson—not as a general ML advance.
