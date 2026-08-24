# HFO bottom activation-isolation gate V9

Status: **prospectively frozen before selection or traces**

## Purpose

V8 authorizes a technical runtime-boundary gate for the replicated 1,200-tick
activation-stall policy. This gate contains no W/D/L analysis. It asks whether
bottom retargeting is active only for exact HFO bottom-versus-top games and is
bit-for-bit inert for every other HFO start.

## Outcome-blind case matrix

Use all nine countries and all four HFO starts:

- west `39,82` versus east `151,119`;
- east `151,119` versus west `39,82`;
- top `88,34` versus bottom `88,157`; and
- bottom `88,157` versus top `88,34`.

Starting from seed `4,252,000,000`, enumerate offsets and participant slots
in ascending order and select the first zero-update case for each
country/start cell. Require 36 unique cases, nine expected-active bottom cells,
27 expected-inactive cells, zero updates, and no outcome fields.

## Trace arms

Each cell runs two same-seed arms for 600 ticks:

1. `disabled`: bottom retarget explicitly disabled.
2. `exposure_enabled`: the same controller with a time-compressed technical
   exposure configuration.

The exposure arm keeps the exact HFO-bottom start predicate and target-control
path but sets minimum tick and attacker count to zero, permits all observed
building and combatant counts, and sets pre-activation stall to zero. This
ensures deterministic exposure during the short technical trace. The deployed
1,200-tick timing and thresholds remain covered by unit tests and V8 gameplay;
the exposure configuration is never a candidate policy.

Capture normalized candidate action traces, own-state and production snapshots,
observed ticks, engine-finished state, symmetric quit-suppression counts, and
the internal bottom-retarget activation flag.

## Frozen gate

For each of the nine expected-active bottom cells require:

- disabled activation flag is false;
- exposure-enabled activation flag is true; and
- disabled and enabled action hashes differ.

For each of the 27 expected-inactive cells require exact equality for:

- normalized candidate action hash;
- normalized own-state and production snapshot hash;
- observed ticks and engine-finished state; and
- symmetric quit-suppression counts.

Also require the exposure-enabled activation flag to remain false in every
inactive cell.

The aggregate passes only with all 36 cells complete under `pi_jss233`, all
nine countries and four starts represented, exactly nine active passes, exactly
27 inactive exact-equality passes, one source commit, and matching program,
protocol, selection, runtime, and scheduler identities.

## After a pass

Enable the exact replicated V8 configuration by default:

- tick 42,000 eligibility;
- four minimum attackers;
- zero combatant-advantage margin;
- at most six enemy buildings and four enemy combatants;
- 1,200-tick pre-activation progress stall;
- six-tick orders; and
- 600-tick post-activation stall and rotation.

Then freeze the combined Allied-west plus bottom candidate for fresh
all-country/all-start confirmation. V9 trace seeds are barred from that
confirmation.
