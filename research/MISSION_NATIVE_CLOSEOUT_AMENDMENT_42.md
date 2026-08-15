# Mission-Native Closeout Amendment 42: V33 Complete Evidence and V34 Objective-Race Allocation

Recorded: 2026-08-15 (America/New_York)

Status: **V33 advancement stopped; prospective V34 repair frozen before any V34 gameplay**

## V33 all-country gate reconciliation

The outcome-blind V33 all-country gate ran exactly once as Slurm job `22258845`
under account `pi_jss233` from clean `main` commit
`bbd81ce950313de30c1fc4406524cf36dbb87809` against the clean external Supalosa
baseline at commit `165b77a71d0cf5ebd27c65b19d0486bcbae78d0f`. The
external runtime tree contained 172 files and had SHA-256
`34349919500c8019f9d9b1c2b2a7e2269dd57dde6b3414216bb6336e02977199`.

Scheduler evidence:

- job: `22258845` (`chrono-closeout-all-v33`);
- state: `FAILED`;
- exit code: `1:0`;
- elapsed: `00:12:43`;
- account: `pi_jss233`; and
- maximum resident memory observed for the batch step: `515624K`.

The fail-closed runner completed all 72 predeclared traces and preserved:

- artifact:
  `/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/mission-native-closeout/outcome-blind-all-country-gate-v33/22258845/all-country-gate-v33.json`;
- artifact SHA-256:
  `1b34508cfea61fb7f014edd8f5ed485af4f9162209abacde48beb892be325e0a`;
- status: `FAIL_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_ALL_COUNTRY_GATE_V33`; and
- no `COMPLETE` marker.

No winner, score, candidate score, or sealed-family outcome was computed or
serialized. Direct external and disabled-V33 traces were exactly equal in all 18
country-slot cells, enabled repeats were deterministic in every cell, and every
recorded resignation-attempt count was zero. No V33 cell may be selectively
rerun, and no V33 outcome screen may launch.

## What V33 established

The external queue-controller adapter executed at runtime:

- 332 schema-26 scheduler events;
- 52 paused nonfocused queues and 1,608 deferred nonfocused queue observations;
- queue-focus execution across Allied and Soviet countries and both reciprocal
  candidate slots; and
- zero destructive production-reservation events.

Compared with the prior outcome-blind V32 gate, physical capability breadth and
objective contact increased materially as technical measurements:

- cells acquiring a certified launch increased from 5 of 18 to 13 of 18;
- cells converting a composition block into building damage increased from 1
  to 8; and
- aggregate enemy-building damage increased from 374 to 4,838 hit points.

These are outcome-free mechanism facts. They are not estimates of win rate and
do not establish that V33 is competitively stronger than Supalosa.

## Complete V33 failure pattern

Five Soviet-side cells failed the same prespecified validation:

- Africans, candidate slot 0;
- Arabs, candidate slots 0 and 1;
- Confederation, candidate slot 1; and
- Russians, candidate slot 1.

Every failed cell produced one objective-feasible, composition-ready launch and
one complete launch handoff, but zero physical enemy-building damage by tick
5,400 in both deterministic enabled traces. The failure is therefore downstream
of production and mission transfer.

The failed cells shared one trace class. At launch they assigned 16 or 17
compatible attackers to a visible barracks, observed 21 route threats, selected
`route_interception_wins`, and sent every assigned attacker to successive
infantry blockers. They recorded zero building attackers during this phase, six
target-stall events, and only began returning attackers to the building near the
end of the trace. Matched successful Soviet cells launched into the reciprocal
geometry, retained a building strike, and recorded physical building progress.

Thus V33 repaired the external production boundary but exposed an all-force
blocker-allocation defect. Producing more tanks or changing queue focus again is
not the indicated repair.

## Frozen V34 repair

V34 inherits the complete V33 policy and changes only objective allocation:

1. change `engagementAllocationMode` from `allBlocker` to `boundedScreen`;
2. while a relevant blocker is selected, allocate at most half of compatible
   attackers to that blocker and retain at least half on the building mission;
3. when exactly one enemy building remains and the building strike is feasible,
   label it as the terminal objective and assign the full compatible force to
   the building; and
4. when a relevant force can prevent the terminal strike, retain the bounded
   minimum-clearance screen and keep the remainder advancing on the building.

The exact external Supalosa bot, external default strategy, V33 exclusive queue
adapter, production focus, readiness construction, activation thresholds,
target ranking, route model, and every other inherited field remain unchanged.
V34 does not yet add a no-progress deadline or predecessor fallback; those are a
separate liveness ablation after allocation is established.

Schema-27 `objective_race_allocation` telemetry must match every live
schema-4 allocation event. It records remaining enemy-building count, terminal
state, allocation mode, blocker identity, and the building/blocker partition.
The validator requires:

- exact partition of assigned attackers;
- `boundedScreen` execution;
- at most half of attackers on a selected blocker;
- at least half continuing toward the building; and
- all compatible attackers on a feasible terminal building strike.

Pure tests include a last-building case with 100 off-route tanks and a distinct
case in which a lethal route blocker must receive a bounded screen.

## V34 advancement rule

V34 uses a new engine-seed base, `4_294_800_000`, and reruns the complete
72-trace all-country, reciprocal-slot matrix. It must preserve exact disabled
identity, determinism, zero resignations, runtime queue-adapter proof, and all
previous V33 breadth requirements. In addition, objective-race allocation and
bounded blocker clearance must execute across both factions and both candidate
slots, and every objective-feasible launch must produce physical building
damage.

Any failure preserves the complete outcome-free artifact and stops advancement.
Only a complete V34 pass may justify freezing the separate progress-deadline
liveness repair; no outcome-bearing development screen or confirmatory family is
opened by this amendment.
