# Finish-Advantage Composite Technical Gate Amendment 3

Date: 2026-08-15

Status: frozen prospectively before the outcome-free compatibility gate is generated or launched. This amendment has not inspected sealed V5 outcomes or any finish-advantage competitive outcome.

Parent protocol: `2026-08-15-finish-advantage-composite-technical-gate-protocol-v1.md` (`sha256: 95abce7405006a8e73dc3c8dad0aed5745c483b9591332bc1bc72e7951c4f24e`).

Parent amendment: `2026-08-15-finish-advantage-composite-technical-gate-amendment-2.md` (`sha256: df12eb53db5bd75a4fdecb93fae785d2100aafed326e4b29714a69b629542d5b`).

Decision-doctrine amendment: `2026-08-15-finish-advantage-decision-doctrine-amendment-4.md` (`sha256: 067e51860f0532f35eba9f04b75b0a3e791c3c35fdea5487839d70536e220f1a`).

## Explicit liveness-event decomposition

The strategy telemetry schema advances from version 3 to version 4. Every emitted decision event adds exactly two outcome-free fields:

- `irreversibleCertificateRevoked`, a Boolean that is true only on an update where the preceding observed state satisfied the irreversible finish certificate and the current observed state no longer does; and
- `stalledTargetId`, the former committed building identifier when, and only when, the frozen physical-progress deadline expires and the strategy invokes its deterministic stall recovery.

Ordinary retargeting after physical destruction of a building is not a stall recovery and must emit `stalledTargetId: null`. A stalled-target event identifies the building whose approach or attack exhausted the liveness deadline; it does not assert a game outcome. Certificate revocation similarly records a public-state transition and does not assert why it occurred or whether it affected the game result.

The compatibility validator must require schema 4, validate both fields, and reject a stalled target that is not a positive integer. Unit tests must distinguish destruction-driven retargeting, continued approach, deadline-driven retargeting, and certificate revocation.

## Rationale

The frozen open-screen analysis calls for counts of certificate revocations and stall recoveries. Inferring those events indirectly from neighboring telemetry would make the mechanism report fragile and could conflate normal building completion with failure to progress. Recording the events explicitly provides an auditable decomposition while leaving policy decisions, actions, arms, seeds, horizons, and outcome rules unchanged.

## Gate design

The 72-game country, slot, mode, seed, and horizon design remains unchanged. Because the gate has not launched, every cell must use schema 4; no mixed-schema evidence or selective rerun is permitted.

