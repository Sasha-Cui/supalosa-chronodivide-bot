# Forensic project audit

Audit date: 2026-08-02
Project root: `/nfs/roberts/project/pi_jss233/zc362/chrono_divide`
Research branch: `codex/chrono-divide-paper-audit`
Pre-audit candidate HEAD: `d942016ccef021f16f79402756f2487e58cd9c21`

## Evidence standard

This audit separates observed facts, defensible inferences, and hypotheses. No
historical output is treated as confirmatory unless its candidate source,
baseline source, map content, complete configuration, job identity, and random
state can be reconstructed. The preserved directories were inventoried before
changes; no historical result, log, checkpoint, dataset, or dirty snapshot was
rewritten.

## Reconstructed objective

Chrono Divide is the proper name of a browser reconstruction of Command &
Conquer: Red Alert 2. It is not a reference to a chronological dataset split.
The repository is a fork of Supalosa's scripted Chrono Divide bot whose
engineering objective is to create a stronger ladder opponent. The fork adds a
`StrongBot`, `StrongStrategy`, exact-map profiles and coordinate tactics,
missions, naval and superweapon logic, a head-to-head simulator, a regression
suite, and an evolutionary parameter trainer.

The latent research question is therefore not temporal ML. The strongest
question supported by the artifacts is:

> When a scripted RTS agent is tuned on particular maps, starts, and opponents,
> how much in-context strength is purchased at the cost of held-out-context and
> worst-group performance, and can pooled or diversity-aware tuning improve that
> tradeoff under the same launched-simulation budget?

This is a proposed question. Existing artifacts do not answer it.

## Pre-modification directory inventory

| Path | Observed role and state |
|---|---|
| `environment.toml` | Empty/inadequate pointer: no environments and no dependency specification despite a Node workspace. |
| `game-api-playground/` | API experimentation area; no central paper result found. |
| `strong-chronodivide-bot/` | Main candidate fork. Before the audit it was tracked-clean at `d942016`, 15 commits ahead of `origin/master`, with 86 tracked files and approximately 12,644 insertions/247 deletions relative to upstream. |
| `supalosa-chronodivide-bot/` | Clean upstream source baseline at `165b77a71d0cf5ebd27c65b19d0486bcbae78d0f`. |
| `strong-chronodivide-bot-hfo275/` | Dirty upstream-based experiment snapshot: 12 modified tracked files and about 761 inserted lines. Preserved. |
| `strong-chronodivide-bot-hfo284/` | Dirty upstream-based experiment snapshot: 13 modified tracked files and about 775 inserted lines. Preserved. |
| `strong-chronodivide-bot-{caponly,cleanexp,cleanexp-lite,cleanup}-exp-20260611-*/` | Timestamped experiment copies. These are code snapshots, not a registered comparison protocol. |
| Main `benchmark-results/training/` | 517 run directories; all target the HFO map. Every run has settings/evaluation/episode data; 192 have checkpoints; about 116 MB. |
| Driver `packages/chronodivide-bot-driver/benchmark-results/training/` | 592 directories, of which 516 mention HFO and smaller groups use OTMQ, Peak, Malibu, simple, Pinch, and other maps; 589 settings files, 572 evaluation/episode sets, 306 checkpoints; about 169 MB. |
| Main and driver analysis trees | 87 files/about 7.1 MB and 337 files/about 254 MB respectively. The later waves are adaptively chosen. |
| Main `benchmark-results/verification/` | 384,318 immediate directory entries. This was counted once and not recursively rescanned because NFS metadata traversal is expensive. |
| Main `benchmark-results/slurm_jobs/` | 118 preserved Slurm scripts, including many follow-up and restoration variants. |
| Driver `.../campaigns/codex1100-current-broad/` | Eight completed job directories containing the most coherent broad campaign: 192 matches across 12 map filenames and two candidate slots. |
| Map collections | 167 direct `.map` files plus 29 files in `data/realistic-maps`: 196 paths, 176 unique SHA-256 values, 19 exact-duplicate groups containing 39 file occurrences. See `artifacts/map_inventory.json`. |
| `packages/chronodivide-bot-driver/data-full-ra2` | Symlink to scratch-resident full game data. It contains proprietary assets and is not a releaseable dataset by default. |
| Paper artifacts | No notebook, `.tex`, `.bib`, paper draft, or coherent experiment registry was found. |

