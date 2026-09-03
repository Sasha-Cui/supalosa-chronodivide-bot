# Neutral building lifecycle A3: technical gate passed

All eight full-stage traces and the frozen aggregate finalizer completed
cleanly. This establishes the destroyed-rubble bookkeeping defect in the
pinned engine on controlled neutral-building fixtures, not its frequency or
direction in historical competitive matches.

## Complete result

| Start/slot orientation | LeaveRubble | Destruction update | Legacy recognizes zeroing | Candidate recognizes zeroing |
|---|---|---:|---|---|
| 0 | No | 399 | Yes | Yes |
| 0 | Yes | 399 | No | Yes |
| 1 | No | 350 | Yes | Yes |
| 1 | Yes | 350 | No | Yes |

Each row was run twice with an identical canonical trace hash within its
repeat pair. All eight runs reached 6000 updates, produced eight fixed public
observations, and passed all 15 technical checks. The four rubble cases
retained a zero-health target in the world with its old @@NEUTRAL@@ owner tag;
the target was absent from the owned collection and candidate snapshot.
Both variants generated exactly one attacker-attributed ObjectDestroy and
ObjectUnspawn. The strict existing attribution logic recognized zeroing with
the candidate snapshot; it did not with the legacy rubble-containing snapshot.

Public target visibility occurred at tick 249 (orientation 0) or 228
(orientation 1), before the first attack request at tick 300. There were zero
hidden-target attack requests. The scoped scouting amendment exercised the
lifecycle that the complete A2 smoke had failed to reach.

## Evidence and reproduction

- Source: d5b475223001d61db67277f56f0f25328973a46b.
- Protocol: research/protocols/maps/2026-09-03-neutral-building-lifecycle-probe-scouting-a3.md.
- Init 24643667; smoke 24643668; array 24643854; finalizer 24643855.
- All 11 accounting records: pi_jss233 day, COMPLETED 0:0, zero restarts.
- Aggregate SHA: 9e3d788a97e1b078ce93b03fc20af9af065e83fe60a78fcc20ddf733a750581a.
- Manifest SHA: 26575cb72a7733c179a7f35c1c39506d84f0b062c5c55ed61faa35d0c2f0f7fb.

Run: node research/scripts/audit-neutral-ledger-a3.mjs.

The audit verifies every raw cell/checksum/marker, all source/runtime/asset
bindings, exact accounting and assignments, and re-evaluates the saved event
boundaries with the unchanged adjudicator. It reproduces all stored checks,
repeat comparisons, and smoke/full-stage consistency. See
[cases and exact jobs/hashes](2026-09-03-neutral-ledger-a3-audit/cases.csv),
[scheduler records](2026-09-03-neutral-ledger-a3-audit/scheduler.csv), and
[validation and limitations](2026-09-03-neutral-ledger-a3-audit/validation.json).

Raw evidence remains under
research-evidence/live-building-ledger/neutral-probe-v1-scouting-a3.
The earlier v1 initialization failure, A1 deployment failure and complete A2
negative smoke remain preserved; none was replaced or omitted.

## Limits and next gate

These are two controlled start/slot orientations and two engine seeds,
with deterministic repetitions, not independent policy-strength trials.
The target was neutral and its LeaveRubble rule was controlled in the fixture.
No W/D/L, competitive ranking, confidence bound on bot strength, historical
incidence estimate, or rescoring follows from this result.

Full per-update streams were hashed at execution but not retained in A3.
Repeat hashes are compared, not independently rebuilt from sparse saved
observations. Boundary adjudications and raw artifact hashes are independently
recomputed. The next gate must retain compressed canonical streams.

The candidate remains outside competitive runners. Actual combatant-owned
destruction and capture/sale/unattributed-cleanup controls are required before
a separately versioned endpoint can be considered. All historical scientific
results remain as run; neither failed map confirmation is rescued. The paper
and further competitive optimization remain on hold pending measurement
validation.
