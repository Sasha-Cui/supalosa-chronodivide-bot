# Unified intent arbiter V1 M2: open development outcome screen

Frozen: 2026-09-12, after Gate 3 B1 passed and before any M2 initialization,
game, or outcome.

Bound technical result:

- `research/results/2026-09-12-unified-intent-arbiter-v1-gate-3-b1.md`

Parent method:

- `research/protocols/method/2026-09-07-unified-intent-arbiter-v1.md`

## Question

Does the technically valid ceiling-150 unified intent arbiter improve literal
competitive outcomes over the identical deployed StrongBot with the arbiter
disabled, while preserving its established Supalosa strength and improving
transfer to RA2Web Advanced?

This is an open development screen. Its complete result may guide later method
development, but it is not confirmatory paper evidence.

## Frozen population

Use 900 fresh paired cases with requested engine seed:

`3,350,103,000 + caseIndex`, for case indices 0–899.

The population repeats the exact Gate 3 full crossing:

- pinned external Supalosa on all 15 physical maps: 540 cases;
- pinned RA2Web Advanced on the ten HFO maps: 360 cases;
- first two starts in both directions;
- all nine countries; and
- candidate slots 0 and 1.

Each opponent-map combination is one inferential family with exactly 36
cases. There are 25 families: 15 Supalosa and 10 Advanced. No seed overlaps
Gate 2, Gate 3 A0, A1, or B1.

## Paired arms

Each case runs these two arms sequentially with the same engine seed and stable
participant random identities:

1. `disabled`: deployed StrongBot with `intentArbiter.enabled=false`;
2. `ceiling_150`: the identical deployed StrongBot with only the validated
   ceiling-150 arbiter enabled.

Reserve remains 35 and the order cap remains 115. All strategy, map-profile,
terminal, retry, priority, TTL, grouping, chunk, observation, opponent, and game
options are identical. Essential gameplay non-order calls remain immediate and
unsuppressed.

One Slurm task runs both arms for one case so each pair is atomic. The array is
exactly 900 tasks and 1,800 games.

## Literal endpoint

Use the existing pinned physical-building adjudicator and a maximum of 24,000
updates per game.

- candidate win: every opponent-owned building is physically destroyed first;
- candidate loss: every candidate-owned building is physically destroyed
  first;
- simultaneous physical elimination in the same update: draw;
- 24,000-update cap: draw;
- clean engine termination without a literal one-sided physical elimination:
  draw; and
- suppressed or observed resignation never determines the result.

Technical failure is not a draw. Any failed task invalidates the complete
population and blocks analysis.

## Selector and execution

Before games, initialize all 900 cases at zero updates and freeze one manifest
binding source, program, protocol, Gate 1/2/3/A1/B1 results, runtime, assets,
all map bytes, both opponent implementations, game modes, seeds, starts,
countries, slots, arm order, endpoint implementation, and Slurm scripts.

Run one preserved task-0 technical smoke. The smoke verifies both arms,
literal-adjudicator plumbing, fixed options, and artifact integrity but its
outcome is not inspected or included. On smoke pass, launch exactly
`0-899%64` on `pi_jss233/day`, one CPU and 8 GiB per task, no GPU and no
requeue. Submit an `afterok` fail-closed finalizer with one CPU and 24 GiB.

Successful task stdout/stderr goes to `/dev/null`. Each successful task writes
one compact paired JSON and one checksum marker. Do not inspect any individual
or partial outcome. Analyze only after all 900 tasks and the finalizer complete
cleanly. Require exact unique scheduler IDs, zero restarts/retries/exclusions,
and fewer than 2,000 final files.

## Recorded complete-population evidence

For both arms and every pair preserve:

- literal W/D/L and endpoint class;
- terminal update or 24,000-update cap;
- final owned-building counts needed to audit literal adjudication;
- action and public-state trajectory hashes;
- suppressed-resignation audit;
- ceiling-150 aggregate arbiter telemetry and all Gate 3 invariant checks; and
- exact source/runtime/map/opponent/country/start/slot/seed/scheduler identity.

The finalizer reports paired transition tables, W/D/L and score by arm,
opponent, family, map, faction, country, direction, and slot; terminal-time and
draw-class summaries; and complete arbiter mechanism totals. No subgroup may
be omitted.

## Estimands and uncertainty

Code literal score as win 1, draw 0.5, loss 0. For each case compute enabled
minus disabled differences in score and literal-win indicator.

Primary estimates give every opponent-map family equal outer weight after
averaging its 36 cases. Report:

- family-weighted paired score difference;
- family-weighted paired literal-win difference;
- the same two estimates separately for Supalosa and Advanced;
- pooled W/D/L and one-sided Wilson bounds for each arm/opponent; and
- point effects for both factions, both slots, every country, and all 25
  families.

Use a deterministic 200,000-replicate family-cluster bootstrap, resampling the
25 families with replacement and retaining all 36 within-family paired cases.
Use domain `unified-intent-m2-family-bootstrap-v1` and SHA-256 counter-mode
draws. Report one-sided 90% percentile lower bounds. For opponent-specific
intervals, resample only that opponent's 15 or 10 families. Preserve the full
bootstrap configuration and output hash.

## Prospective development decisions

The arbiter shows a broad positive development signal only if all hold:

1. the overall family-clustered 90% lower bound for paired score is above zero;
2. the overall family-clustered 90% lower bound for paired literal-win rate is
   above zero;
3. the Advanced-specific paired-score lower bound is above zero and enabled
   has strictly more literal wins than disabled;
4. the Supalosa-specific paired-score lower bound is at least -0.02, enabled
   wins exceed enabled losses, and no more than two Supalosa families have a
   paired score effect below -0.10;
5. Allied and Soviet point paired-score effects are nonnegative;
6. slot-0 and slot-1 point paired-score effects are nonnegative; and
7. baseline-win-to-enabled-loss transitions do not exceed
   baseline-loss-to-enabled-win plus baseline-draw-to-enabled-win transitions.

Absolute Advanced superiority is reported separately and requires enabled
literal wins to exceed losses and the one-sided 90% Wilson lower bound for its
literal-win probability to exceed 0.50. It is not inferred from relative
improvement alone.

If the broad positive signal passes but absolute Advanced superiority does
not, retain ceiling 150 only as a validated component for a prospectively
designed Advanced-strength policy. If Advanced relative improvement fails,
do not use the arbiter as the claimed Advanced solution. If Supalosa safety
fails, do not deploy it globally. If all broad-signal gates pass, replicate the
unchanged pair on fresh seeds before any confirmatory claim.

No threshold may be weakened after outcomes are visible. M2 results, including
a null or negative result, must be preserved and committed before subsequent
method changes.
