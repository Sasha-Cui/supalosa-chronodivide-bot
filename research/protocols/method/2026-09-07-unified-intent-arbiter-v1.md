# Unified intent arbiter V1 technical protocol

Frozen: 2026-09-07, after the complete outcome-blind action-burst diagnostic
and before arbiter implementation or any arbiter competitive endpoint.

## Evidence that fixes this design

The complete action-burst diagnostic is preserved in:

research/results/2026-09-07-action-burst-diagnostic-v1-complete.md

Its aggregate SHA-256 is
d56b069aff40c7890c5f9cd4552b1ae42392a625cd97b7d7a34ecd7aa9208b0b.
The maximum live rolling-900 gameplay-nonorder count was 31, so the frozen
maximum-plus-four reserve is 35. The candidate made 437,934 order requests and
its largest rolling-900 order burst was 2,492. This protocol addresses request
conflicts and repetition; those observations do not establish a causal
performance effect.

## Purpose and nonclaims

V1 will:

1. collect every StrongBot order intent at one deterministic policy boundary;
2. resolve competing intents once per engine update and once per owned unit;
3. preserve essential non-order actions while bounding order traffic;
4. retain deferred intents, revalidate them, and retry them deterministically;
5. expose bounded technical telemetry;
6. reuse the existing certified final-building race machinery; and
7. support symmetric API-full-state and fog-respecting evaluation views.

V1 does not assume that fewer requests improve strength. It does not authorize
competitive outcomes. It does not change the deployed default. The arbiter
remains disabled unless an experiment explicitly enables it.

## Frozen action-site inventory

StrongBot currently contains exactly 52 direct orderUnits sites in 29 routines:

| Routine | Sites | Semantic scope |
|---|---:|---|
| maybeOtmqFinalSweep | 1 | objective_closeout |
| orderOtmqNeCleanup | 1 | inherited objective_closeout |
| orderOtmqFullMapCleanup | 1 | inherited objective_closeout |
| maybeHfoBottomChokeIntercept | 1 | emergency_defense |
| maybeHfoBottomSiegeControl | 3 | emergency_defense |
| maybeHfoBottomTopBaseBreak | 1 | tactical_assault |
| maybeHfoBottomHomeGuard | 2 | home_guard |
| maybeHfoWestHomeGuard | 1 | home_guard |
| orderWeakStartHomeGuardUnits | 1 | inherited home_guard |
| maybeWeakStartCloseout | 2 | objective_closeout |
| maybePeakCloseout | 1 | objective_closeout |
| maybeHfoSideCloseout | 1 | objective_closeout |
| maybeHfoBottomRetarget | 1 | objective_closeout |
| maybeHfoWestRetarget | 1 | objective_closeout |
| maybeHfoBottomPincer | 2 | tactical_assault |
| orderPincerGroupToWaypoint | 1 | inherited tactical_assault |
| orderBottomDemolitionRoute | 1 | inherited tactical_assault |
| prepareUnitsForAttackMove | 1 | inherited caller scope |
| orderPreparedUnitsToNearestTargets | 2 | inherited caller scope |
| orderGenericCloseoutTargets | 1 | inherited objective_closeout |
| orderHfoBottomMopUpTargets | 2 | inherited objective_closeout |
| executeStagedSweep | 4 | inherited route_sweep or tactical_assault |
| maybeHfoCloseout | 3 | objective_closeout |
| maybeEmergencyDefend | 2 | emergency_defense |
| maybeRouteAttack | 4 | route_sweep |
| maybeHarvesterHarass | 2 | harassment |
| maybeHarass | 2 | harassment |
| maybeIslandTechAttack | 3 | tactical_assault |
| maybeForceAttack | 4 | tactical_assault |

The wrapper around super.onGameTick supplies baseline_core scope to all
ancestral Supalosa and ordinary mission-controller orders. Building-elimination
completion-race BatchableActions receive terminal_objective explicitly before
ActionBatcher resolution. An enabled StrongBot order emitted outside one of
these scopes is a technical failure. A source audit must continue to find
exactly 52 sites and 29 routines until an amendment deliberately updates this
inventory.

