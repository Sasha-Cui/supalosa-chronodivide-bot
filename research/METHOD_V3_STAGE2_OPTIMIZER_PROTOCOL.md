# Method-v3 Stage-2 draw-to-win optimizer protocol

Status: **frozen on 2026-08-12 before any method-v3 Stage-2 plan generation or
gameplay**.

## Freeze record

The complete Stage-1 evidence chain passed before this protocol was frozen:

- Stage-1 source commit:
  `b3fd2b07907e97ec2e43ac1ad48c10f4f00991f0`;
- Stage-1 array job: `21982846`, with exactly 198 tasks, all `COMPLETED` with
  exit code `0:0` under Slurm account `pi_jss233`;
- fail-closed Stage-1 controller job: `22000279`, `COMPLETED` with exit code
  `0:0` under `pi_jss233`;
- campaign SHA-256:
  `68836347713a59209268098f6f5b0145be9a3a1ff20d642f49680454cde9f876`;
- technical-gate SHA-256:
  `101fe4f5beb348973caf377ac3c5d389c1d568b6524332284deb4b41780c575a`;
- independent scheduler-gate SHA-256:
  `8b04a76716f562b8959456d9e0d66f74d3829a5ecab0c5afc8536ae96837467c`;
- open-training analysis SHA-256:
  `c2195ff665a6275854bc3f9c11db55a43eff0239db22cbbdd8f19f8669459b62`;
- selected Stage-1 arm: `closeout_production`;
- selected policy SHA-256:
  `7742dc50c408b8cb6baae3776f2357f1ea41d57382ce9e1f2f76309607bda045`;
  and
- selected open-training actual-win and draw probabilities: 42/396
  (`0.10606060606060606`) and 231/396 (`0.5833333333333334`), respectively.

The prospective endpoint, closeout, optimizer, scheduler-provenance, and fresh
map compatibility implementation is commit
`15dda36cc507fb32ba64481992d0d319e473ce49`. The execution revision is the clean
`main` commit containing this freeze record. Because a file cannot contain the
hash of the commit that contains that same file without circularity, the exact
execution commit is attested independently by the all-country Stage-0 gate and
then copied into every immutable Stage-2 campaign and launch manifest. No
tracked source change is permitted after that gate without invalidating it and
requiring a new prospective protocol version and fresh seed domains.

This protocol defines bounded training-only optimization for converting
favorable positions into literal building-elimination wins against the pinned
Supalosa runtime. It cannot itself support a paper claim. All 22 families are
opened historical training families; fresh development and confirmatory
families remain inaccessible.

## Immutable endpoint

A candidate win requires all of the following:

1. the engine reports a finished game under `shortGame=true`;
2. Supalosa is defeated;
3. StrongBot is not defeated; and
4. the terminal snapshot contains zero Supalosa-owned objects whose rules type
   is `ObjectType.Building`.

The reciprocal conditions define a Supalosa win. Every tick-cap game is a draw,
regardless of credits, army, hit points, structure damage, or remaining
building advantage. Terminal counts and structure-damage telemetry are
training diagnostics only and never relabel a draw.

## Starting mechanism and source revision

The starting policy is the single arm selected by the frozen Stage-1 ranking
after all 3,564 Stage-1 games pass their technical gate. Stage-1 source,
campaign, gate, analysis, selected arm, and selected policy hashes are explicit
inputs to every Stage-2 generator. An outcome-free scheduler gate additionally
binds every one of the 198 Stage-1 array tasks to its exact raw job ID,
`COMPLETED` state, `0:0` exit code, and `pi_jss233` account using authoritative
`sacct` output. Stage-2 plan generation refuses a missing or nonmatching chain.

One prospective source revision is allowed before Stage 2. It may add only
coordinate-free interfaces justified without sealed outcomes:

- target hit-point/progress and activation-block telemetry;
- direct-warhead armor compatibility while retaining spawned-payload weapons;
- movement-class reachability to a valid firing perimeter around each building;
- target reassignment after a committed stall interval; and
- side-appropriate ground, air, or naval anti-structure production requested
  from live reachability and damage capability, not map identity.

The closeout implementation additionally obeys these endpoint-preserving
invariants, fixed before Stage-2 gameplay:

- once the building-elimination mission activates, capability production stays
  latched until the game ends rather than being disabled by a transient later
  army-count change;
- capability gaps are computed from the exact non-reserve force assigned to
  closeout, and newly produced air or naval finishers are not consumed as the
  generic home reserve while ordinary ground units remain available;
- a known but currently hidden building is approached by coordinates and is
  directly targeted only after it is visible; and
- visible targets are merged with non-invalidated remembered targets, so
  discovering one structure does not erase other surviving search targets.

