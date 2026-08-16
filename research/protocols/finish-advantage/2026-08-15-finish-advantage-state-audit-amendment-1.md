# Finish-advantage state-audit protocol, amendment 1

Status: **prospective safety amendment frozen before V5 unblinding**

Recorded: 2026-08-15 UTC

This amendment narrows the surplus-force intervention in
`2026-08-15-finish-advantage-state-audit-protocol-v1.md`. It does not alter the
irreversible-opponent certificate, population, seeds, outcome boundary, or
fixed margin set.

## Why this amendment is necessary

Source inspection shows that exact Supalosa assigns units through a live
mission controller. The prior broad closeout failure cannot be prevented by a
numerical home reserve alone if a later overlay overrides units already owned
by defense, retreat, scouting, engineering, or another non-offensive mission.
The audit and future policy must therefore measure the actually leaseable
force after Supalosa has updated its strategy, not all nominal combatants.

## Passive observer placement

Implement the observer as an action-free strategy wrapper around exact external
Supalosa `DefaultStrategy`. On each AI update it must:

1. call the inner Supalosa strategy exactly once;
2. accept and retain any replacement strategy returned by the inner call;
3. inspect public state and the passed live mission-controller interface only
   after that inner update; and
4. issue no action, production request, mission mutation, or unit transfer.

Observed and unobserved same-seed traces must remain exactly equal under the
frozen equivalence gate.

## Protected mission ownership

Classify a mission as offensive only when its stable public name begins with
`attack_` or equals `allInAttack` or `navalAssault`. An otherwise eligible unit
is protected when it is assigned to any other mission. This includes defense,
retreat, scouting, engineering, expansion, readiness, and unknown mission
names. Unknown or malformed mission-controller state fails closed: the
irreversible certificate may still be measured from public game state, but all
surplus margins are recorded as unavailable.

The observer records only counts and stable category digests:

- all nominal eligible anti-building combatants;
- protected eligible combatants;
- eligible combatants assigned to offensive missions;
- unassigned eligible combatants;
- protected counts by coarse mission category; and
- a hash commitment to mission names and memberships for technical audit.

No individual mission or unit identity may enter margin selection.

## Amended cover partition

For nominal eligible combatants `N`, protected eligible combatants `P`, enemy
mobile selectable combatants `E`, base reserve `r=2`, and margin `m`, define

```text
desired_cover_m = min(N, max(r, E + m))
additional_reserve_m = max(0, desired_cover_m - P)
lease_pool = nominal eligible units minus protected units
strike_m = max(0, |lease_pool| - additional_reserve_m).
```

Choose the additional reserve deterministically from the lease pool by minimum
distance to the own starting location, then object ID. The candidate strike is
the remaining lease pool, subject to target-specific calibration and
reachability. Thus protected mission units always remain under Supalosa, even
when `P` exceeds the desired numerical cover.

The margin-exposure rule in protocol v1 now refers to this effective
`strike_m`, not `N - desired_cover_m`. A margin is exposed only when the
effective strike is nonempty and at least one finite compatible target exists.

When the irreversible-opponent certificate holds, enemy counterplay is absent
by construction and the full compatible force may be considered for focused
building completion. At exactly one enemy building, the separate unchanged V5
terminal controller retains precedence.

## New required tests

Before outcome-bearing development, additionally prove:

1. units in defense, retreat, scouting, engineering, expansion, and an unknown
   mission are never leased by surplus pressure;
2. unassigned and recognized offensive-mission units are the only surplus
   lease candidates;
3. malformed or unavailable mission introspection makes every surplus margin
   action-free;
4. protected units count toward desired cover but remain protected even when
   their count exceeds it;
5. additional reserve selection is stable by home distance and ID;
6. the final effective strike never overlaps protected or reserved IDs; and
7. the passive wrapper preserves the exact inner call count, returned-strategy
   transition, action trace, and mission membership trace.

This amendment is a safety constraint, not an empirical result.