The top-level onGameTick invocations receive these frozen scopes:

- terminal_objective: maybeWonGameCloseout,
  maybeHfoBottomLastBuildingCleanup, and maybeHfoFinalBuildingAttack;
- emergency_defense: maybePeakEmergencyDefend, maybeEmergencyDefend,
  maybeHfoBottomChokeIntercept, and maybeHfoBottomSiegeControl;
- home_guard: maybeHfoBottomHomeGuard, maybeWeakStartHomeGuard, and
  maybeHfoWestHomeGuard;
- objective_closeout: maybeHfoBottomRetarget, maybeHfoWestRetarget,
  maybeHfoBottomCriticalCleanup, maybeOtmqFinalSweep,
  maybeWeakStartCloseout, maybePeakCloseout, maybeHfoSideCloseout,
  maybeHfoBottomDesperationFinish, maybeHfoLateMopUp,
  maybeHfoBottomCloseout, and maybeHfoCloseout;
- tactical_assault: maybeWeakStartProxyAttack,
  maybeHfoBottomTopBaseBreak, maybeHfoBottomWestExpansionAttack,
  maybeHfoBottomPincer, maybeHfoBottomDemolition, maybeIslandTechAttack,
  maybeWeakStartPressure, and maybeForceAttack;
- route_sweep: maybeHfoWestSweep, maybeHfoEastSweep,
  maybeHfoBottomSweep, and maybeRouteAttack; and
- harassment: maybeHarvesterHarass and maybeHarass.

Helper calls inherit the active top-level scope. prepareUnitsForAttackMove,
orderPreparedUnitsToNearestTargets, executeStagedSweep, and other shared
helpers therefore need no target- or map-based scope inference. The two
sequential non-returning harassment calls and route call retain distinct
scopes inside the same update. The finally flush resolves their unit overlap
with the later tactical-assault proposal without relying on JavaScript call
order across priority classes.

## Scope priorities, retry, and persistence

Higher numeric priority wins per unit. A later sequence wins only within the
same priority. The fixed values are:

| Scope | Priority | Identical retry ticks | Pending TTL ticks |
|---|---:|---:|---:|
| terminal_objective | 700 | 1 | 360 |
| emergency_defense | 600 | 3 | 90 |
| home_guard | 550 | 6 | 120 |
| objective_closeout | 500 | 6 | 360 |
| tactical_assault | 400 | 12 | 240 |
| route_sweep | 300 | 30 | 600 |
| harassment | 200 | 60 | 180 |
| baseline_core | 100 | 30 | 240 |

For each owned unit, the arbiter compares the current-update proposals with
any unexpired deferred winner. Higher priority wins; equal priority uses the
larger proposal sequence; exact ties use the canonical intent signature.
Lower-priority proposals cannot replace an unexpired higher-priority deferred
intent. A newly accepted intent supersedes the previous pending entry.

An intent identical to the last forwarded intent for that unit is suppressed
until its scope retry interval expires. A changed target, changed order type,
changed tile, changed bridge flag, or higher semantic priority is not
identical. Suppression and deferral are distinct telemetry events.

## Canonical intent

Each proposal contains:

- engine update;
- monotonically increasing within-update sequence;
- semantic scope and priority;
- sorted unique unit IDs;
- OrderType;
- exactly one overload: no target, object target, or tile target;
- object ID or integer tile coordinates and bridge flag;
- canonical SHA-256 signature.

The proposal contains no hidden state and no outcome. Raw arrays are bounded
to 4,096 requested IDs at ingestion; larger requests fail technically.

