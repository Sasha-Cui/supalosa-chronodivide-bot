# Persistent additive objective completion: prospective amendment 5

Status: **frozen before policy-v4 compatibility and before any outcome-bearing launch**  
Frozen: 2026-08-14 UTC

## Complete outcome-free compatibility-v5 evidence

Compatibility-v5 job `22190509` completed all 72 fixed-tick runs under
`pi_jss233` on clean main commit
`d01fc70a63e2eba50e68f4dd9dfbfc383859a0d2`. It returned exit `1:0` only
after preserving the complete outcome-free artifact with SHA-256
`013ef0740e74fcfb0a6ac9df124c8c22666897a0d8db1640ac4e23a8f9deb7e1`.
No winner, score, endpoint, terminal aggregate, or policy-performance outcome
was recorded or inspected.

The schema-v7 minimum-package arithmetic, production four-unit reserve,
disabled equivalence, deterministic repeats, mission whitelist, and all unit
caps passed. The policy selected as many as four Allied and seven Soviet
attackers and recorded 5,066 selected-while-locked observations. Ten of 18
country-slot cells physically damaged an enemy building, accumulating 2,670 hit
points of damage. Eight cells produced zero building damage despite actionable
building orders: Americans slot 1; both Alliance slots; French slot 1; Germans
slot 0; both Arab slots; and Confederation slot 0.

The remaining failures are not explained by a one-unit detachment. Failed
Allied cells selected as many as three attackers and failed Soviet cells as many
as six. Their cumulative route progress was approximately 11.3--12.6 tiles for
Allied cells and 8.4 tiles for Soviet cells, compared with approximately 26.8
and 21.1 respectively in the passing cells. The delayed route-blocker phase was
almost never reached: only Americans slot 1 entered it, causing 30 hit points of
blocker damage. This is mechanism evidence, not a between-version performance
comparison, because v5 used fresh seeds.

## Prospective policy-v4 correction

Policy v4 changes only when an already selected objective detachment attacks a
route threat:

1. If at least one selected attacker is already within ordinary firing range of
   the committed building, attack the building immediately.
2. Otherwise, inspect enemy combatants intersecting the current straight-line
   approach corridor.
3. A combatant is a preemptive blocker only if it can damage at least one
   selected attacker and at least one selected attacker can damage it using an
   ordinary legal ground attack.
4. Attack the nearest such blocker. Once it is destroyed or no longer present,
   immediately resume the same committed building mission.
5. Enemy forces outside the approach corridor do not affect the building
   decision, regardless of their count.

The existing delayed no-progress blocker rule remains as a fallback. Target
ranking, detachment sizing, reserves, home protection, mission eligibility,
deadlines, lease duration, and the exact external Supalosa core remain
unchanged. This isolates preemptive interception handling from force allocation.

Policy v4 uses a distinct exact schema and canonical hash. Compatibility-v6
must use fresh seeds and an exclusive evidence root, retain all v5 checks, prove
the direct-building override and preemptive-blocker behavior in deterministic
tests, and require physical enemy-building damage in all 18 country-slot cells.
Its summary must also retain target names, blocker names, and transitions where
previously selected units disappear or are deselected. No outcome-bearing
screen is authorized unless compatibility-v6 passes.
