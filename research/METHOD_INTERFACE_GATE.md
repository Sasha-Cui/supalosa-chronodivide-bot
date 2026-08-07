# Confirmatory method-interface gate

Status: **PASSED for private training and development execution; the separate
sealed-test command remains intentionally unimplemented.** The historical
parameter trainer remains inadmissible. The replacement plan generator, shared
episode primitive, role-sealed runner, and strict stage reducer are committed on
`main` and covered by mock-only failure tests.

## Scope

The proposed positive, falsifiable primary comparison is a coordinate-free,
map-structure-conditioned StrongBot policy versus one global StrongBot policy,
with equal launched-simulation tuning budgets and evaluation on held-out map
families against the pinned Supalosa baseline. Before any diagnostic outcomes
can be interpreted, the optimizer and evaluator must make that comparison true
by construction.

## Findings in the existing trainer

`packages/chronodivide-bot-driver/src/training/parameterTrainer.ts` cannot be
used unchanged for that comparison:

1. `runEpisode` calls `cdapi.createGame` directly. It does not use the validated
   seeded-session wrapper in `benchmark/seededOfflineGame.ts`, so it does not
   supply or record a controlled engine seed or participant random streams.
2. `buildStrongStrategyOptions` omits `defaultMapProfiles: false` and
   `buildStrongBotOptions` omits both `defaultMapProfiles: false` and
   `exactMapTactics: false`. The StrongStrategy and StrongBot constructors
   default these switches to `true`; therefore the historical trainer permits
   built-in exact-map behavior.
3. `TRAIN_SEARCH_MODE=broad` disables route, HFO closeout, HFO west-sweep, and
   orientation-specific gates, but it does not disable the two default-map
   switches. Broad mode alone is not a coordinate-free policy interface.
4. Optional start filters repeatedly launch games until a requested start is
   obtained, with up to `TRAIN_START_FILTER_MAX_ATTEMPTS` attempts. Those
   discarded launches are not retained as evaluation observations. This is
   incompatible with equal launched budgets and can condition results on a
   rejection process.
5. The trainer selects elites on the same maps and repeated episodes used to
   score candidates. It has no family-role manifest or sealed evaluation
   boundary and therefore cannot be pointed at validation or test maps safely.
6. The output records optimizer settings and episodes but not the complete Git,
   dependency, map-byte, baseline, runtime, and scheduler commitments required
   to connect a paper result to an exact execution.

The separate `benchmark/headToHead.ts` runner already contains useful pieces:
explicit paired seed blocks, reciprocal candidate slots, provenance output,
and environment switches for disabling both default-map mechanisms. It is a
starting point for evaluation, not yet a complete optimizer or role-sealed
paper runner.

## Required interface before outcome-bearing work

The replacement runner must fail closed unless all of the following are true:

- a committed family-role manifest supplies maps; command-line paths or map
  names cannot override the role boundary;
- the global and conditioned methods expose the same coordinate-free policy
  parameter schema, with `defaultMapProfiles=false`,
  `exactMapTactics=false`, and no absolute waypoint lists, map-name branches,
  orientation gates, or exact-map signatures;
- the conditioned method receives only committed, outcome-free structural
  descriptors available for every family before tuning;
- one prespecified seed-block schedule is shared across compared policies and
  reciprocal physical slots, and every requested and derived seed is logged;
- every launched simulation counts against the method budget, including
  initialization errors, timeouts, and invalid starts; there is no
  outcome-dependent or policy-dependent resampling;
- global and conditioned searches have exactly equal total launched budgets,
  with optimizer restarts and model-selection rules fixed in advance;
- development, validation, and sealed-test invocations are different commands
  or modes, and test mode cannot emit per-family outcomes before the single
  authorized aggregate unblinding step;
- every shard binds exact source, map, Supalosa, game API, runtime, environment,
  configuration, scheduler job, and output hashes and is retained under the
  durable project evidence root;
- resume logic is idempotent, attempt limits are prespecified, and technical
  retries cannot branch on policy outcomes;
- mock-only tests demonstrate that forbidden map information, role overrides,
  seed drift, budget asymmetry, partial shards, and post-hoc retries all fail
  before engine launch.

## Acceptance sequence

1. Finish and pass the exact-byte map compatibility gate.
2. Freeze the admissible coordinate-free parameter schema and structural map
   descriptor schema.
3. Implement one shared seeded episode primitive used by both optimization and
   evaluation.
4. Prove launched-budget accounting and role isolation with mock-only tests.
5. Run a small development-only calibration; do not inspect held-out test
   outcomes.
6. Run the prespecified at-most-1,000-launch diagnostic and continue only under
   its already documented technical and positive-signal rules.

Historical trainer outputs may motivate search ranges but cannot support the
proposed generalization claim; passing the replacement interface gate does not
rehabilitate those old outcomes.

## Replacement implementation

The accepted training/development path is now:

- `training/researchPolicy.ts` for the exact coordinate-free schema;
- `training/researchEpisode.ts` for one seeded, no-retry game;
- `training/researchPlanRunner.ts` for role, budget, runtime, baseline, map, and
  allocation enforcement;
- `training/researchPlanGenerator.ts` for prospective private campaign plans;
- `training/researchStageReducer.ts` for complete-shard reconciliation and
  fixed successive-halving selection; and
- `research/slurm/research_plan_shard_v1.sbatch` for pinned `pi_jss233`
  execution.

Job `21655228` completed the two-launch end-to-end smoke with exact accounting
and no technical failure. Its 0--2 gameplay result is training calibration only,
not evidence for the proposed method comparison or a paper claim. See
[`OPTIMIZER_PROTOCOL.md`](OPTIMIZER_PROTOCOL.md) for the prospectively frozen
search and selection rules.