At flush time, each selected unit must still exist, have positive hit points,
and be owned by the bot player. Duplicate, missing, dead, or foreign selected
IDs are removed and counted. An object target must still exist and, when it
has hit points, be alive. A tile target must resolve through map.getTile.
Target ownership relationship is recorded and validated for type safety but
is not used to invent a different target. If validation removes every selected
unit or invalidates the target, the intent is discarded rather than retargeted.

## Resolution and forwarding

Resolution happens in a finally block after StrongBot and ancestral logic for
the update, including updates that return early from an exact-map tactic.

1. Expand proposals to unit-intent pairs.
2. Merge unexpired pending entries.
3. validate units and targets against the current public GameApi view.
4. choose one winner per owned unit using the frozen priority rule.
5. suppress winners identical inside their retry interval.
6. group remaining winners by canonical order type, overload, target, bridge
   flag, scope, and priority.
7. sort groups by descending priority then canonical signature.
8. sort unit IDs ascending within each group.
9. split every group into chunks of at most 128 unit IDs.
10. forward chunks while the rolling budget permits; retain unforwarded
    unit-intent pairs until expiry.

No unit may be forwarded more than once in an update. Forwarded chunks are
stable under input permutation. The arbiter never chooses a target, creates a
new order, or changes order semantics.

## Rolling action budget

The total ceiling C is one of the prespecified values 75, 150, or 300 per
rolling 900 live updates. The gameplay-nonorder reserve R is fixed at 35.
Therefore the order caps are 40, 115, and 265.

At update t, the history window is the inclusive set t-899 through t. Before
forwarding an order chunk, both conditions must hold:

- total forwarded public action calls in the window would not exceed C; and
- forwarded order calls in the window would not exceed C-R.

Every ActionsApi method is observed at the central wrapper. Gameplay-nonorder
calls are safety-preserving and forward immediately. Consecutive
queue/unqueue/pause/resume calls within an update form one recorded production
batch, and the arbiter never partially suppresses or defers such a batch.
Suppressed quit is not part of deployed behavior: a real quit request forwards
immediately and is counted.

Debug and communication calls are best effort. Exact same-update duplicates
are coalesced, and they do not consume the reserved 35 gameplay-nonorder
positions. They forward only when doing so preserves both the total ceiling
and reserve.

If essential gameplay-nonorder calls alone exceed R or total forwarded calls
exceed C, the actions still forward, a safety-overflow invariant is recorded,
and the technical gate fails. The implementation must never silently drop a
production, placement, sale, repair, alliance, superweapon, or quit action to
make a ceiling appear valid.

## Existing ActionBatcher

ActionBatcher remains an upstream optimization but is no longer the final
conflict authority. Its BatchableAction gains an optional semantic scope with
baseline_core as the default. It must preserve scope when grouping. The
building-elimination completion-race path marks its attack and move actions
terminal_objective. All other existing missions retain baseline_core in V1.

The unified wrapper performs the final per-unit arbitration across both
ActionBatcher output and the 52 direct StrongBot sites.

## Certified final-building race

V1 reuses the tested functions in buildingEliminationMission:

- chooseBuildingEliminationEngagement;
- applyTerminalBuildingPriority;
- allocateBuildingEliminationEngagement; and
- updateBuildingEliminationObjectiveProgress.

The enabled research policy uses engagementMode completionRace,
engagementAllocationMode boundedScreen, terminalBuildingPriority true, and
physical progress deadlines. When exactly one enemy building remains and its
estimated completion precedes force destruction, terminal priority removes
the blocker and sends the complete compatible force to the building. This
includes the existing test with one building and 100 off-route tanks. If a
blocker can prevent completion, only the bounded screen is assigned to it.

Terminal state is recomputed each update. If the target disappears, changes
owner, dies, becomes invalid, or the enemy building count is no longer one,
terminal scope is revoked in that same update and all pending terminal intents
for the stale target are deleted. Building or blocker damage and destruction
are the only progress certificates. Target switching alone is not progress.

Pure tests must cover the one-building/100-tank bypass, lethal blocker screen,
one-to-two-building immediate revocation, owner change, target destruction,
damage deadlines, and stale pending-intent removal.

