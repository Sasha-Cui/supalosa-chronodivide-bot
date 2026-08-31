# RA2Web Advanced public-state diagnostic V7

Status: **prospectively frozen before V7 traces or outcomes**

Date frozen: 2026-08-31

## Motivation

The completed HFO cross-play is unacceptable evidence for an opponent-robust
claim: deployed StrongBot scored 79W/19D/262L against pinned RA2Web Advanced,
while pinned Supalosa scored 178W/30D/152L. V4--V6 established that disabling
existing profiles, decorating baseline orders, and imposing simple early
production/attack schedules do not create a robust Advanced specialist. V6
improved several certain-loss cases but produced no eligible survivor.

V7 changes the policy class. It will synthesize a compact state-conditioned
controller over production, defense, regrouping, attacks, raids, recovery, and
literal building closeout. Before freezing that controller grammar, this
diagnostic locates the failure timeline using only public game interfaces and
already-consumed development cases.

## Immutable opponent and environment

- map: `cd_chrono_4_heck_freezes_over_le.map`;
- map SHA-256:
  `e4dfc736a6355e0e68d4681e4d67419516e6bb94549e2d42880c9414e95e2e8d`;
- pinned Supalosa commit:
  `165b77a71d0cf5ebd27c65b19d0486bcbae78d0f`;
- RA2Web client commit:
  `218fb800614295119e25040986b175fee4c3670f`;
- RA2Web release: `0.84.1-r1d35349-dd6a17b9c`;
- Advanced bundle SHA-256:
  `81d8797b6dd1371ba2dcbd79e25df8b42254290c820159e121a82650fd97a143`;
- freeze-manifest SHA-256:
  `a405c0fc6d1d6541f965582c9b53be0bfd01c0c68f4d0f340e1a5ae37671aa5d`;
- credits 10,000, no crates, no superweapons, no starting units, MCV repacks
  enabled, short-game disabled; and
- literal all-enemy-buildings endpoint with symmetric resignation suppression.

All simulation uses CPU `day` jobs under `pi_jss233`. GPU requests are
prohibited.

## Cases and outcome boundary

The diagnostic reuses only the 36 `development` West-versus-East cases from
the completed V6 selector with SHA-256
`9e2945997fe49d8f8677acc8287b416408f19e2a4175bd7ff2a53e86fc5b8402`.
These cases have already been outcome-exposed. The 72 V6 validation and 360 V6
replication cases remain sealed and are prohibited inputs.

Two immutable policy arms are replayed on all 36 cases:

1. pinned external Supalosa; and
2. the exact deployed StrongBot policy at the V7 implementation commit.

This produces exactly 72 diagnostic games. No case selection, exclusion, or
single-game inspection is permitted. The complete aggregate may include
literal endpoint labels because the population is development-only.

## Public information boundary

Snapshots are generated separately from each participant's `GameApi`. Policy
development may use only information available to the candidate:

- own credits, start, country, power state, queues, and public rules;
- own units/buildings with rule name, health, stance, and tile;
- enemy units/buildings returned by `getVisibleUnits(candidate, "enemy")`;
- elapsed update and previously observed public state; and
- the already validated public opponent-credit detector at update 1,200.

Prohibited inputs include opponent bundle fields, internal missions, private
telemetry, hidden units, global unit enumeration unavailable through candidate
visibility, RNG state, eventual result, endpoint orientation, terminal
building counts, and case identity. Endpoint labels may be joined only by the
aggregate analyzer after every trace is complete.

## Fixed telemetry

Record a canonical snapshot at update 0, every 300 updates through 30,000, and
at literal termination if earlier. Each snapshot contains:

- own and visible-enemy credits and power where public;
- own queue contents/status and available production objects;
- counts by rule name and role: harvesters, infantry, dogs, tanks, other
  combatants, construction yards, refineries, barracks, war factories,
  defenses, tech, and other buildings;
- aggregate hit points and approximate public-rule cost by role;
- combatant centroids and counts in home, midfield, and opponent-base regions;
- visible threats within radii 8, 16, and 24 of each own production building;
- first production, first combatant, first visibility, first damage, first
  building loss, and first issued attack timing; and
- canonical public-state and action hashes.

The event audit records candidate calls to queue, unqueue, pause, resume, unit
orders, building placement, sell, and quit. Quit is suppressed symmetrically.

## Aggregate analysis

After all 72 tasks and a fail-closed finalizer complete, compute:

1. matched policy differences at each fixed update;
2. median and interquartile timing of economic, production, engagement, and
   collapse events by faction and participant slot;
3. earliest update at which a leave-country-out decision tree can distinguish
   eventual wins from losses using only lagged public features;
4. permutation importance under leave-country, leave-slot, and leave-seed-
   block-out validation;
5. trajectories for the lower quartile, median, and upper quartile of eventual
   outcomes selected by a fixed aggregate rule, not by manual browsing; and
6. candidate action ownership conflicts: baseline and overlay orders to the
   same unit or queue within 24 updates.

The tree is diagnostic, not a performance claim and not itself deployed.

## Pass criteria

The diagnostic passes only if:

- exactly 72 unique tasks finish `0:0` under `pi_jss233` with no retries;
- every arm has all nine countries and both slots on the same 36 cases;
- all source, program, protocol, runtime, baseline, selection, and Advanced
  hashes match;
- snapshot schedules and recursive prohibited-field audits pass;
- public-state replay is deterministic on one prespecified repeat per arm;
- the aggregate identifies at least one actionable pre-collapse interval in
  which production, force allocation, or order ownership can still change; and
- every diagnostic conclusion is supported across at least two grouped
  holdouts, not one country or slot.

If no actionable interval exists, V7 stops and the project must change its base
economy/build architecture rather than optimize combat thresholds.

## Required post-diagnostic freeze

No new Advanced competitive endpoint may run immediately after this analysis.
First commit a separate V7 synthesis protocol that fixes:

- the prioritized-rule grammar and public features;
- exclusive action/queue ownership semantics after update 1,200;
- deterministic candidate generation, mutation, and three independent search
  seeds;
- complexity penalty and maximum rule count;
- development, validation, replication, and adaptive-router populations;
- successive-halving advancement and immutable survivor hashes;
- worst-stratum objective and time-to-literal-win tie-break;
- exact switching-cost comparison against both Advanced and Supalosa; and
- all absolute, paired, faction, country, start, slot, and uncertainty gates.

The eventual Advanced success threshold is intentionally stronger than parity:

- replication point win rate at least 0.80;
- pooled one-sided 95% Wilson lower bound above 0.75;
- equal-weight country-by-start one-sided 95% lower bound above 0.70;
- wins exceed losses in both factions, both slots, every physical start, and
  every country-by-start cell; and
- the adaptive routed policy preserves a one-sided 95% lower win bound above
  0.80 against pinned Supalosa.

Anything weaker may be reported analytically but may not be called “consistently
destroying Advanced.” Gates are not relaxed after outcomes.

## Scheduler and evidence discipline

Use a zero-update manifest verifier, one outcome-free smoke, a 72-task CPU array
with concurrency at most 64, and an `afterok` fail-closed finalizer. Do not
inspect partial traces. Do not modify tracked source while source-bound jobs
run. Preserve every task JSON, checksum, stdout/stderr log, Slurm job ID, and
complete aggregate. Commit the result document and aggregate hash before
freezing the synthesis stage.
