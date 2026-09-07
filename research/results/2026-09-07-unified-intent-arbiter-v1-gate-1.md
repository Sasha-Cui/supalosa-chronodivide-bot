# Unified intent arbiter V1 Gate 1 result

Date: 2026-09-07

## Disposition

The frozen static-and-pure Gate 1 passed. The implementation now contains a
tested pure arbiter, complete public-action boundary, StrongBot scope
integration, completion-race priority path, immediate terminal-state
revocation, and symmetric observation firewall.

This is not a live compatibility result and not a competitive result. Gate 2
disabled live equivalence and Gate 3 enabled fixed-horizon compatibility remain
mandatory before any arbiter outcome is authorized.

## Frozen protocol and source

- protocol commit: 78965f1
- protocol SHA-256:
  37f29fb4eec4bcabb5df983786d46f3e6b01873426cf91cdb3ab6fc06d976aee
- Gate 1 source commit:
  da956fa2c835b83de044094553bd90bbeb70e89b
- pure core commit: a37c9c0
- action boundary commit: 6e4c604
- StrongBot integration commit: a7d537b
- observation firewall commit: 42e653d
- finalization-guard fix: da956fa

## Implemented action boundary

The pure core fixes:

- total ceiling grid 75/150/300;
- live rolling window of 900 updates;
- protected gameplay-nonorder reserve 35;
- order caps 40/115/265;
- eight semantic scopes with the frozen priority, retry, and TTL schedule;
- one validated winner per owned unit;
- exact overload preservation;
- canonical grouping and sorting;
- chunks of at most 128 IDs;
- duplicate suppression, deferral, expiry, and explicit terminal revocation;
- rolling essential-action overflow detection; and
- bounded per-update telemetry and action hashes.

The central wrapper observes all 15 public ActionsApi methods. Orders are
queued. Essential non-order actions forward and are counted. Consecutive
production mutations are recorded as atomic batches. Exact debug duplicates
are coalesced, and best-effort debug is admitted only after order resolution
leaves capacity. Outside an active enabled update the wrapper is exact
passthrough and can restore the original action surface.

## StrongBot and mission integration

The deployed default remains disabled. Enabling requires an explicit frozen
ceiling. The source audit found exactly the protocol-bound 52 direct
orderUnits sites in 29 routines.

Ancestral Supalosa logic runs in baseline_core scope. Every top-level
StrongBot tactic runs inside its frozen scope. A finally block flushes the
boundary across every early return. ActionBatcher now preserves semantic scope
and the final boundary resolves conflicts between mission output and direct
StrongBot tactics.

Building-elimination completion-race attacks and sweeps carry
terminal_objective priority. Existing tests preserve the one-building versus
100 off-route tanks bypass, lethal-blocker bounded screen, nonterminal guard,
and physical damage/destruction progress rules. New state tracking revokes
pending terminal work immediately when the last-building identity disappears,
changes, or ceases to be unique. A terminal object target that becomes owned
or allied is invalidated.

## Observation firewall

The api_full_state mode returns the unchanged public GameApi to both players.
The fog_respecting mode creates independent player-relative proxies that:

- expose own/allied and currently visible hostile/neutral objects;
- filter all-unit, neutral, area, tile-object, direct-object, direct-unit, and
  superweapon queries;
- apply caller predicates only after hidden IDs have been removed;
- bind visibility and private placement queries to the receiving player;
- redact dynamic opponent PlayerData;
- preserve static map and rule queries; and
- reject unclassified GameApi and MapApi members.

The installer injects one cached view per player across init, start, tick, and
event callbacks. Neither mode is enabled by this result.

## Verification

The root TypeScript composite build passed under Node 20.13.1. The focused
Gate 1 suite passed 107/107 tests:

| Test file | Tests |
|---|---:|
| unifiedIntentArbiter.test.ts | 11 |
| unifiedIntentActionBoundary.test.ts | 5 |
| unifiedIntentSourceInventory.test.ts | 2 |
| researchFlags.test.ts | 11 |
| buildingEliminationMission.test.ts | 73 |
| symmetricObservationFirewall.test.ts | 5 |

The tests cover constants, priorities, order overloads, per-unit conflict
resolution, ownership/target/tile checks, deterministic grouping, chunking,
retry and TTL boundaries, rolling-window admission at update 900/901,
deferral, revocation, reserve overflow, passthrough restoration, production
batching, debug coalescing, source inventory, early-return finalization,
last-building state transitions, full completion-race mechanics, full-state
identity, hidden-object filtering, opponent redaction, map visibility, and
two-slot callback symmetry.

Key source hashes at the passing commit:

- unifiedIntentArbiter.ts:
  b435337f920f78ee87afc304290d549a25e6f06e4edaabfb8e1078aa6f73f6b6
- unifiedIntentActionBoundary.ts:
  2d4f846df00d680cd4600c679f3f503c068ca283446973ae8f23979e24ae9dd7
- strongBot.ts:
  f109cfd38887301cb91064c028adcd99f4ab1bdb857bd13686dc5fe0b2355e4d
- actionBatcher.ts:
  6105cbd76ad1380925b4679729f0ebb74ddb1e3010d736ab7af1bad80c668df6
- symmetricObservationFirewall.ts:
  9471f2b6f7d00399d33b34aa559b7e3c4149cf6d2c889cac055db51a504459b4

## Advancement

Gate 1 closes positive. Next freeze a fresh collision-audited seed namespace
and a strictly outcome-blind Gate 2 live-equivalence campaign. Compare
unwrapped and arbiter-disabled StrongBot on identical starts and require exact
action, production, inventory, credit, and fixed-horizon state identity for
every pair. Do not run an enabled ceiling or inspect a competitive endpoint
until Gate 2 passes.
