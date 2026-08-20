# HFO Allied west activation-isolation gate V1

Status: **prospectively frozen before trace selection or execution**

## Purpose

V3 replicated the opt-in Allied-west winner at 47W/2D/1L. Before deployment,
this gate must prove that its two mechanisms—conditional `rush` production and
the west group guard—activate only for Allied west-versus-east games. It is a
technical trace gate and writes no W/D/L result.

## Outcome-blind scenario selection

Use all nine countries and desired candidate starts in order `39,82`,
`151,119`, `88,34`, `88,157`. Opposite starts must respectively be `151,119`,
`39,82`, `88,157`, `88,34`.

For country ordinal `c` and start ordinal `s`, enumerate seeds

`4,243,000,000 + 10,000*c + 1,000*s + offset`, offsets 0 through 399, and both
participant slots in ascending order. Initialize but perform zero updates.
Select the first setting yielding each desired candidate/opponent start pair.
Require 36 unique cases, all country/start cells, zero updates, and no outcome
field.

## Trace arms

Run default and `winner_conditional` once on each selected case, against exact
external Supalosa in the same country. Use exact HFO, 10,000 credits,
`shortGame=false`, superweapons disabled, resignation suppression, and at most
12,000 ticks.

For each arm record only technical trace data:

- normalized candidate `orderUnits` calls with tick, unit IDs, order type, and
  arguments;
- candidate credits and normalized own-unit state every 600 ticks;
- candidate production queues every 600 ticks;
- observed tick count, engine-finished flag, suppressed-resignation counts;
- action and snapshot SHA-256 values; and
- number of pre-9,600 attack-move orders targeting one of the six declared
  west guard anchors.

Do not write winner, defeated side, terminal building counts, or W/D/L.

## Activation matrix and pass rule

The expected active set is exactly five cases: USA, Korea, France, Germany, and
Great Britain at start `39,82` against `151,119`.

For every active case require:

- winner and default action hashes differ;
- winner emits at least one declared guard-anchor order; and
- the trace completes without a forwarded resignation or technical error.

For each of the other 31 cases require exact equality between arms for action
hash, snapshot hash, observed ticks, engine-finished flag, and suppressed
resignation counts. Also require zero winner guard-anchor orders. The aggregate
passes only with 5/5 active and 31/31 inactive cases satisfying their rules,
complete scheduler evidence, and all nine countries/four starts represented.

## After a pass

On pass, enable the conditional profile and guard in deployed defaults, retain
explicit off switches for ablation, and freeze the resulting source before any
fresh confirmation. Then run an all-country, reciprocal-slot, all-start HFO
confirmation on seeds disjoint from every development phase.

On failure, preserve all traces and repair activation boundaries before any
deployment or confirmation.
