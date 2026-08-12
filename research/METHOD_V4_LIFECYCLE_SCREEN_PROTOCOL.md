# Method-v4 prospective lifecycle screen protocol

Status: **frozen before Method-v4 outcome access**  
Date frozen: 2026-08-12  
Permitted evidence role: opened training only; never a paper claim

## Motivation and evidentiary boundary

The complete Method-v3 Stage-2 evidence did not establish a policy that
reliably beats the pinned external Supalosa bot. Its best finalist won
100/396 games, drew 143, and lost 153. The frozen failure audit shows that
126/153 losses occurred before the building-elimination policy ever activated,
while 120/143 draws ended with at least one Supalosa building remaining.
Performance was also faction-asymmetric: 35/220 Allied wins versus 65/176
Soviet wins.

The prospective Method-v4 hypothesis is therefore narrower and causal:

> Preserve the stock Supalosa opening and midgame, then add only a generic,
> coordinate-free lifecycle controller that commits an advantageous army to
> destroying every enemy building while retaining a home reserve.

This protocol is bound to:

- Method-v3 failure audit SHA-256
  `5d10ba27d3f2527d6a43e9b248d2459990a96ae15220f1f31346b474264d276f`;
- Method-v3 cross-run finalist artifact SHA-256
  `d95ebd5d77fbd0d5dba01009341868bf514bc0690936eb3fba830f2929350284`;
- private train-family manifest SHA-256
  `25eac7233b2667b157c5026c66412d6becf947785bb8a528c86c18fc559d77c0`.

Fresh development and sealed test-family outcomes remain unopened. Any
Method-v4 result is a development decision only.

## Literal win endpoint

A candidate win requires all of the following:

1. the `shortGame` engine declares the game finished;
2. Supalosa is defeated;
3. the candidate is alive;
4. Supalosa has zero terminal buildings.

A tick-cap game, material lead, combatant lead, or zero Supalosa buildings
without a one-sided terminal defeat is a draw. Mutual building elimination is
also a draw. The gate validates the symmetric endpoint for baseline wins and
rejects inconsistent terminal records.

## Frozen population and schedule

- Opponent: independently loaded, clean, pinned external Supalosa runtime.
- Role: the 22 opened training families only.
- Countries: Americans, Alliance, French, Germans, British, Africans, Arabs,
  Confederation, and Russians.
- Pairing: exact same-country mirrors.
- Slots: reciprocal candidate slots 0 and 1.
- Seed base: `3500000000`; one deterministic paired seed block per
  family-country cell, reused by every arm and reciprocal slot.
- Tick cap: 18,000.
- Map profiles: disabled.
- Exact-map tactics, map identity, and coordinates: forbidden policy inputs.
- Retries and outcome-bearing selective reruns: forbidden.
- Array: 198 family-country shards at concurrency 20, 24 games per shard.
- Total: 12 × 22 × 9 × 2 = 4,752 launched games.
- Slurm account: `pi_jss233` only.

The prior comparable screen consumed 113.93 CPU-hours for 3,564 games.
Linear scaling predicts approximately 151.9 CPU-hours and about eight hours of
compute time at the 20-way cap, excluding queue delay. Expected durable output
is below 100 MB. No GPU is requested.

## Frozen arms

All arms use schema-v4. The exact canonical policies and hashes are emitted by
`methodV4LifecyclePolicies.ts` and included in the immutable campaign manifest.

1. `v3_reference`: the exact best Method-v3 policy, projected without changing
   behavior, to measure revision/seed-panel drift.
2. `baseline_control`: preserved baseline core, no lifecycle overlay.
3. `baseline_balanced`: tick 7,200, eight minimum combatants, zero required
   advantage, four-unit reserve, production priority, four target groups.
4. `baseline_early`: tick 5,400, six minimum combatants, advantage −4, six-unit
   reserve.
5. `baseline_late`: tick 10,800, ten minimum combatants, advantage +4.
6. `baseline_homeguard`: balanced controller with an eight-unit reserve.
7. `baseline_minimal_reserve`: balanced controller with a two-unit reserve.
8. `baseline_rapid_orders`: balanced controller refreshed every three ticks.
9. `baseline_nearest`: balanced controller with nearest-building priority.
10. `baseline_defense`: balanced controller with defense/power priority.
11. `baseline_focus`: balanced controller with one target group.
12. `baseline_parallel`: balanced controller with eight target groups.

Every baseline-preserving arm directly instantiates the independently loaded
pinned external Supalosa runtime and calls its normal tick before issuing the
declared building-closeout order. No local strategy, mission, production,
defence, or awareness implementation participates in those arms. The control
adds no order at all. Enabled overlays hold the public-game-state observation
mode fixed and vary only the lifecycle gates and assignment choices above;
they do not alter production.

## Outcome-free preconditions

Before the array may launch:

1. the source must be committed and pushed on clean `main`;
2. the full TypeScript build and driver test suite must pass;
3. all nine countries must instantiate and exercise the schema-v4 interface;
4. before the earliest overlay activation tick, the `baseline_control` state
   and order trace must match the independently loaded pinned Supalosa runtime
   in 36 outcome-free counterfactual games spanning all nine countries, both
   physical slots, identical participant RNG identities, and identical engine
   seeds;
5. the generated campaign must bind source/runtime, baseline/runtime, game API,
   package lock, role, split, source population, Method-v3 finalists, and failure
   audit hashes.

Any failure blocks the outcome-bearing array and must be repaired prospectively.

## Complete-population gate and ranking

No outcomes are summarized until all 198 scheduler tasks complete with exit
`0:0`, account `pi_jss233`, and exactly 4,752 technically valid completions.
The gate checks every plan, manifest, event sequence, scheduler job ID, seed,
country, slot, policy hash, map commitment, and terminal endpoint.

Only after that gate, arms are ranked lexicographically by:

1. minimum of Allied and Soviet actual win probability, descending;
2. equal-family-country actual win probability, descending;
3. equal-family-country win-minus-loss probability, descending;
4. minimum country win-minus-loss probability, descending;
5. equal-family-country draw probability, ascending;
6. median tick among actual wins, ascending;
7. canonical policy SHA-256, ascending.

An arm advances only if it simultaneously has:

- actual win probability strictly above 0.50;
- more wins than losses among Allied countries;
- more wins than losses among Soviet countries;
- more wins than losses in at least seven of nine countries.

If no arm advances, fresh development and sealed confirmation remain closed.
The only authorized next step is another explicitly documented prospective
training-only refinement based on the complete Method-v4 evidence.

## Interpretation

Passing this screen is a positive training signal, not evidence for the paper.
It selects at most a candidate for the already prespecified outcome-blind
development compatibility gate and single diagnostic. A paper claim requires
fresh-family and ultimately sealed-family uncertainty analysis with the literal
win endpoint unchanged.
