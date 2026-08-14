# Persistent additive objective completion: prospective amendment 10

Status: **frozen before policy-v9 force-sufficiency compatibility and before any outcome-bearing launch**  
Frozen: 2026-08-14 UTC

## Complete outcome-free compatibility-v10 evidence

Compatibility-v10 job `22197767` completed all 72 fixed-tick runs under
`pi_jss233` on clean main commit
`88ae6d5c52e59b1089242662898a1f79becc7296`. It returned exit `1:0` after
preserving the complete outcome-free artifact with SHA-256
`8140ecf55c8d4920ba9f664afac0075f7ed9d28f81f1a8c2c2213d28efcf8bcf`.
No winner, score, endpoint, terminal aggregate, or policy-performance outcome
was recorded or inspected.

The bounded-rotation mechanism worked: all 18 country-slot cells selected at
least two target identifiers, five building types were exercised, traces were
deterministic, and the disabled overlay remained exactly equivalent to the
pinned external Supalosa control. Nevertheless, all 18 cells failed the
physical-damage requirement. The overlay dealt 13,906 hit points to blockers
and zero hit points to buildings.

Target selection and retry liveness are therefore not the current bottleneck.
The capped multi-building detachment is too weak to complete the force-clear-
then-building sequence within the live horizon. Further changes to target cost,
rotation order, or blocker scoring are not authorized for this architecture.

## Prospective policy-v9 force-sufficiency test

Policy v9 changes the multi-building force allocation and default closeout
scope, while preserving the exact Supalosa predecessor:

1. Activate the additive multi-building layer only when two through five enemy
   buildings remain; exact-one behavior is unchanged.
2. Among compatible units, preserve non-offensive locked missions and units
   locally protected by the existing home-threat certificate.
3. Commit every other compatible unassigned or offensive-mission combatant to
   the selected building or necessary blocker. Remove the ordinary reserve,
   eight-unit cap, one-half global fraction, six-unit locked-offense cap, and
   one-half per-offensive-mission fraction for this late closeout state.
4. Retain the time-aware force-versus-building race, complete-mission target
   ranking, bounded no-building-damage rotation, physical progress deadlines,
   and full-force terminal rule unchanged.

This is a force-sufficiency test, not a parameter sweep. Its exact schema names
`full_compatible_offensive_force`; its frozen numeric representation is a
100-unit ceiling and unit fractions of one, which exceed the intended practical
population while retaining finite schema validation.

Compatibility-v11 must use fresh valid seeds and a new exclusive root. It must
preserve every outcome-free equivalence, determinism, command, race, rotation,
target-diversity, mission-ownership, and provenance check, and it must require
physical enemy-building damage in all 18 country-slot cells. Passing would
authorize only the prespecified two-arm open-development screen. Failure
retires this persistent-overlay architecture; it cannot trigger another target
or detachment tweak on the same compatibility population.
