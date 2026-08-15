# Mission-Native Closeout Amendment 40: V31 Failure and V32 Exclusive Focus

Recorded: 2026-08-14 (America/New_York)

Status: **V31 advancement stopped; prospective V32 technical repair frozen
before any V32 gameplay**

## V31 all-country gate reconciliation

The outcome-blind V31 all-country gate ran exactly once as Slurm job
`22247005` under account `pi_jss233` from clean `main` commit
`a76107bbec8efe7f3592112e1f4d206d300937ff` against the clean external
Supalosa baseline at commit
`165b77a71d0cf5ebd27c65b19d0486bcbae78d0f`.

Scheduler evidence:

- job: `22247005` (`chrono-closeout-all-v31`);
- state: `FAILED`;
- exit code: `1:0`;
- elapsed: `00:10:09`;
- account: `pi_jss233`; and
- maximum resident memory observed for the batch step: `520448K`.

The fail-closed runner completed all 72 predeclared outcome-free traces and
preserved:

- artifact:
  `/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/mission-native-closeout/outcome-blind-all-country-gate-v31/22247005/all-country-gate-v31.json`;
- artifact SHA-256:
  `7841377b5b1725e3d3a746b1fe62b44bd5fd1566b3c39bb5ce588e2e466b066d`;
- status: `FAIL_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_ALL_COUNTRY_GATE_V31`; and
- no `COMPLETE` marker.

No winner, score, candidate score, or sealed-family outcome was computed or
serialized. No V31 row may be selectively rerun, and no V31 outcome screen may
launch.

## Complete technical evidence

Across the 18 country-slot cells, V31 recorded:

- 1,817 preterminal composition-blocked evaluations;
- 1,100 production-focus events, of which 591 were active;
- zero destructive production-reservation events;
- four certified launches and four handoffs;
- three post-block conversions to physical building damage; and
- 1,078 hit points of enemy-building damage.

Direct external Supalosa and disabled V31 remained exactly equal in every
cell. Enabled repeats were exact, and all four trace variants recorded zero
resignation attempts. These are technical facts, not gameplay-effect claims.

Only four cells passed every row-level assertion. Eleven cells never acquired
a physical `MTNK` or `HTNK` by tick 5,400. Three additional cells acquired a
tank but entered a legitimate blocked recovery state after every compatible
predecessor combatant had been destroyed; the V31 validator incorrectly
treated a zero-predecessor blocked state as invalid even though no launch or
handoff occurred. The global breadth failures were:

- Allied rows never converted a composition block into certified building
  damage; and
- candidate-slot-1 rows never converted a composition block into certified
  building damage.

## Root cause in the queue scheduler

V31 correctly raised the already-selected tank queue head to priority 1,000,
but priority weighting did not provide exclusive spending. Supalosa's queue
controller pauses a low-weight active queue only when that queue's preferred
decision is the same item as its current production head. When they differ,
the controller considers cancellation but never pause. Complete V31 snapshots
therefore show structure and infantry queues remaining active while the tank
queue is active, credits reach zero, and the same tank remains queued.

Increasing the request weight alone cannot repair that branch. The missing
interface is reversible, queue-wide spending focus that preserves every queued
item.

## Frozen V32 repair

V32 retains V31 and adds one scheduler mechanism:

1. raise the guarded certificate request to the reserved exclusive priority
   10,000;
2. recognize exclusive focus only when exactly one production queue has a
   request at or above that threshold;
3. while focus is active, pause every other active queue and do not start an
   unrelated idle queue;
4. leave already-completed ready items available for normal completion or
   placement;
5. never cancel, dequeue, delete, or replace any queued item; and
6. resume ordinary Supalosa scheduling immediately when the focused physical
   tank or screen is acquired, becomes unavailable, or otherwise ceases to be
   requested at the exclusive priority.

The existing V31 buildability, physical screen-infrastructure, and exact
queue-head guards remain mandatory. Tank focus still precedes missing-screen
focus, and only one certificate component can be exclusive at a time.

V32 also corrects one validation assertion prospectively. A preterminal
evaluation may remain blocked with zero active predecessor combatants while
the certificate force recovers. This relaxation applies only to a blocked,
no-launch state. Composition readiness, route feasibility, launch, handoff,
and physical-damage assertions are unchanged.

V32 is frozen before gameplay at fresh engine-seed base `4_294_500_000`.

## V32 outcome-blind all-country gate

The next technical gate remains a complete 72-trace matrix:

- all nine countries and both reciprocal candidate slots;
- direct external Supalosa, disabled V32, enabled V32, and exact enabled
  repeat;
- 5,400 ticks per trace;
- no resignation forwarding;
- no outcome calculation or serialization; and
- Slurm account `pi_jss233` only.

It requires the exclusive priority-10,000 telemetry, exact controls and
repeats, zero destructive reservations, side-correct infrastructure, physical
tank acquisition, certified handoff, and post-block building-damage breadth
across factions and slots. Any failure preserves the complete artifact and
stops advancement.
