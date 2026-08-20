# HFO Korea bottom defense paired replication V4

Status: **prospectively frozen after V3 and before V4 selection or outcomes**

## Question and fixed arms

V3 selected the smallest static-defense intervention while holding the
replicated late building-retarget controller fixed. V4 asks whether that
intervention replicates on a larger fresh Korea-bottom sample.

Compare exactly two arms:

1. `retarget_control`: stalled-rotate building retargeting with the frozen
   600-tick stall and rotation horizon; no added static defense.
2. `pillbox_2`: the identical retarget controller plus two bottom-only Allied
   pillboxes from tick 5,400, target count two, priority 132.

No arm changes the map, country, late retarget thresholds, game endpoint, or
any other StrongBot tactic.

## Outcome-blind fresh cases

Use Korea mirror games only. Starting from seed `4,247,000,000`, enumerate
offsets 0 through 399 and both participant slots in ascending order. Initialize
with zero updates and select the first 40 cases with candidate bottom
`88,157` and Supalosa top `88,34`.

Require 40 unique cases, zero updates, and no outcome fields. V1, V2, and V3
seeds are barred. Selection must finish before any V4 gameplay is submitted.

## Gameplay

- Exact HFO/private Snow runtime and external same-country Supalosa.
- 10,000 credits, `shortGame=false`, superweapons disabled.
- Literal all-buildings endpoint with symmetric resignation suppression.
- 90,000 maximum ticks.
- Run both arms once per case: 80 games.
- No retry, replacement, selective rerun, or outcome exclusion.

## Frozen analysis and pass criteria

Report W/D/L, literal win and loss rates, one-sided 95% Wilson lower bound,
status and terminal-tick summaries, terminal building counts, and paired
W/D/L-score differences. Score win=1, draw=0.5, loss=0. Compute the
pillbox-minus-control mean and one-sided 95% paired-t lower bound with
`df=39` and critical value `1.68488`.

V4 passes only if `pillbox_2` satisfies all of:

1. wins exceed losses;
2. the one-sided 95% Wilson lower bound for literal win probability exceeds
   0.5;
3. draws are no greater than control draws;
4. losses are strictly fewer than control losses; and
5. the one-sided 95% paired-score lower bound exceeds zero.

These criteria are fixed before selection and will not be weakened after
outcomes.

## After V4

On pass, run an outcome-blind activation-isolation gate and a fresh
all-nine-country bottom replication comparing the combined conditional policy
against the currently deployed policy. The two-pillbox intervention may be
active only for Korea at HFO bottom; the late retarget controller may be active
for every country at HFO bottom. Require exact inactivity outside the intended
country/start cells before default deployment.

On failure, preserve the complete result and continue prospective development
without selective reruns. All V4 seeds are barred from final all-start
confirmation.