Machine-readable detail is in `artifacts/project_inventory.json` and
`artifacts/experiment_inventory.jsonl`. The latter indexes all 1,109 training
directories plus 366 file-bearing campaign directories (1,475 rows), embeds
available settings, records per-file path/size/mtime, hashes every settings file,
and hashes all 118 preserved Slurm scripts. Its coverage limits are explicit.

The project does contain README notes and many result summaries, but there was
no paper already latent in the sense of a frozen question, controlled
comparison, recoverable protocol, and claim-aligned analysis.

## Model and algorithm reconstruction

The candidate is a hand-engineered scripted agent, not a learned neural model.
Its state/action logic consists of production policies, attack composition,
strategic plans, mission controllers, emergency defense, map/start detection,
and many exact coordinate-based HFO/OTMQ/Peak/weak-start routines. There is no
tokenizer, pretrained model, embedding model, or model checkpoint in the ML
sense.

The parameter trainer is an evolutionary search over roughly one hundred mixed
discrete and continuous policy options. Modes include `full`, `safe_gate`,
`strong_tactics`, and `broad`. A local linear-congruential generator seeded
by `TRAIN_SEED` controls policy mutation. Fitness strongly rewards wins and
penalizes losses, with material-based draw terms. Populations are initialized
with substantial hand-designed policies, so this is seeded evolutionary
configuration search rather than a vanilla genetic algorithm.

Files or labels containing “RL” do not implement reinforcement learning. No
policy-gradient, value-function, Q-learning, DQN, PPO, or comparable update was
found. Treating those artifacts as RL results would be a category error.

## Evaluation setup

The headless game API creates two-bot offline Red Alert 2 games, normally with
10,000 credits, speed 6, no crates, short-game mode, MCV repacks, and optional
superweapons. A candidate `StrongBot` plays a Supalosa bot; maps, countries,
candidate slots, start filters, repeat counts, and tick caps come from
environment variables. A game ending with the candidate alive and the
opponent defeated is a win; the inverse is a loss; simultaneous survival at
the tick cap is stored as a draw.

There is no temporal or chronological data split. “Before” and “after” labels
refer only to engineering iterations. The game, tokenizer, data source, and
model-over-time checks requested for temporal ML are therefore not applicable
to the actual study. Version drift across code, API, maps, and evaluation
scripts is nevertheless a major reproducibility confound.

## Existing results and job outcomes

### Broad campaign

The eight `codex1100-current-broad` jobs
`16021104, 16021105, 16021436, 16021490, 16021740, 16021922, 16022155,
16022521` all completed. Slurm accounting reports 3,825 seconds of aggregate
CPU time for 192 games (19.9 seconds/game), one CPU per job, requested 8 GB, and
batch-step peak RSS between 701 and 871 MB. The campaign used no GPU.

Recomputation from the eight preserved JSON summaries gives:

| Games | Candidate W | Baseline W | Draw | Raw win rate | W+0.5D score |
|---:|---:|---:|---:|---:|---:|
| 192 | 182 | 7 | 3 | 94.79% | 95.57% |

All three draws are unfinished time-cap games. Stored and recomputed counts
agree. A naive game-level Wilson interval for the win indicator is
[90.68%, 97.15%]; a retrospective map-filename cluster bootstrap gives
[90.89%, 99.22%] for score. Neither is a valid confirmatory interval because
the campaign lacks independent optimizer runs, map-family grouping, clean
baseline provenance, a recoverable candidate revision, and engine-state/determinism evidence.
Exact source hashes and the full per-map reconstruction are in
`artifacts/codex1100_reconstruction.json`.

The summaries were generated from 2026-06-24 04:26–04:55 UTC. The first custom
commit visible in the current history was not made until 2026-06-24 18:11 EDT.
The games may have used an uncommitted working tree, but its exact content
cannot be recovered. This timing does not show the code was absent; it shows
that the evaluated revision is unknowable.

### Training and hard-map campaigns

All 517 top-level training directories use HFO. Four associated training jobs
(`14660611, 14666135, 14678132, 14681118`) were cancelled by the user, so the
checkpoint population is censored and uneven. Some selected policies report
very high within-campaign outcomes (for example a later 952/40/32 aggregate),
but policies were selected after many adaptive waves and reused training
matchups. These are optimizer traces, not held-out estimates.

The hard-map tree contains 327 JSON summaries/654 matches, but campaign labels
were reused by later arrays and resubmissions. Illustrative aggregates such as
Malibu 24/4/94, Pinch-upper 46/64/20, and Watering Hole 90/56/0 combine
different code/configuration waves. They cannot be treated as one experiment.

At audit time, `squeue` showed only persistent allocation job
`codex_compute` (`20965700`) and no queued Chrono Divide experiment chain.

