# HFO bottom activation-stall paired replication V8

Status: **prospectively frozen before V8 selection or outcomes**

## Fixed question and arms

V7 selected a 1,200-tick pre-activation building-progress stall. V8 asks
whether this new policy replicates across all nine countries while remaining
loss-noninferior to both the deployed default and immediate current retarget.

Compare exactly three arms:

1. `default`: deployed policy with bottom retargeting disabled.
2. `current_retarget`: immediate V5/V6 retarget activation; calibration only.
3. `winner_activation_stall_1200`: the V7 winner.

The winner requires 1,200 ticks without a decrease in enemy building count or
aggregate building hit points before first activation. Once active, it uses the
unchanged 600-tick stalled-rotation target logic. All other thresholds remain
identical to current retarget.

## Outcome-blind fresh cases

Use all nine countries and seed base `4,251,000,000`. For each country,
enumerate offsets 0 through 399 and both participant slots in ascending order.
Initialize with zero updates and select the first 30 cases with candidate
bottom `88,157` and Supalosa top `88,34`.

Require 270 unique cases, exactly 30 per country, zero updates, and no outcome
fields. Every V1 through V7 seed is barred. Selection must complete and be
hash-verified before gameplay.

## Gameplay

- Exact HFO/private Snow runtime and external same-country Supalosa.
- 10,000 credits, `shortGame=false`, superweapons disabled.
- Literal all-buildings endpoint with symmetric resignation suppression.
- 90,000 maximum ticks.
- Run all three arms once per case: 810 games.
- No retry, replacement, selective rerun, or outcome exclusion.
- Cap concurrency at 64 CPU tasks under `pi_jss233`.

## Frozen analysis and pass criteria

Report W/D/L, win and loss rates, one-sided 95% Wilson lower bounds, terminal
summaries, country-level W/D/L, and paired W/D/L-score differences from
`default`. Score win=1, draw=0.5, loss=0. Use the one-sided 95% paired-t lower
bound with `df=269` and critical value `1.65065`.

Also report each enabled arm's worsened transition count relative to default
and the direct transition matrix between current retarget and the V7 winner.

V8 passes only if `winner_activation_stall_1200` satisfies all of:

1. wins exceed losses overall;
2. the one-sided 95% Wilson lower bound for win probability exceeds 0.5;
3. draws are fewer than default draws;
4. losses are no greater than default losses;
5. losses are no greater than current-retarget losses;
6. the paired-score lower bound versus default exceeds zero;
7. wins are at least losses in all nine countries;
8. wins exceed losses in at least eight countries; and
9. worsened transitions versus default are no more frequent than for current
   retarget on the same cases.

All criteria are fixed before selection and will not be weakened after
outcomes.

## After V8

On pass, run outcome-blind activation isolation over all nine countries and all
four HFO starts. Only after exact inactivity outside HFO bottom may the winner
be enabled by default.

On failure, preserve the complete result and continue prospective development.
All V8 seeds are barred from final all-start confirmation.
