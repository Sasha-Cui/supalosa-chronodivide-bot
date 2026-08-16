# Finish-advantage empirical compute plan, version 1

Status: **prospective plan based on completed open runtime evidence**

Recorded: 2026-08-15 UTC, before V5 confirmatory unblinding

## Measured simulator cost

The complete 540-game V5 open-development population consumed 18.65 summed
episode wall-hours. Per 180-game arm:

| Arm | Median/game | 90th percentile/game | Summed episode hours | Median ticks |
|---|---:|---:|---:|---:|
| Exact external Supalosa | 108.33 s | 209.30 s | 5.76 h | 23,282.5 |
| Frozen V4 | 120.76 s | 244.70 s | 6.57 h | 23,496 |
| Frozen V5 | 115.65 s | 238.87 s | 6.32 h | 22,747 |

The empirical mean is 124.3 episode-seconds per game. A 40-task array therefore
has an idealized throughput near 1,158 games/hour before queueing, task-tail,
startup, and filesystem overhead. Use a conservative planning range of
600--900 games/hour at 40 concurrent CPU tasks.

The 540-game open campaign occupies about 22 MiB. Plan approximately 40--60 KiB
of preserved JSON/log evidence per game, excluding optional replays or images.
No GPU is needed for deterministic simulation.

## Prioritized stages

### 1. Observer-only state and equivalence audit

- Population: ten permanently open families, nine countries, reciprocal slots.
- Runs: 180 unobserved exact-Supalosa controls plus 180 same-seed observed runs.
- Total: 360 games, about 12.4 summed episode-hours.
- Expected 40-task wall time: 20--40 minutes; reserve 90 minutes.
- Storage: about 20 MiB with transition-compressed state traces.
- Advancement: exact action/state/endpoint equivalence and successful
  outcome-blind exposure selection for at most two frozen margins.

### 2. Composite technical gate

- Population: nine countries and reciprocal slots on the committed diagnostic
  map, with direct control, disabled composite, enabled first run, and repeat.
- Total: 72 short games capped at 5,400 ticks.
- Expected cost: below 3 summed episode-hours; reserve one wall-hour.
- Advancement: deterministic traces, disabled equivalence, V5 final-building
  identity, irreversible-certificate exposure, cover separation, and matched
  order witnesses in every required cell.

### 3. Complete open causal screen

- Population: ten permanently open families, nine countries, reciprocal slots.
- Arms: exact Supalosa, frozen V5, V5 plus irreversible conversion, and up to two
  outcome-blindly selected surplus-cover arms.
- Total: 720 games for four arms or 900 for five arms.
- Estimated summed episode time: 25--31 hours.
- Expected 40-task wall time: 45--90 minutes; reserve three hours.
- Storage: 35--55 MiB.
- No selective reruns; one fail-closed aggregate after all shards pass.

### 4. New-family compatibility and fidelity gate

- Candidate population: the separately committed 63-family private population.
- This is not yet a result population. Run parser/load/early-progress and source
  fidelity gates without policy outcomes.
- Expected cost depends on probe horizon; keep each probe short and submit only
  after the current V5 chain frees the checkout.
- Any technical exclusion follows a frozen rule and remains documented; no map
  is removed based on competitive behavior.

### 5. Sealed confirmation

Let `K` be the number of newly certified families after technical and historical
use audits. With three frozen arms, the design has `54K` games; with four arms,
`72K` games. At the current maximum `K=63`:

- three arms: 3,402 games, about 117.4 summed episode-hours;
- four arms: 4,536 games, about 156.6 summed episode-hours;
- expected 40-task wall time: 3--5 hours ideal, reserve 6--10 hours; and
- expected storage: 170--280 MiB.

Freeze the final family count, arm count, power calculation, seed base,
technical gate, and single authorized unblinder before launch. Confirmation
must use only Slurm account `pi_jss233`.

## Resource limits and launch discipline

- CPU simulation only; request 1 CPU and 2--4 GiB RAM per shard unless a smoke
  run demonstrates otherwise.
- Keep 30--40 concurrent shards as the initial ceiling; increase only from
  observed queue and memory evidence.
- Each shard should contain a balanced small bundle of arms for one fixed
  family-country-slot cell so failures do not create arm imbalance.
- Preserve source and baseline runtime hashes, exact Slurm job and array IDs,
  launch counts, summaries, stderr, and scheduler accounting.
- Do not modify the tracked checkout while a hash-enforcing array is active.
- Never rerun only a favorable or unfavorable game. A technical repair creates
  a new prospective campaign population and disposition record.

## Earliest credible schedule after V5 completion

If implementation and technical tests require one focused day, the observer,
compatibility, and open screen can plausibly finish on the following day. A
passing candidate can then complete new-family compatibility and sealed
confirmation in another one to two days of wall time. Analysis, annotated
replays/screenshots, and paper drafting begin only after a reliable positive
result survives the full uncertainty and non-regression gates.

These are capacity estimates, not a promised result date. Policy iteration may
require additional prospectively declared open screens if the first mechanism
does not reliably beat Supalosa.
