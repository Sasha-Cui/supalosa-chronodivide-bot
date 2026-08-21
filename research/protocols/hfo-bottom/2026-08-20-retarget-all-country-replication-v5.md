# HFO bottom retarget all-country paired replication V5

Status: **prospectively frozen after V4 and before V5 selection or outcomes**

## Motivation and fixed arms

V2 showed a large pooled retarget benefit but failed its all-country gate
because Korea was 2W/3L in only five cases. A separately frozen 40-case Korea
control arm in V4 produced 30W/2D/8L with the same unchanged retarget policy,
while the proposed static-defense repair failed decisively.

V5 therefore does not add or tune a mechanism. It asks whether the original
stalled-rotate retarget policy replicates across all nine countries with enough
fresh cases per country to estimate the strata credibly.

Compare exactly two arms:

1. `default`: the currently deployed policy with bottom retargeting disabled.
2. `winner_retarget`: stalled-rotate building retargeting after tick 42,000,
   with at least four attackers, at most six enemy buildings and four enemy
   combatants, six-tick orders, and a 600-tick stall/rotation horizon.

No static-defense boost or wide guard is enabled.

## Outcome-blind fresh cases

Use all nine countries and seed base `4,248,000,000`. For each country,
enumerate offsets 0 through 399 and both participant slots in ascending order.
Initialize with zero updates and select the first 30 cases with candidate
bottom `88,157` and Supalosa top `88,34`.

Require 270 unique cases, exactly 30 per country, zero updates, and no outcome
fields. All V1 through V4 seeds are barred. Selection must complete and be
hash-verified before any gameplay is submitted.

## Gameplay

- Exact HFO/private Snow runtime and external same-country Supalosa.
- 10,000 credits, `shortGame=false`, superweapons disabled.
- Literal all-buildings endpoint with symmetric resignation suppression.
- 90,000 maximum ticks.
- Run both arms once per case: 540 games.
- No retry, replacement, selective rerun, or outcome exclusion.
- Cap concurrency at 64 CPU tasks under `pi_jss233`.

## Frozen analysis

Report W/D/L, literal win and loss rates, one-sided 95% Wilson lower bound,
status and terminal-tick summaries, terminal building counts, each country's
W/D/L, and paired W/D/L-score differences. Score win=1, draw=0.5, loss=0.
Compute winner-minus-default mean and one-sided 95% paired-t lower bound with
`df=269` and critical value `1.65065`.

V5 passes only if `winner_retarget` satisfies all of:

1. wins exceed losses overall;
2. the one-sided 95% Wilson lower bound for literal win probability exceeds
   0.5;
3. draws are fewer than default draws;
4. losses are no greater than default losses;
5. the one-sided 95% paired-score lower bound exceeds zero;
6. wins are at least losses in all nine countries; and
7. wins exceed losses in at least eight countries.

These criteria are fixed before selection and will not be weakened after
outcomes.

## After V5

On pass, run an outcome-blind activation-isolation gate over all nine countries
and all four HFO starts. Require exact inactivity outside HFO bottom and the
expected retarget trace difference at bottom. Only then enable the controller
by default and freeze the combined west-plus-bottom candidate for fresh
all-country/all-start confirmation.

On failure, preserve the complete result and continue prospective policy
development without selective reruns. All V5 seeds are barred from final
confirmation.
