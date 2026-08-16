# Finish-Advantage Complete Open Causal-Screen Protocol, Amendment 3

Status: **prospectively frozen telemetry-binding clarification before campaign generation or competitive launch**

Recorded: 2026-08-15 (America/New_York)

Parent protocol: `2026-08-15-finish-advantage-open-causal-screen-protocol-v1.md` (`sha256: 0a73121af4a38cd8d315669463c0c3fc70a72c1a8deb4f2c01052d82c47deb3e`).

Parent amendment 1: `2026-08-15-finish-advantage-open-causal-screen-amendment-1.md` (`sha256: 18ac1f807bd3e11bf8f6adcd220d203e543772f09002d6ff3c6c5bb8cfa16cbe`).

Parent amendment 2: `2026-08-15-finish-advantage-open-causal-screen-amendment-2.md` (`sha256: dff708b297d2a3e226abc3bc28a8e5076abd1743698798dd71e1308269fd4d7c`).

Composite technical-gate amendment 3: `2026-08-15-finish-advantage-composite-technical-gate-amendment-3.md` (SHA-256 recorded in the frozen campaign manifest after this document and that amendment are installed).

## Telemetry binding

All open causal-screen arms must emit and validate finish-advantage telemetry schema 4 from composite technical-gate amendment 3. The predeclared mechanism report obtains:

- certificate-revocation counts directly from events with `irreversibleCertificateRevoked: true`; and
- stall-recovery counts directly from events whose `stalledTargetId` is a positive integer.

These counts are descriptive mechanism variables only. They cannot determine retries, exclusions, early stopping, arm eligibility, or selection. Ordinary post-destruction retargeting must not be counted as a stall recovery.

## Unchanged design

This amendment changes no arm, family, country, slot, seed, horizon, endpoint, estimand, uncertainty calculation, eligibility gate, selection rule, or launch ordering. The campaign generator and finalizer must bind this amendment by exact path and SHA-256 before launch, and no mixed-schema or selectively rerun evidence is permitted.