### Audit-branch infrastructure pilot

A fresh four-cell Slurm array submission requesting `pi_jss233` was rejected
by `QOSMaxSubmitJobPerUserLimit`, so no unrelated user job was cancelled. The
schema-2 fallback instead used the node held by existing allocation job
`20965700`. It completed 32/32 requested games without a structured failure.
Candidate, clean-baseline, shared game-API, lockfile, and map hashes were
uniform across all four manifests.

A final accounting check found that job `20965700` belongs to account and QOS
`prio_btk22`, not `pi_jss233`. The fallback command had manually labeled
`SLURM_JOB_ACCOUNT=pi_jss233`, and schema-2 manifests trusted that mutable
environment field. Raw manifests remain untouched;
`artifacts/scheduler_accounting_correction.json` records the authoritative
`scontrol`/`sacct` correction. Therefore these audit diagnostics ran outside
the requested project allocation and remain infrastructure-only. Future
schema-3 manifests query Slurm directly and retain environment labels
separately.

The profiled condition recorded 7 wins, 7 draws, and 2 losses (65.625% score);
the generic condition recorded 4 wins, 5 draws, and 7 losses (40.625%). The
direction reversed across the two physical candidate starts, and all 12 draws
were unfinished at the 18,000-tick cap. The run therefore validates provenance,
baseline isolation, ablation plumbing, and physical-start blocking—but offers
no paper evidence. It has only one simple map/opponent/country, eight calls per
cell with unresolved dependence, 78 rejected starts, and no optimizer
replication. See `artifacts/audit_pilot_v1_summary.json`.

The corresponding 603-entry source/runtime archive is preserved in scratch as
`snapshots/audit-pilot-v1-schema2-source-runtime.tar.gz` with SHA-256
`494c5d38e32f0f73edf6ebd368c2ee8650b8b8d52e8763938340779c61834149`;
it excludes proprietary map bytes. See `artifacts/audit_pilot_v1_snapshot.json`.

### Fresh-process terminal-state screen

Four concurrent fresh Node processes requested the same generic-candidate
configuration: the simple map, Arabs mirror, candidate slot 0, candidate start
37,63, baseline start 62,39, and an 18,000-tick cap. They produced four
different normalized terminal signatures: one unfinished draw and three
baseline wins at 8,068, 7,956, and 9,092 ticks. Three processes accepted the
requested starts on their first game creation and still produced three
different terminal signatures; the fourth required 23 rejected creations.
Thus cross-process terminal variability is established independently of the
rejection-heavy run, while statistical independence is not.

Inspection of the exact hashed game-API runtime found a Mersenne-Twister PRNG.
Its factory derives a seed from game ID and start timestamp, and the offline
creation path supplies game ID `"0"` and `floor(Date.now()/1000)`. The public
`CreateOfflineOpts` type neither accepts nor returns a seed. Wall-clock-second
seeding is therefore the likely mechanism, but the exact seeds used by these
runs were not logged and same-seed replay has not been tested. The diagnostic
used 4 accepted plus 23 rejected game creations and is preserved in
`artifacts/determinism_screen_v1.json`; its 607-entry source/runtime archive has
SHA-256 `4d5c626afed805a9cf6c7aedd7ae187845be14cfb7b9cc01f20f9d56db4c501d`.

## Reproducibility audit

| Finding | Severity | Evidence and consequence |
|---|---|---|
| Historical source revision missing | Critical | Central summaries predate all custom commits in the recoverable history and have no Git manifest. Exact rerun is impossible. |
| Baseline contamination | Critical | Candidate and “stock” opponent were imported from the same modified local package. Shared changes to the base bot, strategy, action batching, and utilities affect the control. |
| Simulator seed uncontrolled | Critical | Pinned game API 0.75.0 exposes no public seed. Source inspection shows internal wall-clock-second seeding, and identical requested configurations produced four different terminal signatures across fresh processes. Exact seed identity, same-seed reproducibility, and independence remain unknown; confirmatory paired blocks are impossible until a pinned API fork exposes and logs the seed. |
| Configuration incomplete | High | Old settings omit API/package/map hashes, source dirtiness, rejection attempts, and sometimes search mode. Schema-2 audit manifests also trusted mutable Slurm environment labels; the fallback account was misreported until checked with `scontrol`/`sacct`. |
| Environment incomplete | High | Root `environment.toml` did not specify Node/npm/lockfile state. A clean install emits a Vite engine warning and reports 9 dependency vulnerabilities. |
| Failure handling weak | High | Optional regression scenarios can silently pass execution failures; map smoke checks only reach tick 1. |
| Non-independent selection | Critical | Repeated analyzer/verification waves choose later configurations from prior results. Training, model selection, and reported evaluation are not sealed. |
| Cancelled-run censoring | High | Partial populations/checkpoints from cancelled jobs are retained and later analyses do not consistently distinguish planned from completed evaluations. |
| Output overwrite/mixing risk | High | Historical campaign labels and Slurm output directories were reused across variants and task ranges. |

