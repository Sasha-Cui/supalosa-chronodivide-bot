# Finish-Advantage Composite Technical Gate Amendment 2

Date: 2026-08-15

Status: frozen prospectively before the outcome-free compatibility gate is generated or launched. This amendment has not inspected sealed V5 outcomes or any finish-advantage competitive outcome.

Parent protocol: `2026-08-15-finish-advantage-composite-technical-gate-protocol-v1.md` (`sha256: 95abce7405006a8e73dc3c8dad0aed5745c483b9591332bc1bc72e7951c4f24e`).

Parent amendment: `2026-08-15-finish-advantage-composite-technical-gate-amendment-1.md` (`sha256: 31a6f44d6fbd175c4901220f095185bb293e0b6e14f0684702334edb4a259362`).

Decision-doctrine amendment: `2026-08-15-finish-advantage-decision-doctrine-amendment-4.md` (`sha256: 067e51860f0532f35eba9f04b75b0a3e791c3c35fdea5487839d70536e220f1a`).

## Liveness witness correction

The strategy telemetry schema advances from version 2 to version 3. In addition to target-building damage, the prospective no-progress clock now recognizes three public, mechanically meaningful forms of progress:

- a committed attacking unit reduces its remaining ordinary-weapon approach distance to the current building or blocker;
- the current causal blocker loses hit points; or
- the current causal blocker is physically removed.

A new commitment also initializes the liveness clock. Merely repeating an order, changing a mission label, or observing elapsed time is not progress.

The telemetry must report the current objective distance, blocker hit points, ticks since last objective progress, and the categorical progress witness. All values remain outcome-free. The compatibility validator must reject malformed distances, hit points, elapsed ticks, or progress labels and must require a blocker hit-point witness for a blocker order.

## Rationale

The version-2 building-hit-point-only clock could label a long but successful approach as stalled before the first shot, causing unnecessary retargeting and oscillation. Version 3 preserves the frozen deterministic timeout and retarget rule while distinguishing genuine motion or blocker removal from inactivity. It does not relax mission ownership, force-cover, direct-building, causal-blocker, base-race, final-building handoff, or forbidden-outcome constraints.

## Gate design

The 72-game country, slot, mode, seed, and horizon design remains unchanged. Because the gate has not launched, all cells will use schema 3; no mixed-schema evidence is permitted and no cells may be selectively rerun.
