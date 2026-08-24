# HFO Soviet-west rush-and-guard activation-isolation gate V5

Status: **prospectively frozen before trace selection or execution**

## Purpose

V4 replicated the unchanged Soviet-west rush-plus-guard winner at 98W/9D/13L
on 120 fresh cases. Before deployment, this technical gate must prove that its
two mechanisms—conditional rush production/planning and the west grouped home
guard—activate only for Soviet west-versus-east games. It writes no W/D/L or
terminal-building outcome.

## Outcome-blind scenario selection

Use all nine countries and desired candidate starts in order `39,82`,
`151,119`, `88,34`, `88,157`. Opposite starts must respectively be `151,119`,
`39,82`, `88,157`, `88,34`.

For country ordinal `c` and start ordinal `s`, enumerate seeds

`4,258,000,000 + 10,000*c + 1,000*s + offset`, offsets 0 through 399, and both
participant slots in ascending order. Initialize but perform zero updates.
Select the first setting yielding each desired candidate/opponent start pair.
Require 36 unique cases, all country/start cells, zero updates, and no outcome
field.

## Trace arms

Run `default` and `winner_conditional` once on each selected case against exact
external same-country Supalosa. The winner arm enables the conditional
Soviet-west strategy profile and permits the already replicated west guard for
Soviet countries. Its effective active configuration must exactly match V4:
HFO attack composition, rush strategic plan, guard through tick 9,600, radius
72, six-tick ordering, four minimum combatants, and zero engagement advantage.

Use exact HFO, 10,000 credits, `shortGame=false`, superweapons disabled,
resignation suppression, and at most 12,000 ticks.

For each arm record only technical trace data:

- normalized candidate `orderUnits` calls with tick, unit IDs, order type, and
  arguments;
- candidate credits, normalized own-unit state, and production queues every
  600 ticks;
- observed tick count, engine-finished flag, and suppressed-resignation counts;
- action and snapshot SHA-256 values; and
- the count of pre-9,600 attack-move orders targeting one of the six declared
  west guard anchors.

Do not write winner, defeated side, terminal building counts, or W/D/L.

## Activation matrix and pass rule

The expected active set is exactly four cases: Libya, Iraq, Cuba, and Russia at
west `39,82` against east `151,119`.

For every active case require:

- winner and default action hashes differ;
- winner and default snapshot hashes differ;
- winner emits at least one declared guard-anchor order; and
- the trace completes without a forwarded resignation or technical error.

For each of the other 32 cases require exact equality between arms for action
hash, snapshot hash, observed ticks, engine-finished flag, and suppressed
resignation counts. Also require zero winner guard-anchor orders. The aggregate
passes only with 4/4 active and 32/32 inactive cases satisfying their rules,
complete scheduler evidence, and all nine countries/four starts represented.

## After a pass

On pass, enable the conditional Soviet-west profile and Soviet guard permission
in deployed defaults, retain explicit off switches for ablation, and freeze the
resulting source before fresh confirmation. Then run an all-country,
reciprocal-slot, all-start HFO confirmation on seeds disjoint from every
development, replication, and isolation phase.

On failure, preserve all traces and repair activation boundaries before any
deployment or confirmation.
