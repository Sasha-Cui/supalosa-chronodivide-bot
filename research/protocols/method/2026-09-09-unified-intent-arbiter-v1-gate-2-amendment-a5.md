# Unified intent arbiter V1 Gate 2 amendment A5

Frozen: 2026-09-09, after seed reservation completed and before selector,
trace, or finalizer implementation and before any game initialization.

Parents: Gate 2 and Amendments A1–A4.

## Public queue schema correction

The parent trace specification requested production progress. The pinned
@chronodivide/game-api 0.75.0 QueueData interface exposes only:

- queue type;
- size and maximum size;
- status; and
- items with rules name/type and quantity.

It exposes no production-progress value. Inventing one from engine internals
would violate the public-API boundary.

## Replacement snapshot

Record every exposed QueueData field and item in queue-type order. Omit
production progress rather than inferring it. Bind the exact pinned game-api
declaration/runtime hash in the manifest and every trace.

Pairwise equivalence still requires exact equality of every queue field at all
five snapshots. The action hash and unit/player snapshots provide independent
state-trajectory checks.

## Compact action record

Hash every forwarded public ActionsApi request incrementally using logical
update, normalized side, method, and normalized public arguments. Record only
the final hash, total call count, and exact per-side/per-method counts. Forward
all requests, including quit; do not suppress or reinterpret any action.

## Unchanged requirements

The reserved base, 180 pairs, 360 tasks, maps, starts, countries, slots, arms,
3,600-update horizon, snapshot times, exact identity gate, no-outcome fields,
storage, scheduler, provenance, and advancement rules are unchanged.
