# Mission-Native Closeout Amendment 39: V30 Failure and V31 Queue-Safe Focus

Recorded: 2026-08-14 (America/New_York)

Status: **V30 advancement stopped; prospective V31 technical repair frozen
before any V31 gameplay**

## V30 all-country gate reconciliation

The outcome-blind V30 all-country gate ran exactly once as Slurm job
`22245219` under account `pi_jss233` from clean `main` commit
`d217d25e34302385bdb802b313190bba617d660a` against the clean external
Supalosa baseline at commit
`165b77a71d0cf5ebd27c65b19d0486bcbae78d0f`.

Scheduler evidence:

- job: `22245219` (`chrono-closeout-all-v30`);
- state: `FAILED`;
- exit code: `1:0`;
- elapsed: `00:10:19`;
- account: `pi_jss233`; and
- maximum resident memory observed for the batch step: `513880K`.

The fail-closed runner completed all 72 predeclared outcome-free traces and
preserved:

- artifact:
  `/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/mission-native-closeout/outcome-blind-all-country-gate-v30/22245219/all-country-gate-v30.json`;
- artifact SHA-256:
  `37777e85191e01b356d53231a9dee19cdea7e3d7e239fb5033676d8f4fc5ebed`;
- status: `FAIL_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_ALL_COUNTRY_GATE_V30`; and
- no `COMPLETE` marker.

No winner, score, candidate score, or sealed-family outcome was computed or
serialized. No V30 row may be selectively rerun, and no V30 outcome screen may
launch.

## What V30 established technically

The complete matrix verified the intended safety repair:

- direct external Supalosa and the disabled V30 adapter were exactly equal in
  every country-slot cell;
- enabled repeats were exact in every cell;
- all direct, disabled, enabled, and repeat traces recorded zero resignation
  attempts;
- V30 emitted zero destructive production-reservation events; and
- every Soviet cell evaluated `NAHAND` screen infrastructure and observed it
  physically present.

Thus the V29 resignation failure did not recur, and the side-correct Soviet
infrastructure path was present. These are technical facts, not gameplay-effect
claims.

## Outcome-free failure evidence

Across the 18 country-slot cells, V30 recorded:

- 1,821 preterminal composition-blocked evaluations;
- three certified launches and three handoffs;
- one post-block conversion to physical building damage;
- 330 hit points of enemy-building damage;
- 418 screen-infrastructure events, including physical `GAPILE` or `NAHAND`
  readiness in both factions; and
- zero destructive reservation events.

The global conversion breadth checks failed for Allied rows and candidate slot
1. The principal per-row failure was failure to acquire the requested physical
main battle tank by tick 5,400.

Telemetry shows a common resource-starvation mechanism. The desired `MTNK` or
`HTNK` entered the active vehicle queue (typically by tick 3,444 for Allied or
3,276 for Soviet), but credits subsequently reached zero while the same tank
remained queued through the end of the trace. Removing V29's destructive
reservation restored ordinary concurrent Supalosa production, but the normal
priority-140 tank request did not concentrate enough spending to finish the
activation certificate reliably.

The gate also required at least one Soviet request to construct a missing
`NAHAND`. That exposure condition was not met because every fresh-seed Soviet
row already had a physical `NAHAND`. Requiring an unnecessary build request is
not a faction-completeness criterion. V30 remains failed as frozen; this
criterion is corrected only prospectively in V31.

## Frozen V31 repair

V31 retains V30 exactly and adds one production mechanism:

1. apply priority 1,000 only to a currently buildable missing certificate
   component whose queue is idle or whose current queue head is already that
   exact component;
2. focus the first main battle tank before a missing infantry screen;
3. require physical side-correct screen infrastructure before tank focus;
4. return to the ordinary priority immediately once the one-tank-plus-screen
   certificate is satisfied; and
5. never raise focus priority against a different queue head, never delete a
   production request, and never cancel a queued item.

This uses Supalosa's existing queue weighting to pause lower-weight concurrent
production reversibly while the already-selected certificate item completes.
The queue-head guard prevents the focus request from triggering Supalosa's
two-times-priority cancellation rule against unrelated work.

V31 also validates screen sufficiency rather than demanding an unnecessary
request: a screen passes if it is already sufficient before the first tank or
if a side-correct screen request begins after the factory and before the tank.
Screen infrastructure passes when the side-correct structure is either already
physical or prospectively requested.

V31 is frozen before gameplay at fresh engine-seed base `4_294_000_000`.

## V31 outcome-blind all-country gate

The next technical gate remains a complete 72-trace matrix:

- all nine countries and both reciprocal candidate slots;
- direct external Supalosa, disabled V31, enabled V31, and exact enabled
  repeat;
- 5,400 ticks per trace;
- no resignation forwarding;
- no outcome calculation or serialization; and
- Slurm account `pi_jss233` only.

It additionally requires valid schema-25 queue-safe focus telemetry and active
focus coverage across both factions and both slots. It retains exact-control,
repeat, zero-resignation, zero-reservation, side-correct infrastructure,
composition-block exposure, certified handoff, and physical building-damage
breadth requirements. Any failure preserves the entire artifact and stops
advancement.
