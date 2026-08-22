# HFO bottom retarget safety-margin development screen V6

Status: **prospectively frozen before V6 selection or outcomes**

## Motivation

V5 converted 91 default draws into wins and improved one default loss, but it
also changed one draw into a loss and one win into a loss. The retarget
controller currently assigns all mobile combatants to buildings whenever at
least four attackers remain and no more than four enemy combatants are known.
This can abandon a defensible state when the armies are close in size.

V6 tests only the safety margin for activation. It does not tune the frozen
stalled-rotation target logic, timings, building thresholds, or endpoint.

## Fixed arms

1. `default`: deployed policy with bottom retargeting disabled.
2. `current_retarget`: V5 stalled-rotate policy; four minimum attackers, at
   most four enemy combatants, zero required combatant advantage.
3. `advantage_2`: current retarget plus a requirement that attackers number
   at least enemy combatants plus two.
4. `advantage_4`: current retarget plus a requirement that attackers number
   at least enemy combatants plus four.
5. `zero_enemy_combatants`: current retarget may activate only when no enemy
   combatants are known.

Every enabled arm retains tick 42,000 activation, at most six enemy buildings,
six-tick orders, 600-tick progress stall and rotation horizons, and
`stalled_rotate` mode. No static-defense or wide-guard intervention is used.

## Outcome-blind fresh cases

Use all nine countries and seed base `4,249,000,000`. For each country,
enumerate offsets 0 through 399 and both participant slots in ascending order.
Initialize with zero updates and select the first eight cases with candidate
bottom `88,157` and Supalosa top `88,34`.

Require 72 unique cases, exactly eight per country, zero updates, and no outcome
fields. Every V1 through V5 seed is barred. Selection must be complete and
hash-verified before gameplay.

## Gameplay

- Exact HFO/private Snow runtime and external same-country Supalosa.
- 10,000 credits, `shortGame=false`, superweapons disabled.
- Literal all-buildings endpoint with symmetric resignation suppression.
- 90,000 maximum ticks.
- Run all five arms once per case: 360 games.
- No retry, replacement, selective rerun, or outcome exclusion.
- Cap concurrency at 64 CPU tasks under `pi_jss233`.

## Frozen analysis and selection

For each arm report W/D/L, win and loss rates, one-sided 95% Wilson lower
bound, status and terminal-tick summaries, terminal building counts, each
country's W/D/L, and paired W/D/L-score differences from `default`. Score
win=1, draw=0.5, loss=0. Use the one-sided 95% paired-t lower bound with
`df=71` and critical value `1.66660`.

An enabled arm is eligible only if all of:

1. wins exceed losses overall;
2. the one-sided 95% Wilson lower bound for win probability exceeds 0.5;
3. draws are fewer than default draws;
4. losses are no greater than default losses;
5. the paired-score lower bound exceeds zero;
6. wins are at least losses in all nine countries; and
7. wins exceed losses in at least eight countries.

Rank eligible arms by fewer losses, then more wins, fewer draws, larger paired
mean, and declaration order. If no arm is eligible, V6 fails without weakening
criteria.

## After V6

An eligible winner requires a larger fresh 30-case-per-country paired
replication against `default`, followed by activation isolation. Only a
replicated policy with loss non-inferiority may be enabled by default.

On failure, preserve the complete screen and continue prospective development.
All V6 seeds are barred from later replication and final confirmation.