## Symmetric observation firewall

Every later evaluation declares one of two modes:

- api_full_state: both agents receive the unchanged public GameApi and the
  result is explicitly labeled full-state;
- fog_respecting: both agents receive independent player-relative proxies.

The fog-respecting proxy returns own and allied objects plus currently visible
hostile or neutral objects. getAllUnits, getNeutralUnits, getUnitsInArea,
getGameObjectData, getUnitData, and getAllSuperWeaponData are filtered through
that set. Static map/rules queries remain available. Opponent PlayerData keeps
only name, country/side, isCombatant, and start location; dynamic opponent
economy, queue, inventory, and private state are unavailable. The proxy
recomputes visibility each update, binds every call to the receiving player,
returns defensive copies, and rejects any unclassified GameApi method.

Both sides must use the same mode in a game. No policy may retain the other
side's proxy or raw GameApi. A synthetic two-player symmetry suite must show
that swapping slots swaps views, hidden-object queries fail closed, own state
remains complete, public map/rule answers remain equal, and no wrapper changes
the API-full-state mode.

## Technical telemetry

Telemetry is bounded and outcome-free. Per update and cumulatively it records:

- proposals, unique proposed units, and per-scope counts;
- same-unit conflicts and winning scopes;
- invalid units, invalid targets, and invalid tiles;
- duplicate suppressions;
- forwarded groups, chunks, calls, and unit IDs;
- deferred, superseded, expired, and pending intents;
- rolling total/order maxima;
- production batch count and atomicity;
- debug coalescing;
- essential-action safety overflows;
- terminal activation and revocation counts; and
- canonical telemetry and forwarded-action hashes.

Telemetry contains no W/D/L, score, endpoint, defeated state, terminal
building count, opponent identity inference, or competitive ranking.

## Implementation gates

### Gate 1: static and pure

- exact 52-site/29-routine source inventory;
- type check and package build;
- disabled option is byte-for-byte direct passthrough;
- permutation-invariant arbitration;
- one winner per unit;
- priority, tie, retry, TTL, validation, grouping, sorting, and 128-ID chunk
  tests;
- exact rolling-window boundary tests at t-899 and t-900;
- all production-batch and essential-overflow tests;
- complete final-building-race and revocation tests;
- complete firewall allowlist and symmetry tests.

### Gate 2: disabled live equivalence

On a fresh audited seed namespace, compare unwrapped deployed StrongBot with
arbiter-disabled StrongBot on balanced countries, directed starts, and slots.
Require exact forwarded-action hashes, fixed-update snapshots, production
queues, unit inventories, credits, starts, and fixed-horizon completion for every
pair. Generate no orientation or competitive ranking.

### Gate 3: enabled fixed-horizon compatibility

Freeze a separate zero-outcome campaign before launch. It must cover every
physical map and topology family versus pinned Supalosa and every HFO variant
versus Advanced, all nine countries, both slots, all three ceilings, the
disabled control, and deterministic duplicates. Use a fresh fully audited
seed interval. Every trace must reach its fixed horizon.

Require:

- no essential-action overflow;
- no forwarded invalid unit, target, or tile;
- no partial production batch;
- one forwarded order per unit per update;
- chunks no larger than 128;
- rolling total and order caps at every ceiling;
- exact deterministic duplicates;
- terminal activation only under its certified gate and immediate revocation;
- source/runtime/map/opponent/firewall/manifest/scheduler identity;
- recursive competitive-field rejection; and
- complete-population analysis only.

Any failure blocks competitive evaluation. Repair only the failed technical
interface prospectively; do not reuse or selectively inspect partial traces.

## Advancement

Only after all three gates pass may an open-development outcome protocol compare
disabled, 75, 150, and 300 ceilings and isolate arbiter, certified race, and
observation-router effects. The deployed StrongBot remains unchanged until a
fresh replicated champion passes the later frozen safety and superiority
gates.
