# Strong Chrono Divide Bot

This repository is a fork of [Supalosa's Chrono Divide bot](https://github.com/Supalosa/supalosa-chronodivide-bot). The upstream bot is intended to be a stable opponent for Chrono Divide players. This fork is an experimental stronger-bot branch: the goal is to push the bot toward competitive ladder strength while keeping the code buildable, benchmarkable, and understandable.

[Chrono Divide](https://chronodivide.com/) is a browser rebuild of Red Alert 2. It exposes a bot API, which this project uses to run offline matches, generate replays, benchmark strategies, and test stronger AI behavior.

The original upstream documentation is still useful for basic setup and online play. This README describes the current fork state: what has been implemented, what is validated, and what still needs work before this should be treated as a polished upstream replacement.

## Start Here

| Goal | Entry point |
| --- | --- |
| Understand the bot and run local matches | This README, then `packages/chronodivide-bot` |
| Run benchmarks, training, or driver tests | `packages/chronodivide-bot-driver` |
| See the current paper-readiness status | [`research/STATUS.md`](research/STATUS.md) |
| Navigate the audit, protocols, and paper plan | [`research/README.md`](research/README.md) |
| Trace a result to its configuration and Slurm job | [`research/RESULT_REGISTRY.tsv`](research/RESULT_REGISTRY.tsv) |
| Understand old generated outputs | [`benchmark-results/README.md`](benchmark-results/README.md) |

The engineering benchmark archive and the scientific result ledger serve
different purposes. Historical folders under `benchmark-results/` are retained
for provenance, but they are not automatically admissible paper evidence.

## Current Status

This branch has moved beyond the stock Supalosa baseline in several controlled head-to-head scenarios, especially on tuned map starts. It is not yet a complete ladder-ready AI. Some maps still draw, some water/naval games do not close, and several map profiles are tuned for specific starts rather than broadly generalized.

Those are engineering observations, not yet a confirmatory paper result. The
research pipeline has passed its deterministic replay gate and completed two
reproducible, outcome-free compatibility screens of the 67-family Temperate
source population. It has **not** yet produced an admissible
StrongBot-versus-Supalosa policy estimate. See
[`research/STATUS.md`](research/STATUS.md) before
using any result in a claim.

Recent validation highlights:

- Simple 1v1, Iraq/Arabs mirror: trained infantry profile wins from both starts in focused runs.
- Simple 1v1, Iraq/Arabs vs France/French baseline: trained profile also wins in focused runs.
- Peak of Perfection and Tikal: current map profiles can produce clean candidate wins in fixed-start checks.
- Heck Freezes Over and Pinch Point: current bot often builds large material leads, but some samples still hit the tick cap without a formal elimination.
- Water maps: detection, naval construction, and naval policy support exist, but the bot still struggles to convert water-map advantages into wins.

Use the benchmark harness before trusting any claim about a new profile. The bot is stochastic, start-dependent, and map-dependent.

## What Has Been Done

### Stronger strategy layer

- Added `StrongBot` and `StrongStrategy` behavior on top of the upstream bot.
- Added map-specific profiles for selected ladder/custom maps and starts.
- Added a trained Iraq/Arabs simple-map profile for the two-start `simple-1v1-no-preview.map` signature.
- Added tactical helpers for weak starts, defensive holds, direct pressure, closeout attempts, and map-specific sweep behavior.

### Performance and order quality

- Debounced repeated `BatchableActions` in the action batcher so identical orders are not resent unnecessarily across ticks.
- Added leader-follow squad movement, where a squad chooses a leader and other units follow that unit. This improves group cohesion and reduces some pathing churn.

### Naval and map awareness

- Added naval-map detection through match awareness.
- Added naval building placement support for naval yards.
- Added naval assault mission support and naval composition policy support in strategy code.
- Added benchmark/training harness support for `ATTACK_COMPOSITION_POLICY=naval`.

Current caveat: naval support is present, but water-map play is still not strong enough. The bot can detect water maps and build naval infrastructure, but amphibious/transport play and water-map closeouts still need work.

### Strategy features

- Added superweapon mission support.
- Added `ai.ini` attack-composition ingestion so the bot can reuse configured attack team shapes.
- Added broader strategic-plan options for benchmark and training experiments.

### Tooling

- Added head-to-head benchmark tooling for candidate-vs-baseline comparisons.
- Added parameter-training tooling for search over strategy, tactical, and gate options.
- Added training-result analysis support.
- Added focused environment switches for map selection, countries, starts, strategy plans, composition policies, and default profile gating.

## What Still Needs Work

### High priority

- Convert material leads into wins on pressure maps. HFO, Pinch Point, and River-style games can leave the candidate far ahead but not eliminate the last buildings before the cap.
- Improve naval and amphibious play. Water maps need reliable transport loading/unloading, naval attack target selection, and cross-water closeout logic.
- Broaden validation across real ladder maps and random starts. Several profiles are start-signature-specific and need larger samples before they should be trusted.
- Reduce regressions from profile collisions. For example, maps with the same start coordinates can accidentally look similar to the simple-map profile unless water/map checks are handled carefully.
- Build better acceptance criteria for "strong against humans", not only "beats the stock bot".

### Medium priority

- Expand country coverage beyond the best Iraq/Arabs profiles.
- Make air, artillery, heavy, ai.ini, and naval compositions more situationally reliable.
- Improve scouting and target selection for hidden last structures.
- Add replay/video/demo generation as a reproducible checked-in workflow rather than local ad hoc scripts.
- Keep `TODO.md` aligned with the implemented state; some old roadmap items have now been partially or fully implemented.

### Lower priority

- Polish online-play documentation for this fork specifically.
- Add more unit tests around map awareness, action debouncing, naval placement, and strategy option parsing.
- Separate experimental profiles from upstream-safe defaults behind clearer configuration gates.

## Repository Structure

- `packages/chronodivide-bot`: Main bot package. This contains the runtime bot logic, strategies, missions, map awareness, building rules, and exported bot classes.
- `packages/chronodivide-bot-driver`: Driver package for offline matches, replay generation, benchmarks, parameter training, analysis, and tests.
- `research`: Paper audit, current status, experimental protocols, manifests,
  reproducibility tooling, and the canonical result registry.
- `benchmark-results`: Preserved local engineering outputs. Start with its
  README; do not treat the directory as the scientific result ledger.
- `TODO.md`: Historical roadmap. It is useful context, but the current status section above is more up to date for this fork.

## Setup

Node 20+ is required by the Chrono Divide API. Publishing workflows may use newer Node versions, but local development and benchmark work should be fine on a current LTS or newer runtime.

From the repository root:

```sh
npm install
npm run build
```

Run the driver tests:

```sh
npm --workspace packages/chronodivide-bot-driver run test -- --run
```

Watch TypeScript rebuilds during development:

```sh
npm run watch
```

## Offline Replays

The driver can create an offline replay that can be imported into the live Chrono Divide client.

You need a Red Alert 2 / Chrono Divide data directory. Point `MIX_DIR` at that directory. The minimal driver data is enough for some simple tests; full RA2 data is needed for many real maps and snow/theater assets.

From `packages/chronodivide-bot-driver`:

```sh
MIX_DIR=/path/to/ra2-data npm start
```

Edit `packages/chronodivide-bot-driver/src/index.ts` to change the map, countries, or agent setup for manual replay generation.

## Benchmarks

Build first:

```sh
npm run build
```

Run a simple candidate-vs-local-baseline benchmark. This is an engineering
smoke test: both bots come from the modified local package, so it is not an
independent scientific control.

```sh
OUT_DIR=benchmark-results/simple-smoke MAPS=simple-1v1-no-preview.map CANDIDATE_COUNTRIES=Arabs BASELINE_COUNTRIES=Arabs,French MATCHES_PER_PAIR=2 CANDIDATE_SLOTS=0,1 MAX_TICKS=18000 npm --workspace packages/chronodivide-bot-driver run benchmark
```

Run on full-data maps:

```sh
MIX_DIR=/path/to/full-ra2-data OUT_DIR=benchmark-results/map-smoke MAPS=cd_2_peak_of_perfection.map,cd_2_tikal.map CANDIDATE_COUNTRIES=Arabs BASELINE_COUNTRIES=Arabs MATCHES_PER_PAIR=1 MAX_TICKS=36000 npm --workspace packages/chronodivide-bot-driver run benchmark
```

Useful benchmark environment variables:

- `MAPS`: comma-separated map names.
- `CANDIDATE_COUNTRIES`, `BASELINE_COUNTRIES`: country names such as `Arabs`, `French`, or `Russians`.
- `CANDIDATE_STARTS`, `BASELINE_STARTS`: semicolon-separated fixed starts like `37,63;62,39`.
- `MATCHES_PER_PAIR`: repeats per map/country pairing.
- `CANDIDATE_SLOTS`: `0`, `1`, or `0,1`.
- `MAX_TICKS`: match cap.
- `GAME_SEED_BASE`: uint32 base seed. Block `i` uses `(GAME_SEED_BASE + i) mod 2^32`.
- `SEED_BLOCK_START_OFFSET`: non-negative seed-block cursor; reciprocal slots reuse one block seed.
- `ATTACK_COMPOSITION_POLICY`: `random`, `infantry`, `assault`, `tanks`, `air`, `heavy`, `artillery`, `desolator`, `naval`, `aiIni`, or `hfo` where supported.
- `STRATEGIC_PLAN`: `off`, `hfo`, `ecoBoom`, `islandTech`, `adaptive`, and other plan names accepted by the harness.
- `DEFAULT_MAP_PROFILES_ENABLED=false`: disable automatic map-profile selection in both `StrongBot` and `StrongStrategy`.
- `EXACT_MAP_TACTICS_ENABLED=false`: disable hard-coded HFO, OTMQ, Peak, and weak-start tick tactics. Use both switches for the generic research condition.
- `BASELINE_PACKAGE_ROOT=/absolute/clean/repo/packages/chronodivide-bot`: load baseline source from a separate built package.
- `REQUIRE_EXTERNAL_BASELINE=true`: fail instead of silently using the shared modified package.
- `RUN_ID`: append-only identifier containing only letters, digits, dot, underscore, and hyphen.
- `DEFAULT_MAP_PROFILES_ENABLED=false` alone is not a generic-policy ablation.
- `TRACE_INTERVAL_TICKS`: emit periodic trace snapshots for debugging long draws.

New benchmark outputs include a provenance manifest, append-only JSONL event
stream, structured failure record, and JSON summary. Although the public game
API exposes no offline seed, the harness validates the exact pinned 0.75.0
implementation before mapping each requested engine seed to
`Date.now() = seed * 1000` during game creation. External bot randomness in this
API version uses `Math.random`, so synchronous candidate and baseline callbacks
run under separate identity-keyed Mulberry32 streams. Candidate draw counts do
not advance the baseline stream, and reciprocal agent-array slot swaps preserve
participant streams. Matches and traces record `requestedEngineSeed`, the root
`botRandomSeed`, `candidateBotRandomSeed`, `baselineBotRandomSeed`, and
`engineSeedEpochMs`; global shims and callback wrappers are restored in
`finally`, and concurrent seeded sessions fail closed. Reciprocal `0,1` slot
runs reuse one explicit seed block and reject outcome-dependent start filtering.
Same-process same-seed/different-seed trace tests pass. The prespecified 10/10
fresh-process trace gate also passed under Slurm job 21291720; this validates
the deterministic endpoint, not policy strength. Schema-3 manifests query
`scontrol` for authoritative Slurm
accounting instead of trusting mutable environment labels. See `research/` for
the clean-baseline preparation and Slurm protocol. Large generated result
folders and copied map data should not be committed.

Run the smoke regression suite after behavior changes:

```sh
OUT_DIR=benchmark-results/regression-smoke npm --workspace packages/chronodivide-bot-driver run benchmark:suite
```

Use `REGRESSION_SCENARIOS=simple-arabs-core` to run a subset. The suite writes `regression-summary.json` and fails when a required scenario drops below its threshold.

## Parameter Training

The parameter trainer searches over strategy and tactical settings. Keep early experiments small, then validate promising policies with direct benchmarks.

Example small run:

```sh
OUT_DIR=benchmark-results/training/simple-search TRAIN_MAPS=simple-1v1-no-preview.map TRAIN_CANDIDATE_COUNTRIES=Arabs BASELINE_COUNTRIES=Arabs,French TRAIN_POPULATION=8 TRAIN_ELITES=2 TRAIN_GENERATIONS=3 TRAIN_REPEATS=1 TRAIN_MAX_TICKS=18000 npm --workspace packages/chronodivide-bot-driver run train:params
```

Analyze training output:

```sh
npm --workspace packages/chronodivide-bot-driver run analyze:training
```

Training is useful for finding candidate parameter sets, but it is not proof by itself. Always rerun direct head-to-head benchmarks with larger samples before promoting a profile.

## Development Workflow

Recommended loop:

1. Make a small strategy or mission change.
2. Run `npm run build`.
3. Run driver tests.
4. Run one or two focused head-to-head benchmarks.
5. If the result looks good, expand to more starts, countries, and maps.
6. Commit only source changes and intentionally selected docs/config changes. Do not commit generated benchmark folders, copied RA2 data, or large map dumps.

## Debugging

Run the driver with Node inspector enabled:

```sh
NODE_OPTIONS="--inspect" MIX_DIR=/path/to/ra2-data npm --workspace packages/chronodivide-bot-driver start
```

The Chrono Divide API can log generated actions:

```sh
DEBUG_LOGGING=action MIX_DIR=/path/to/ra2-data npm --workspace packages/chronodivide-bot-driver start
```

Debug text can be embedded into replays when the bot is configured with `.setDebugMode(true)`. In the Chrono Divide game client DevTools console, enable display with:

```js
r.debug_text = true;
```

The driver also contains visualisation helpers for dumping state snapshots during headless runs.

## Online Play

The upstream project documents online bot setup using the driver `.env` file and `ONLINE_MATCH=1`. That still applies, but this fork has mainly been developed and validated through offline head-to-head benchmarks. Treat online play as a developer workflow until the stronger profiles have broader validation.

## Publishing

This fork is not currently presented as an npm release branch. The upstream repository uses GitHub Actions and npm trusted publishing. If this work is proposed upstream, publishing/versioning should follow the upstream maintainer's process rather than this fork unilaterally publishing a package.

## Credits

- [Supalosa](https://github.com/Supalosa): original Chrono Divide bot and upstream repository.
- [use-strict](https://github.com/use-strict): Chrono Divide.
- Libi: base structure placement performance improvements in the upstream project.
- Dogemoon: Chinese documentation in the upstream project.
