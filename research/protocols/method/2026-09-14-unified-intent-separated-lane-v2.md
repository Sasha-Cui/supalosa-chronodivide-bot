# Unified intent arbiter V2: separated essential and command lanes

Frozen: 2026-09-14, after M2 C1 completed and before any V2 implementation,
initialization, or outcome.

Evidence bound:

- `research/results/2026-09-14-unified-intent-m2-long-horizon-c1.md`

## Motivation

C1 showed that a hard rolling ceiling over all public actions is structurally
incompatible with immediate, unsuppressible essential gameplay calls. It also
showed that order cap, chunking, semantic validation, conflict resolution, and
production atomicity themselves remained clean.

V2 separates two resources rather than weakening V1 after the fact:

1. **essential lane:** placement, sale, repair, alliance, production mutation,
   superweapon, and quit calls remain immediate and unsuppressed; and
2. **command lane:** order and best-effort debug/communication traffic is
   semantically arbitrated and hard-bounded.

## Frozen command semantics

Retain the eight V1 semantic scopes, priorities, retry intervals, pending TTLs,
target validation, deterministic same-unit winner, canonical grouping and
sorting, maximum 128-ID chunks, one-forward-per-unit invariant, duplicate
suppression, deferral, expiry, and terminal revocation.

The command lane has a rolling 900-update cap of 115 forwarded calls. Orders
have priority. Debug and communication are admitted only from capacity left
after order resolution. There is no hard cap on the essential lane; its calls
are counted and reported.

Remove `totalCeiling=150` and `gameplayReserve=35` from the V2 contract. Expose
an explicit immutable mode identifier `separated_lanes_v2` and
`commandCeiling=115`. V1 remains available only for reproducing its frozen
technical evidence and remains rejected for long-horizon outcomes.

V2 must never silently suppress, coalesce, or defer an essential gameplay call.
Consecutive production mutations remain one observed atomic batch.

## Gate V2-1: pure behavior

Before live simulation require:

- disabled behavior unchanged;
- deterministic priority and input-permutation invariance;
- one winner and at most one forwarded call per owned unit per update;
- exact target overload preservation and validation;
- rolling command calls never above 115;
- order priority over best-effort debug;
- essential actions always forward even after the command lane is full;
- no partial production batch;
- terminal bypass/revocation/progress and full-state firewall suites; and
- complete 52-site/29-routine source inventory.

## Gate V2-2: outcome-blind full compatibility

After pure gates pass, freeze a fresh seed interval and run all 900 original
map/opponent/country/start/slot cases through natural literal terminal or
24,000 updates. Use only V2; competitive payloads are discarded.

For every case require:

- valid source/runtime/map/opponent/adjudicator identity;
- command ceiling 115 and exact 900-update window;
- zero command-ceiling overflow;
- zero one-forward, target-validation, or partial-production violation;
- maximum chunk at most 128;
- essential calls observed but never suppressed;
- valid public-call and public-state hashes;
- symmetric resignation suppression for evaluation; and
- no competitive field in the technical artifact.

Require proposals, forwarded orders, conflicts, duplicate suppressions, and
deferrals to occur in the complete population. Add deterministic duplicate
cases and exact scheduler accounting. Do not inspect partial traces.

## Outcome development

Only after V2-2 passes may a new open-development protocol compare deployed
StrongBot disabled versus V2 on fresh paired seeds. The physical all-building
endpoint, 24,000-update horizon, complete-map/opponent coverage, family-level
uncertainty, Supalosa safety, Advanced relative improvement, and absolute
Advanced superiority requirements must be frozen again before outcomes.

V2 advances as a paper method only if it produces a reproducible positive
literal-win or paired-score effect without sacrificing Supalosa safety. If it
does not materially improve Advanced, the project must develop a separate
Advanced-specific strategic policy rather than presenting action arbitration
as the solution.
