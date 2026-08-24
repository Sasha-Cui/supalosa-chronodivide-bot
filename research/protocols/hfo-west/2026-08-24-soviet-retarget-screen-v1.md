# HFO Soviet-west building-retarget development screen V1

Status: **prospectively frozen before selection or outcomes**

## Motivation

The restored HFO pilot showed Soviet-west at 8W/11D/3L: losses were already
low, but half the games drew. Allied-west has a separately replicated rush and
guard policy. This study targets only Libya, Iraq, Cuba, and Russia at west
versus east.

The mechanism reuses progress-gated direct building retargeting that replicated
at HFO bottom. It does not change Soviet production, opening, home defense, or
the Allied-west profile.

## Fixed arms

1. `default`: the deployed policy with Soviet-west retargeting disabled.
2. `current_retarget`: immediate late Soviet-west retarget activation;
   calibration only and not eligible for advancement.
3. `activation_stall_1200`: require 1,200 ticks without enemy-building
   progress before first activation.
4. `activation_stall_2400`: require 2,400 ticks without progress.

Every enabled arm uses tick 42,000 eligibility, at least four attackers, zero
combatant-advantage margin, at most six enemy buildings and four enemy
combatants, six-tick orders, and 600-tick post-activation progress and rotation
horizons. Activation is restricted to non-Allied countries at exact HFO west
versus east.

## Outcome-blind fresh cases

Use Libya, Iraq, Cuba, and Russia with seed base `4,254,000,000`. For each
country, enumerate offsets 0 through 399 and both participant slots in
ascending order. Initialize with zero updates and select the first ten cases
with candidate west `39,82` and Supalosa east `151,119`.

Require 40 unique cases, ten per country, zero updates, and no outcome fields.
No prior HFO seed may be reused. Selection must complete and be hash-verified
before gameplay.

## Gameplay

- Exact HFO/private Snow runtime and external same-country Supalosa.
- 10,000 credits, `shortGame=false`, superweapons disabled.
- Literal all-buildings endpoint with symmetric resignation suppression.
- 90,000 maximum ticks.
- Run all four arms once per case: 160 games.
- No retry, replacement, selective rerun, or outcome exclusion.
- Use at most 64 concurrent CPU tasks under `pi_jss233`.

## Frozen analysis and selection

Report W/D/L, win and loss rates, one-sided 95% Wilson lower bounds, terminal
summaries, each country stratum, and paired W/D/L-score differences from
`default`. Score win=1, draw=0.5, loss=0. Use the one-sided 95% paired-t
lower bound with `df=39` and critical value `1.68488`.

Only the two nonzero activation-stall arms are eligible. An arm advances only
if all of:

1. wins exceed losses overall;
2. the one-sided 95% Wilson lower bound exceeds 0.5;
3. draws are fewer than default draws;
4. losses are no greater than default losses;
5. the paired-score lower bound exceeds zero;
6. wins are at least losses in all four countries; and
7. wins exceed losses in at least three countries.

Rank eligible arms by fewer losses, fewer worsened transitions, more wins,
fewer draws, larger paired mean, and declaration order. If neither nonzero
stall is eligible, preserve the screen and continue development without
weakening criteria.

## After a pass

Replicate the fixed winner on at least 25 fresh cases per Soviet country
against default and immediate calibration. Require pooled, paired,
loss-noninferiority, and all-country gates, followed by activation isolation
before deployment.

All screen seeds are barred from replication and final confirmation.
