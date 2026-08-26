# V6 amendment 1: vehicle-queue actuation repair

Status: **prospectively frozen after complete V6 technical failure and before
repair selection or traces**

## Justification and narrow scope

The complete V6 technical gate ran 108/108 traces without a competitive field.
Five arms passed all interface gates. `vehicle_focus` failed only because its
different-active-item replacement fired in 6/18 cases rather than the frozen
12/18 minimum. The intended tank was available in 18/18 cases, attack
activation occurred in 18/18, all timing and queue restrictions passed, and
every trace differed from no-op.

Amendment 1 repairs only that production-actuation interface. It does not rerun
the five passed arms, change their evidence, generate W/D/L, or select a policy
for strength.

## Fresh outcome-blind population

Use seed namespace base `4,277,500,000`. For country ordinal `c`, participant
slot `q`, and offset `o`, enumerate

$$
4{,}277{,}500{,}000 + 10{,}000c + 100q + o.
$$

Select the first exact west `(39,82)` versus east `(151,119)` case in each of
the 18 country/slot cells. Maximum offset is 99. Require 18 unique cases, two
per country, nine per slot, and zero updates. All original V6 and earlier seeds
are barred.

## Frozen repair arms

Run exactly two arms per case: 36 fixed-horizon traces.

1. `noop`: exact pinned external Supalosa with an empty lifecycle decorator.
2. `vehicle_idle_or_replace`: use the country tank (`MTNK` Allied, `HTNK`
   Soviet) only if returned by the vehicle queue's available objects.

The repaired arm performs:

- every 90 updates from 1,200 through 8,400, if the vehicle queue is idle,
  queue one intended tank;
- every 600 updates from 1,800 through 7,200, if the vehicle queue is active
  with a different item, unqueue one current item and queue one intended tank;
- if the queue is ready, paused, unavailable, or already contains the intended
  tank, leave it unchanged; and
- issue no overlay combat order.

When a 90-update idle check and 600-update replacement check coincide, perform
at most one mutation, preferring the idle rule. Never mutate structures,
armory, infantry, aircraft, or ship queues. Never pause or resume any queue.

## Fixed technical trace

Use the original V6 runtime, opponent, information boundary, player settings,
resignation suppression, and fixed horizon of 9,600 updates. Record the same
nine fixed snapshots, public-state hashes, action audit, unit availability,
production attempt reasons, mutation telemetry, queue states, and country-aware
tank counts.

If the engine finishes early, record only `earlyFinish=true` and fail
technically without orientation. Recursively prohibit W/D/L, result, score,
defeated side, endpoint orientation, terminal building count, or competitive
rank. The policy may not read the repair label or opponent identity.

## Frozen pass criteria

Analyze only after all 36 tasks and the fail-closed finalizer complete `0:0`.
The repair passes only if:

1. all traces reach update 9,600 with nine snapshots, no early finish, and no
   prohibited field;
2. exact country/slot coverage, unique scheduler IDs, `pi_jss233`, and all
   source/program/protocol/runtime/opponent/selection hashes pass;
3. no-op issues zero overlay production or combat action in 18/18 cases;
4. the intended tank is observed available in at least 16/18 repaired cases;
5. the repaired interface issues at least one intended production mutation in
   at least 12/18 cases;
6. repaired actions touch only `QueueType.Vehicles`, occur only in the frozen
   windows, contain an available country tank name/type, and never pause or
   resume a queue;
7. both arms issue zero overlay combat order in 18/18 cases;
8. repaired trace or action hash differs from paired no-op in at least 12/18
   cases; and
9. at update 9,600, paired intended-tank count has positive overall mean,
   nonnegative means for Allied, Soviet, slot 0, and slot 1, and a positive
   mean in at least one side and one slot stratum.

No criterion may be relaxed after traces. Report every case and technical
failure.

## Evidence and next decision

Use CPU `day`, at most 36 concurrent tasks, immutable completion markers, full
cell checksums, and an afterok finalizer. Do not retry, replace, or inspect
partial traces. Do not change tracked source while jobs run.

On pass, original V6 plus Amendment 1 jointly complete the production-interface
gate. Freeze a separate competitive protocol using only technically validated
mechanisms before generating endpoints.

On failure, preserve the result and exclude vehicle replacement from the next
method; do not repair it again before the paper's primary remaining experiments.
The already validated infantry and dual mechanisms remain technical facts, not
competitive evidence.
