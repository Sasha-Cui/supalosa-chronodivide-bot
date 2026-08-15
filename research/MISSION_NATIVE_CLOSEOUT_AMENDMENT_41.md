# Mission-Native Closeout Amendment 41: V32 Boundary Failure and V33 External Adapter

Recorded: 2026-08-14 (America/New_York)

Status: **V32 advancement stopped; prospective V33 technical repair frozen
before any V33 gameplay**

## V32 all-country gate reconciliation

The outcome-blind V32 all-country gate ran exactly once as Slurm job
`22254715` under account `pi_jss233` from clean `main` commit
`760b87a0c98bda24195cfb2077a87ccb37f472f7` against the clean external
Supalosa baseline at commit
`165b77a71d0cf5ebd27c65b19d0486bcbae78d0f`.

Scheduler evidence:

- job: `22254715` (`chrono-closeout-all-v32`);
- state: `FAILED`;
- exit code: `1:0`;
- elapsed: `00:11:30`;
- account: `pi_jss233`; and
- maximum resident memory observed for the batch step: `526536K`.

The fail-closed runner completed all 72 predeclared outcome-free traces and
preserved:

- artifact:
  `/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/mission-native-closeout/outcome-blind-all-country-gate-v32/22254715/all-country-gate-v32.json`;
- artifact SHA-256:
  `d7d3441ef6e5e5a20677c573511d23244f8a31ed13d8206e53cf00aa0fe6a061`;
- status: `FAIL_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_ALL_COUNTRY_GATE_V32`; and
- no `COMPLETE` marker.

No winner, score, candidate score, or sealed-family outcome was computed or
serialized. No V32 row may be selectively rerun, and no V32 outcome screen may
launch.

## Complete technical evidence

Across the 18 country-slot cells, V32 recorded:

- 1,454 preterminal composition-blocked evaluations;
- 1,095 production-focus events, of which 572 were active;
- zero destructive production-reservation events;
- four certified launches and four handoffs;
- one post-block conversion to physical building damage; and
- 374 hit points of enemy-building damage.

Direct external Supalosa and disabled V32 remained exactly equal in every cell.
Enabled repeats were exact, and every trace recorded zero resignation attempts.
These are technical facts, not gameplay-effect claims.

Only five cells acquired a physical `MTNK` or `HTNK` by tick 5,400. The global
breadth failures were:

- Allied rows never converted a composition block into certified building
  damage; and
- candidate-slot-1 rows never converted a composition block into certified
  building damage.

## Root cause at the package boundary

V32 implemented exclusive focus in the queue controller of the local modified
bot package. The candidate is deliberately instantiated from the clean external
Supalosa package so that every behavior outside the additive mission remains
the pinned comparator. That external bot constructs its own external queue
controller. Consequently, V32's local scheduler repair never executed in the
candidate.

The complete V32 runtime snapshots confirm the boundary failure: nonfocused
queues continued active while the schema-25 mission request reported an
exclusive priority of 10,000. This is an implementation-interface failure, not
evidence against the proposed spending-focus mechanism. Replacing the external
bot or copying the whole local queue controller would contaminate the comparator
with unrelated local changes and is therefore prohibited.

## Frozen V33 repair

V33 retains the exact V32 mission policy and adds only a narrow adapter around
the queue controller instantiated from the clean external package:

1. load the external Supalosa `QueueController` from the same pinned package as
   the external bot and strategy;
2. activate the adapter only while exactly one guarded mission request has the
   reserved priority 10,000;
3. let the external delegate operate normally on the focused queue and on
   completed ready items;
4. suppress start, resume, pause, or cancellation mutations directed at every
   nonfocused queue during that update;
5. pause any nonfocused queue that was active at the start of the update;
6. never dequeue or replace an existing item; and
7. return the original context to the unmodified external delegate immediately
   when the guarded focus request disappears.

V33 adds schema-26 runtime telemetry identifying the focused queue and request,
its status, and the complete partition of nonfocused queues into paused,
deferred, and ready sets. The gate must match each schema-26 event to the current
schema-25 mission focus from the same 300-tick telemetry-heartbeat interval.
Thus source presence is insufficient: the artifact must prove that the adapter
actually executed in the external bot.

The direct external and disabled-V33 traces must remain byte-for-byte equivalent
under the established outcome-free digest. V33 is frozen before gameplay at
fresh engine-seed base `4_294_750_000`.

## V33 advancement rule

The V33 gate remains the complete 72-trace all-country, reciprocal-slot matrix
with no outcome computation. In addition to the V32 requirements, every enabled
row must contain valid schema-26 adapter proof, and execution breadth must cover
both factions and both candidate slots. Any failure preserves the complete
artifact and stops advancement. Only a complete pass may unlock a newly frozen
open-development outcome screen on another fresh seed domain.

The broader objective-race successor remains separate. It may rank complete
building missions, bypass off-route forces on the literal final building, and
clear only necessary blockers, but it must not be combined with this technical
queue-boundary repair before V33 establishes its intended mechanism.
