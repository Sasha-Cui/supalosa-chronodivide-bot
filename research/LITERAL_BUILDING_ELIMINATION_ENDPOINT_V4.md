# Literal Building-Elimination Endpoint v4

Status: final prospective endpoint; supersedes v1-v3 before any Method-v5 game  
Frozen: 2026-08-12 America/New_York

## Interpretation of the game rule

A literal win occurs when a player physically destroys the opponent's final
remaining owned building or buildings. The winning player is not required to
retain a building: surviving units may destroy the opponent's final building
after their own building count has already reached zero. If both players lose
their final buildings in the same engine update, the result is a draw.

Buildings sold, undeployed, or captured earlier are no longer opponent-owned
buildings at the endpoint. They are reported as earlier non-destructive
dispositions but do not permanently invalidate a later genuine elimination.
Version 3's requirement that a winner retain at least one building was stricter
than the author's clarified game rule and is superseded before Method-v5
implementation or execution.

## Legacy boundary

Method-v4 and earlier games are training diagnostics under their original
short-game endpoint. They cannot be relabeled because resignation and engine
cleanup can yield terminal zero buildings, and the old overlay could use
complete state to locate shrouded targets.

## Symmetric settings and information separation

- Set `shortGame=false`.
- Suppress `ActionsApi.quitGame` symmetrically after each bot's `onGameStart`;
  count every attempt and forward none.
- Do not enable an endpoint until both combatants have each owned at least one
  `ObjectType.Building` in a post-update state.
- Mobile construction vehicles do not count as buildings.
- The evaluator may enumerate complete state. Neither policy may receive or
  use complete-state building identities or locations. Candidate policy input
  is limited to player-visible objects, remembered sightings, public map
  geometry/starts, and the normal Supalosa awareness/scouting interfaces.

## Building and event ledger

Before every update, the evaluator records ID, owner, rules name, location, and
hit points for all buildings owned by the declared combatants. During the
update it intercepts and deduplicates `ObjectDestroy`, `ObjectUnspawn`, and
`ObjectOwnerChange` events while forwarding them to the bots. After the update
it rebuilds the complete building ledger.

A building has a valid opponent-attributed physical-destruction disposition in
that update only when:

1. it was owned by one combatant immediately before the update;
2. an `ObjectDestroy` event names its ID;
3. `attackerInfo.playerName` is the opposing declared combatant; and
4. it is absent from the post-update building ledger.

Sale, owner change, unspawn without a qualifying destroy event, resignation
cleanup, engine cleanup, disappearance without an event, self-destruction, and
third-party destruction are non-destructive dispositions. All dispositions are
retained for analysis.

## Endpoint

After both players have established a building:

- Candidate win: baseline's building count transitions from a positive value
  to zero, and every baseline-owned building removed in that zeroing update has
  a qualifying candidate-attributed physical-destruction disposition.
- Baseline win: the exact symmetric condition.
- If both valid positive-to-zero transitions occur in the same update, record
  a draw. This is the only simultaneous-building-elimination draw rule.
- A player's own pre- or post-update building count does not otherwise affect
  whether that player can win.
- A positive-to-zero transition containing any non-destructive disposition is
  not a win. If that player later owns buildings again, a later fully physical
  positive-to-zero transition may qualify.
- Stop immediately on a valid endpoint, before another engine update.
- If the engine finishes without a valid endpoint, record a technical endpoint
  failure rather than a win or ordinary draw.
- If neither valid endpoint occurs by the frozen tick cap, record a draw.

## Required evidence and rejection

Each result records endpoint version/hash; result/score/tick; pre- and
post-update counts; ever-established flags; resignation attempts; all removed
building ledger rows and matched events in every zeroing update; prior
non-destructive disposition counts; engine-finished status; and the exact
explanation for each credited removal.

The campaign gate rejects a credited win unless the full final zeroing set is
explained by opponent-attributed `ObjectDestroy` events. It also rejects any
forwarded resignation, endpoint-less engine finish, missing or contradictory
ledger field, duplicated result, asymmetric instrumentation, or complete-state
information leak into policy decisions or telemetry.

## Prospective-use rule

This endpoint is frozen before Method-v5 implementation, plan generation, or
game launch. Later changes require a new version and fresh games. Versions 1-3
remain immutable audit artifacts and are never used for Method-v5 outcomes.
