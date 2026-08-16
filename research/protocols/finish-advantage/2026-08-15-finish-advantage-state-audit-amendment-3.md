# Finish-Advantage State-Audit Amendment 3

Date: 2026-08-15

Status: **prospectively frozen before any finish-advantage competitive outcome and while the repaired V5 confirmation remains blinded**

## Motivation

The version-18 state-audit selector considered a numerical surplus margin
eligible when it had compatible positive strike exposure in at least eight of
nine countries, both factions, both reciprocal slots in aggregate, and at
least five open map families. That rule could hide a complete country-specific
capability failure. It also allowed slot 0 exposure from one country and slot 1
exposure from another to satisfy the aggregate slot check.

The released policy and final study are explicitly all-country. A margin that
cannot produce any compatible finish detachment for one country-slot
orientation is not ready for an outcome screen, irrespective of performance in
the other cells.

## Amended outcome-blind eligibility rule

For each candidate surplus margin, collapse repeated state records to the
maximum positive strike size for each exact
`family | country | candidate-slot | margin` cell, as before. A margin is
eligible only if all of the following hold:

1. at least five of the ten open map families contain exposure;
2. all nine countries contain exposure;
3. every one of the 18 country-by-reciprocal-slot combinations contains
   exposure in at least one open family;
4. both factions are represented; and
5. the existing finite compatibility, mission-ownership, and positive-strike
   requirements pass.

Conditions 2 and 3 replace the former `countries >= 8` and aggregate two-slot
checks. No competitive outcome is involved. If no numerical margin passes,
the screen retains the base-race and irreversible arms but adds no unsupported
surplus arm.

## Executable requirements

The state-audit aggregate must report the number of distinct country-slot
combinations and test exact equality to 18. Unit tests must prove that an
otherwise broad eight-country population fails and that a nine-country
population missing one orientation for one country fails.

This amendment does not change any active V5 job, V5 policy, sealed population,
or paper claim.
