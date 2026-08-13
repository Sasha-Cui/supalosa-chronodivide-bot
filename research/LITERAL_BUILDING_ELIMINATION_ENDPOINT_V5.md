# Literal Building-Elimination Endpoint v5

Status: prospective repair; supersedes v4 for games launched after this freeze
Frozen: 2026-08-13 UTC

## Motivation for version 5

The first Method-v5 open-training attempt found a previously unmodeled Chrono
Divide engine termination on `mf_hills`. Source inspection established that the
engine has a ten-minute no-progress stalemate detector. When it fires, it marks
combatants defeated and can remove ordinary assets while wall-class buildings
remain owned. Version 4 correctly denied a literal win but treated every
endpoint-less engine finish as a technical failure, invalidating otherwise
well-formed episodes.

Version 5 changes only the classification of a clean, defeated-player engine
termination that lacks a literal endpoint. It does not broaden the win rule.

## Literal win rule

A win occurs only when a player physically destroys the opponent's final
remaining owned building or buildings. The winning player need not retain a
building. If both players' final buildings are physically destroyed in the same
engine update, the result is a simultaneous draw.

Every `ObjectType.Building` owned by either declared combatant counts, including
wall-class and insignificant buildings. Mobile construction vehicles do not
count. Sale, capture, unspawn, resignation cleanup, engine cleanup,
self-destruction, third-party destruction, and unexplained disappearance do not
establish a win.

## Symmetric execution and information boundary

- Set `shortGame=false`.
- Suppress `ActionsApi.quitGame` for both bots after `onGameStart`; count every
  attempt and forward none.
- Enable adjudication only after both combatants have each owned at least one
  building in a post-update state.
- The evaluator may enumerate complete state. Neither policy may receive
  complete-state building identities or locations. Candidate information is
  limited to self state, visible enemy state, remembered sightings, public map
  geometry and starts, and ordinary Supalosa interfaces.

## Building and event ledger

Before each engine update, record ID, owner, rules name, location, and hit points
for all combatant-owned buildings. During the update, intercept and deduplicate
`ObjectDestroy`, `ObjectUnspawn`, and `ObjectOwnerChange` events while forwarding
them to both bots. Rebuild the ledger after the update.

A removal is a qualifying opponent-attributed physical destruction only if:

1. the victim owned the building immediately before the update;
2. an `ObjectDestroy` event names its ID;
3. `attackerInfo.playerName` is the opposing declared combatant; and
4. the building is absent after the update.

All qualifying and nonqualifying dispositions remain in the evidence record.

## Terminal classification

After both building sets have been established, classify each completed update
in this order:

1. Candidate win: the baseline building count transitions from positive to zero
   and every removed baseline building in that update has a qualifying
   candidate-attributed physical-destruction disposition.
2. Baseline win: the exact symmetric condition.
3. Simultaneous draw: both physical-win conditions occur in the same update.
4. Nonliteral engine-termination draw: the engine reports finished, no physical
   endpoint above exists, and its public player statistics mark at least one
   declared combatant defeated. Record both defeated flags, both remaining
   building counts, and the full update evaluation. This includes a two-sided
   engine stalemate and a one-sided engine defeat that leaves wall or other
   buildings under the strict all-buildings rule.
5. Technical failure: the engine reports finished, no physical endpoint exists,
   and neither declared combatant is marked defeated. This is an unexplained
   engine termination, not a game outcome.
6. Tick-cap draw: the frozen cap is reached without another terminal condition.

Stop immediately after any terminal classification. A nonliteral termination
is never a win and cannot satisfy a positive advancement criterion.

## Required evidence and fail-closed checks

Each result records endpoint version/hash, outcome and tick, engine-finished
state, public defeated flags for a nonliteral termination, pre/post building
counts, establishment flags, quit attempts, dispositions and matched events,
terminal building counts, and policy telemetry.

The technical gate rejects any credited win without a complete opponent-
attributed final-destruction ledger; any forwarded resignation; a nonliteral
draw without engine finish and at least one defeated flag; a technical failure;
missing or contradictory fields; duplicated or missing games; asymmetric
instrumentation; or complete-state policy leakage.

## Prospective-use rule

All games under version 4 remain immutable and cannot be relabeled. The failed
first Method-v5 attempt remains disqualified and cannot be combined with a
version-5 campaign. Version 5 must pass focused unit tests, an outcome-blind
baseline-equivalence gate, an all-country capability smoke test, and a declared
engine-termination probe before a completely fresh open-training campaign.