These rules do not contain country-specific scalar choices, map identifiers,
coordinates, routes, or training outcomes. Their purpose is solely to make the
literal endpoint—zero surviving Supalosa buildings—reachable by the policy.

Every new option must have canonical parsing and hashing, deterministic unit
tests, and structured logging. `defaultMapProfiles=false` and
`exactMapTactics=false` remain mandatory. Country identity may resolve Allied
versus Soviet unit availability but may not select scalar parameters, maps,
coordinates, or routes.

## Five independent searches

Run exactly five optimizer seeds with indices 0--4. Each seed independently
generates candidates around the selected Stage-1 policy by domain-separated
SHA-256 ranking. A candidate is uniquely identified by the canonical policy
SHA-256. The selected Stage-1 policy and eight prespecified mechanism anchors
are intentionally repeated across runs to obtain independent complete blocks.
Random candidates are domain-separated by run; any within-run collision is
deterministically regenerated using the next mutation nonce. A coincidental
cross-run random collision is retained and accumulated as replicated evidence,
never counted as a new policy. The selected Stage-1 policy is always candidate
zero.

All candidates in a stage receive exactly the same family-country-seed-slot
schedule. Each family-country block contains both candidate slots under one
shared engine seed and is indivisible. There are no gameplay retries. Any
technical failure blocks reduction of the entire stage; a prospective repair
uses a new campaign version and fresh engine seeds for the complete affected
stage.

## Successive-halving schedule

| Search stage | Policies | Training families | Country mirrors | Games per run |
|---|---:|---:|---:|---:|
| 0 | 24 | 6 | 3 | 864 |
| 1 | 8 | 12 | 6 | 1,152 |
| 2 | 3 | 22 | 9 | 1,188 |
| **Total** |  |  |  | **3,204** |

Five runs therefore authorize exactly 16,020 launched games. Launch accounting
is per attempt, not per accepted outcome. Search is CPU-only under Slurm account
`pi_jss233`.

The five stage-0 searches are launched only by the fail-closed initializer
`research/slurm/method_v3_stage2_initializer.sbatch`, after the all-country
outcome-free interface gate passes on the exact source revision. The initializer
generates all five immutable campaigns before submitting any simulation, then
records each initial array job ID, campaign hash, shard count, dependent
controller job ID, scheduler account, Stage-0 gate, Stage-1 chain, and source
commit. Later stages are launched only by their preceding run controller. A
partial initializer or controller failure is repaired prospectively from the
recorded scheduler state; it never authorizes duplicate outcome-bearing games.

Each array task receives one CPU, 6 GiB of memory, and a 12-hour wall limit on
the `day` partition. Before launch, 133 completed Stage-1 18-game shards had a
median runtime of 1,835 seconds, a 90th percentile of 3,877 seconds, and a
maximum of 5,212 seconds. Linear scaling of the observed maximum to the largest
48-game Stage-2 shard is about 3.9 hours; the larger request preserves headroom
for the prospective reachability checks without changing any game budget.

Training families are nested within a run. Rank all 22 by

`SHA-256("chrono-divide-method-v3-stage2-family-v1\0" + run_index + "\0" + family_id)`.

Select the first six in stage 0, the first 12 in stage 1, and all 22 in stage 2.
Because every training family currently has two starts, no start-count
stratification changes this rank.

Country schedules are also nested. The nine internal country identifiers are
sorted by

`SHA-256("chrono-divide-method-v3-stage2-country-v1\0" + run_index + "\0" + country)`.

Stage 0 uses the first three, stage 1 the first six, and stage 2 all nine.
Every selected matchup is a country mirror. Across the five runs, report the
stage-0/1 country coverage; no cross-run balancing may change a frozen rank.

Each run and stage uses a disjoint engine-seed domain. The engine seed for a
family-country block uses base
`3,300,000,000 + run_index * 10,000,000 + stage * 1,000,000`, then adds the
row-major family-country shard ordinal with the existing paired-seed primitive.
The frozen family and country ranks bind the identities at each ordinal. Both
slots share that exact engine seed. Candidate and baseline bot PRNG seeds retain
the existing participant-isolated derivation.

## Bounded policy space

Only the following fields may differ from the selected Stage-1 policy. Values
outside these sets are invalid:

