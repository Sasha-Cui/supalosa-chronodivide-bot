# Finish-advantage composite stimulus and telemetry repair, amendment 5

Status: **prospectively frozen before replacement execution**

Recorded: 2026-08-18 UTC

## V1 disposition

Composite job `22597548` completed all 72 outcome-free technical games and
preserved a complete artifact with zero competitive fields. It failed because:

1. inactive finish-advantage telemetry reported a nonzero protected-eligible
   count while leaving `protectedEligibleIds` at the inactive default `[]`; and
2. `simple-1v1-no-preview.map` did not expose an irreversible order, exact-
   unseen coordinate approach, or unseen-to-visible handoff.

The first condition is an action-neutral serialization bug. The second is a
technical-stimulus failure explicitly anticipated by the original protocol.
The V1 artifact cannot support advancement or a paper claim and is preserved.

## Telemetry repair

When an operational partition is inactive or has an empty strike pool after
mission ownership is available, telemetry must serialize the sorted exact
`protectedEligibleIds` used to compute `protectedEligibleCount`. The count,
identifier array, additional reserve, and strike-pool partition must then pass
the same consistency validator as an action-bearing event.

This repair changes no mission ownership, partition, target, order, reserve,
deadline, strategy state, or game action. A deterministic regression requires a
nonempty protected set in an inactive state and checks exact count/ID identity.

## Outcome-blind stimulus selection

The replacement map is selected solely from the completed passive state audit
with no winner, score, terminal orientation, or policy outcome. Eligible open
families had to expose all of:

- at least one irreversible certificate;
- positive margin-0 strike exposure;
- an exact selected target observed while unseen; and
- an exact selected target observed while visible.

Choose the eligible family with the largest irreversible-record count, breaking
ties by its pre-existing frozen family order. `mf_offensedefense` is selected
with 298 irreversible records, 1,271 margin-0 exposure records, 975 unseen-target
records, and 1,616 visible-target records. Its map is
`cd_chrono_offensedefense.map`, SHA-256
`94043927a79a30df9394ac6d6195e0d2926863fdad9c412556d0cc7af409f11a`.

These counts measure public technical state exposure only. They are not win,
loss, draw, score, or policy-effect evidence.

## Replacement gate

The replacement retains all nine countries, reciprocal slots, four same-seed
runs per cell, strict terminal base-race mode, selected margin 0, 5,400-tick
horizon, and every original telemetry, equivalence, ownership, order-witness,
and population requirement. The exact total remains 72 games.

Use fresh seed base `4,226,300,000`, a new exclusive root, and bind this
amendment in the artifact. No V1 game or trace is reused. The replacement must
still fail unless the live population exposes:

- broad building-order coverage across countries, factions, and slots;
- an irreversible order because the state audit exposed irreversible states;
- a surplus-cover order;
- nonempty protected/reserve separation;
- an exact-unseen coordinate approach; and
- a later visible direct-attack handoff.

Passing remains a technical authorization for the already frozen open causal
screen, not a strength or paper claim.
