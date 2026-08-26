# HFO RA2Web-Advanced early-production technical gate V6

Status: **prospectively frozen before V6 selection, traces, or competitive outcomes**

## Motivation and scope

V5 established exact no-op lifecycle decoration and perfect non-west isolation,
but its west-only unit-order overlay produced no west wins. In the balanced
Stage-2 population, 107 of 108 candidate west outcomes were unchanged and the
sole change was a draw. West losses ended around updates 26,100--28,700, while
the V5 candidates intervened only after a baseline force already existed.

V6 tests the next mechanism class without generating a competitive endpoint:
an early, west-only production overlay attached to the validated pinned
external Supalosa lifecycle. The gate asks whether the public interfaces can
reliably alter production, force composition, and early attack activation
across every country and both participant slots. It does not estimate strength
and cannot advance a paper claim.

No V5 championship or replication case is reused. The confirmed deployed
StrongBot Supalosa expert remains unchanged.

## Frozen identities and information boundary

- Map: `cd_chrono_4_heck_freezes_over_le.map`, SHA-256
  `e4dfc736a6355e0e68d4681e4d67419516e6bb94549e2d42880c9414e95e2e8d`.
- External Supalosa commit:
  `165b77a71d0cf5ebd27c65b19d0486bcbae78d0f`.
- RA2Web client commit/release:
  `218fb800614295119e25040986b175fee4c3670f`,
  `0.84.1-r1d35349-dd6a17b9c`.
- RA2Web Advanced bundle SHA-256:
  `81d8797b6dd1371ba2dcbd79e25df8b42254290c820159e121a82650fd97a143`.
- RA2Web freeze-manifest SHA-256:
  `a405c0fc6d1d6541f965582c9b53be0bfd01c0c68f4d0f340e1a5ae37671aa5d`.
- Countries: all nine HFO countries; candidate physical start west `(39,82)`,
  opponent physical start east `(151,119)`; both participant slots.

The overlay may use only:

- the candidate's own `ProductionApi` queue states and available objects;
- the candidate's own `ActionsApi`;
- own visible units and visible enemy units through `GameApi`;
- current update, own credits, and public player start locations; and
- country only to map an Allied or Soviet unit name.

It may not read opponent identity, bundle metadata, hidden source state,
competitive endpoints, W/D/L, score, terminal orientation, or future state.
The evaluator may collect fixed-update technical state but must not expose it
to the policy.

## Outcome-blind selection

Use namespace base `4,277,000,000`. For country ordinal `c`, participant slot
`q`, and offset `o`, enumerate

$$
4{,}277{,}000{,}000 + 10{,}000c + 100q + o.
$$

Select the first exact west-versus-east case in each country/slot cell. Require
18 unique cases, two per country and nine per slot, with zero updates. Maximum
offset is 99. The selector must emit no competitive or terminal field. All V3,
V4, V5, and reserved V5 championship/replication seeds are barred.

## Country-aware unit map

The production overlay uses only these basic units:

| Side | Infantry | Tank |
|---|---|---|
| Allied | `E1` | `MTNK` |
| Soviet | `E2` | `HTNK` |

A requested unit must appear in `ProductionApi.getAvailableObjects()` for its
canonical queue before any mutation. The overlay may never manufacture a
rules object or submit an unavailable name/type pair.

## Frozen technical arms

Run six arms on each of the 18 selected cases: 108 fixed-horizon traces.

1. `noop`: exact external baseline with an empty lifecycle decorator.
2. `infantry_rush`: from update 1,200 through 8,400, queue the country infantry
   when the infantry queue is idle; from update 4,800, attack with at least four
   non-dog combatants using force-first targeting.
3. `tank_rush`: from update 1,200 through 8,400, queue the country tank when the
   vehicle queue is idle; from update 6,000, attack with at least three
   non-dog combatants using force-first targeting.
4. `dual_rush`: apply both idle-queue production rules; from update 6,000,
   attack with at least five non-dog combatants using force-first targeting.
5. `tank_production_only`: apply the `tank_rush` production rule but issue no
   overlay combat order. This isolates production from targeting.
6. `vehicle_focus`: from update 1,800 through 7,200, at most once per 600
   updates, replace a different active vehicle-queue item with the available
   country tank; leave an already queued tank unchanged. From update 7,200,
   attack with at least four non-dog combatants using production-first
   targeting.

