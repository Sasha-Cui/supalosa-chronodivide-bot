# HFO Korea bottom defense development screen V1

Status: **prospectively frozen before selection or outcomes**

## Motivation

The replicated retarget controller converts bottom draws to wins without
increasing losses, but Korea remains 2W/3L. Its earliest loss is before the
retarget activation threshold. The deployed bottom plan builds no static
defenses, while the fixed diagnostic observed Supalosa fielding multiple
pillboxes. This screen holds stalled retargeting fixed and tests early defense.

## Fresh cases

Use Korea mirror games only. Starting from seed `4,246,000,000`, enumerate
offsets 0 through 399 and both participant slots in ascending order. Initialize
with zero updates and select the first 12 cases with candidate bottom `88,157`
and Supalosa top `88,34`. Require 12 unique cases, zero updates, and no outcome
fields.

## Fixed variants

Every arm enables `stalled_rotate_600` exactly as in bottom V2.

1. `retarget_control`: no additional defense.
2. `pillbox_2`: two bottom-only Allied pillboxes from tick 5,400, priority 132.
3. `pillbox_4`: four pillboxes with the same start/priority.
4. `wide_guard`: bottom home guard radius 72, six-tick ordering, through tick
   42,000; no extra pillboxes.
5. `pillbox_2_wide_guard`: combine variants 2 and 4.
6. `pillbox_4_wide_guard`: combine variants 3 and 4.

No variant changes the late retarget parameters, country, map, or other exact
HFO tactics.

## Gameplay and analysis

- Exact HFO/private Snow runtime and external same-country Supalosa.
- 10,000 credits, `shortGame=false`, superweapons disabled.
- Literal all-buildings endpoint with symmetric resignation suppression.
- 90,000 maximum ticks.
- Run all six arms once per case: 72 games; no retry or exclusion.

Report W/D/L, literal win/loss rate, status/tick/building summaries, and paired
W/D/L-score differences versus `retarget_control`. Rank by wins-minus-losses,
wins, fewer losses, fewer tick-cap draws, lower median tick, declaration order.

Advance only if the winner has at least eight wins, wins exceed losses, loss
rate is below control, and mean paired score improvement is positive. Otherwise
preserve the complete screen and do not weaken criteria.

## After advancement

An eligible Korean defense requires a larger fresh Korea replication and then
a full all-country bottom replication with the defense activated only for Korea
bottom. Activation isolation must prove exact inactivity in all other country
and start cells before default deployment.

All screen seeds are barred from later replication and final confirmation.