New research-branch manifests now record candidate and baseline Git state and
tracked diff, exact compiled candidate/baseline/API tree hashes, lockfile and
map hashes, exact environment variables, Slurm IDs, effective configuration,
wall time, start-filter rejections, and structured failures.
They refuse to overwrite an existing run ID. This prepares future provenance;
hashes identify but do not preserve bytes, so every scientific campaign must
also use a committed clean snapshot or an archived source/runtime bundle. It
does not retroactively rehabilitate old evidence.

## Leakage, contamination, and methodology audit

| Risk | Assessment |
|---|---|
| Temporal leakage | Not applicable to the actual non-temporal question. There is no time-indexed train/test split. |
| Test-set tuning | Present. Hard maps and HFO were repeatedly inspected, patched, resubmitted, and reverified. Any such map/start/opponent must be labeled development data, not a final test set. |
| Map contamination | Present. There are 19 exact duplicate groups, plus renamed/revised HFO and other variants that hashes alone do not family-group. A filename-level random split would leak. |
| Exact-map leakage | Critical. Automatic profiles and many tick-time tactics infer map/start from exact start-coordinate sets and use hard-coded positions. These mechanisms were enabled during broad evaluation. |
| Misleading ablation | Present in the pre-audit harness. `DEFAULT_MAP_PROFILES_ENABLED=false` disabled one StrongBot profile layer but left StrongStrategy profile selection and coordinate tactics active. The research branch separates automatic profiles from `EXACT_MAP_TACTICS_ENABLED`. |
| Start/side confounding | Present. Fixed candidate-start filters combined with `CANDIDATE_SLOTS=0,1` do not themselves form a physical-start swap. Historical rejected games were not logged; each rejection consumes budget and changes wall-clock initialization timing before the accepted game. |
| Opponent/control adequacy | Inadequate historically. The nominal control was locally contaminated and essentially one scripted family. The new pilot can load clean upstream, but there is still no pooled, robust, random-search, or standard configurator comparison under equal launched budget. |
| Outcome definition | Inadequate for claims. Historical `candidateWinRate` assigns draws zero; draw-adjusted score was absent. Duration/material are inconsistently used and can reward stalling at a cap. |
| Uncertainty | Absent. Games, start pairs, maps, and optimizer runs are clustered, but historical summaries report no clustered interval or repeated-search uncertainty. |
| Task difficulty | Confounded. Map, start, country, opponent, and code changes move together in many campaigns, so “improvement” cannot be attributed to a mechanism. |
| Map fidelity | Unverified. Full-data maps emit invalid terrain/object/rules/event/waypoint warnings. Successful tick-1 construction is not validation of gameplay equivalence. |
| Legal contamination | Unresolved. Maps were downloaded from Chrono Divide/CnCNet-related sources and RA2 MIX content is proprietary. Neither package declares a software license. |

## Original work versus reproduction

The fork's original engineering contribution appears to be its collection of
StrongBot/StrongStrategy behaviors, missions, map profiles, coordinate tactics,
naval/superweapon support, trainer integration, and large empirical campaign.
The audit harness, provenance layer, clean-baseline loader, and profile/tactic
separation are new research infrastructure on the isolated branch.

Evolutionary configuration of scripted RTS bots, head-to-head simulator
evaluation, map-specific heuristics, and genetic search are established
methods. The current evolutionary trainer is not itself a publishable novel
algorithm. A contribution must instead come from a controlled empirical
finding about specialization/generalization, a releaseable benchmark and
methodology, or a genuinely new robust optimizer validated against standard
configurators.

## Candid present-state judgment

There is no defensible paper claim yet. The 182/7/3 broad result is real as a
property of eight stored JSON files, but not interpretable as a clean causal or
generalization result. The completed infrastructure pilot justifies the P1
readiness work: the project has a working simulator, substantial bot engineering,
many maps, cheap CPU games, and an interesting failure mode—configuration
specialization. An MVP is justified only if explicit seed control and trace
validation, fidelity, split, baseline, and snapshot gates pass.