Idle production checks occur every 90 updates. Attack checks occur every 24
updates. A production mutation after update 8,400, an attack order before its
arm threshold, any mutation to structures/armory/aircraft/ship queues, or any
mutation outside west-versus-east HFO is a technical failure.

`force_first` attacks the nearest visible combatant, then a visible
construction yard or production building, then the nearest visible building;
if none is visible, it attack-moves to the public opponent start.
`production_first` reverses the first two target classes. Unit and target ties
are resolved by numeric ID. Dogs and harvesters are excluded from overlay
attackers.

## Fixed trace and prohibited fields

Every trace runs exactly 9,600 updates. This is well before the complete V5
west median terminal range. If the engine finishes before the horizon, the
trace fails technically; the collector records only `earlyFinish=true` and no
winner, defeated side, endpoint orientation, terminal building count, or score.

At updates 0, 1,200, 2,400, 3,600, 4,800, 6,000, 7,200, 8,400, and 9,600,
record:

- own credits;
- own counts of infantry, tanks, dogs, other combatants, harvesters, and
  production buildings;
- visible enemy combatant count;
- infantry and vehicle queue status and queued rule names; and
- a canonical normalized public-state SHA-256.

Record append-only overlay telemetry for:

- availability checks by intended unit/queue;
- accepted and rejected production attempts with update and reason;
- calls to queue, unqueue, pause, and resume, intercepted at `ActionsApi`;
- attack activation checks and reasons;
- issued attacker IDs, order type, and target class; and
- explicit assertions that prohibited queues were untouched.

The trace artifact schema prohibits `winner`, `loser`, `result`, `score`,
`wins`, `draws`, `losses`, `defeated`, endpoint orientation, terminal building
counts, or any competitive rank. The finalizer rejects these keys recursively.

## Frozen technical analyses

Analyze only after all 108 tasks and the fail-closed finalizer complete `0:0`.
Report country/slot coverage, exact trace lengths, early-finish count, telemetry
counts, fixed-update force compositions, queue-state transitions, action-call
hashes, and paired arm-minus-noop composition differences. Do not report a
competitive outcome or call any arm stronger.

The complete gate passes only if:

1. all 108 traces reach update 9,600 with no early finish or prohibited field;
2. all traces have the exact source/runtime/opponent/protocol/selection hashes
   and unique scheduler IDs under `pi_jss233`;
3. `noop` has zero overlay mutation or attack event in 18/18 cases;
4. every production arm observes its intended unit as available in at least
   16/18 cases and executes at least one intended production mutation in at
   least 12/18 cases;
5. every attack-enabled arm executes at least one on-time attack order in at
   least 12/18 cases;
6. `tank_production_only` executes zero overlay attack order in 18/18 cases;
7. no arm mutates a prohibited queue or acts outside its frozen update window;
8. each intervention arm differs from `noop` in its normalized trace or action
   hash in at least 12/18 paired cases; and
9. at update 9,600, at least one production arm has a positive mean paired
   difference in intended-unit count, with the direction present in both
   Allied and Soviet strata and both slots.

These are interface and mechanism checks, not efficacy selection. Every arm's
technical result is reported; a pass does not identify a competitive winner.

## Scheduler and evidence contract

Use only `pi_jss233`, CPU `day`, one task per trace, and at most 64 concurrent
tasks. Bind selection, cells, and finalizer to clean synchronized `main`, exact
program/script/protocol/runtime/opponent hashes, immutable completion markers,
and complete `sacct` accounting. Do not retry or replace a failed trace. Do not
change tracked source while source-bound jobs run.

## After the gate

On pass, freeze a separate V6 competitive-development protocol before running
any endpoint. That protocol may include only technically active mechanisms and
must prespecify its full candidate space, fresh disjoint cases, multi-stage
selection, paired uncertainty, absolute win gate, country/faction/start/slot
safety, non-west isolation, championship, and replication.

On failure, preserve the complete technical result and repair only the failed
interface prospectively. Do not infer strength from fixed-update composition,
do not inspect the sealed V5 championship/replication populations, and do not
run competitive V6 outcomes.