- closeout minimum tick: `7200, 8400, 9000, 10200, 10800, 12000`;
- minimum committed combatants: `6, 8, 10, 12, 16, 20`;
- combatant advantage: `-8, -4, 0, 4, 8`;
- maximum remaining enemy combatants: `2, 4, 6, 10, 999`;
- reserve combatants: `0, 2, 4, 6, 8`;
- order interval: `6, 12, 15, 24, 36` ticks;
- maximum simultaneous target groups: `1, 2, 3, 4, 6`;
- target priority: `production, defense, nearest`;
- preempt existing attack missions: `false, true`;
- capability-aware attacker assignment: `false, true`;
- reachability-aware target assignment: `false, true`;
- progress stall threshold: `300, 600, 900, 1200` ticks;
- stalled-target reassignment: `false, true`;
- construction-yard sale: `false, true`;
- finisher artillery target count: `0, 2, 4, 6, 8`;
- finisher artillery start: `8400, 9600, 10800, 12000, 13200` ticks;
- finisher artillery priority: `110, 125, 140, 155`;
- finisher tech lead: `1800, 2700, 3600, 4500` ticks;
- adaptive air finisher target count: `0, 2, 4, 6`;
- adaptive naval finisher target count: `0, 2, 4`;
- all-in minimum tick: `9000, 10800, 12600, 14400`;
- all-in minimum combatants: `6, 8, 10, 12, 16`;
- all-in combatant advantage: `-8, -4, 0, 4, 8`; and
- all-in attack preemption: `false, true`.

Observation mode is fixed to `publicApi` during search because that is the
primary common agent interface and the pinned Supalosa runtime also uses full
state. `directVisibleAttack=true`, `sweepWhenNoTargets=true`, and
`defaultMapProfiles=false`/`exactMapTactics=false` are fixed. A visible-only
observation ablation is required after a positive confirmation and is not a
search dimension.

Candidate zero is the selected Stage-1 policy projected into the new schema
with new mechanisms disabled. Candidates 1--8 are interpretable anchors for:
early closeout, low reserve, attack preemption, nearest priority, defense
priority, armor capability, reachability, and stalled-target reassignment. Each
anchor also enables building elimination if the selected Stage-1 policy had it
disabled.
Candidates 9--23 receive 4--9 distinct field mutations, with field rank and
value choice determined by domain-separated SHA-256 of run index, candidate
index, mutation nonce, and field name. At least one of capability,
reachability, stall reassignment, artillery, air, or naval finishing must differ
from candidate zero in every randomized candidate. Exact generator tests enumerate
all five 24-candidate populations and assert uniqueness and bounds.

## Reduction rule

Reduction gives equal weight to every scheduled family-country cell. The two
reciprocal games in a cell are averaged before aggregation. Policies are sorted
lexicographically by:

1. actual candidate win probability, descending;
2. candidate-win-minus-Supalosa-win probability, descending;
3. mean actual win probability over the worst 10% of family-country cells,
   descending;
4. draw conversion, descending, where an unfinished draw contributes
   `1 / (1 + terminal Supalosa building count)` and decisive games are excluded
   from this diagnostic;
5. draw probability, ascending;
6. median tick among actual candidate wins, ascending; and
7. canonical policy SHA-256, ascending.

If a policy has no draws, its draw-conversion value is 1. If it has no actual
wins, its median win tick is positive infinity. Terminal building count is
validated as a nonnegative integer from the complete terminal snapshot. No
credits, army, or aggregate material score enters Stage-2 selection.

After stage 0 retain the first eight policies. After stage 1 retain the first
three. Stage 2 is not reduced across runs. A frozen finalizer writes all three
finalists and the first-ranked global policy for that run, with exact campaign,
survivor, result, source, runtime, opponent, scheduler-job, and selection-rule
commitments.

## Cross-run finalist rule

After all five finalizers pass, form the union of their three finalists. Rank
the union using only accumulated complete training blocks in which a policy was
actually scheduled; do not impute missing run-stage cells. Freeze at most five
development finalists:

1. include every run's first-ranked policy;
2. remove duplicate policy hashes;
3. if more than five remain, rank by the same lexicographic rule on each
   policy's complete stage-2 blocks and keep five;
4. if fewer than five remain, fill from the remaining stage-2 finalists by the
   same rule; and
5. break every exact tie by policy SHA-256.

The method-v3 Stage-1 starting policy is included as a fixed development
reference but does not displace the five optimized finalists.

## Required accounting and stop conditions

Every stage technical gate must establish:

- exact frozen campaign and survivor hashes;
- clean `main` source and independently loaded pinned Supalosa runtime;
- exact map, runtime, package-lock, country, policy, seed, and slot identities;
- authoritative scheduler account `pi_jss233` and every raw job ID;
- exact launch, completion, summary, and structured-policy-event counts;
- no technical failure, timeout exception, selective rerun, duplicate episode,
  missing reciprocal slot, or actual-win invariant violation; and
- a commitment over all result artifacts before the reducer opens outcomes.

Partial evidence never advances. A weak or negative optimizer result is not
converted into a claim and does not authorize access to fresh development or
confirmation. The development waves proceed only after the finalist set and
all fresh-family roles are frozen.
