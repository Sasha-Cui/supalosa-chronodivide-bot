# Persistent additive objective completion: prospective amendment 4

Status: **frozen before policy-v3 compatibility and before any outcome-bearing launch**  
Frozen: 2026-08-14 UTC

## Complete outcome-free compatibility-v4 evidence

Compatibility-v4 job `22190269` completed all 72 fixed-tick runs under
`pi_jss233` on clean main commit
`54c2e9f1962330f40e6392446f865cb22877b136`. The job returned exit `1:0`
after preserving the complete outcome-free artifact with SHA-256
`ae74d3461df835ce4e54c373fac3dcbcfd2460cb76b2681ec162a50926bde0fd`.
No winner, score, endpoint, terminal aggregate, or other outcome-bearing field
was recorded or inspected.

The schema-v6 overlay remained disabled-equivalent, deterministic, command
distinct when enabled, and within every mission borrowing cap. It selected
locked units only from the prospectively declared `attack_*`, `allInAttack`,
and `navalAssault` classes. Across the complete audit it recorded 1,684
selected-while-locked observations, demonstrating that the new interface was
actually exercised.

The physical-damage gate passed in 6/18 country-slot cells and failed in 12/18.
The failed Allied cells never selected more than one attacker in a decision;
the two successful Allied-country pairs selected as many as three. The failed
Soviet cells selected at most four; the two successful Soviet slot-zero cells
selected as many as five. Successful cells accumulated 492 hit points of
enemy-building damage in total. Failed cells issued moving and attacking
commands, but accumulated zero enemy-building damage.

Fresh v4 seeds differ from v3 seeds, so pass counts are not interpreted as a
between-version performance comparison. The only prospective inference is
mechanistic: a bounded borrowing interface exists and is safe, but its
one-third floor-based allocation can collapse to a one-unit Allied detachment
and did not robustly produce physical building pressure.

## Prospective policy-v3 correction

Policy v3 changes only detachment sizing and reserve ordering:

- preserve a minimum objective detachment of three compatible eligible units
  whenever at least three exist after home-threat exclusions;
- apply the ordinary four-unit reserve only to force remaining after that
  minimum objective detachment is preserved;
- use ceiling rather than floor when converting the overall fraction to a unit
  count;
- permit at most one half of a compatible locked offensive mission, with a
  minimum detachable cohort of three when that mission contains at least three
  compatible units;
- cap locked offensive borrowing at six units and the complete objective
  detachment at the unchanged eight-unit maximum; and
- retain a strict one-half overall fractional cap above the minimum viable
  detachment.

For a locked offensive group smaller than the three-unit minimum, the group may
be borrowed in full. This is an explicit tradeoff: a one- or two-unit attack
mission is already an offensive commitment and is not a viable independently
preserved strike package. Defence, scouting, retreat, economy, production,
engineer, expansion, and unknown missions remain ineligible.

All other policy behavior remains frozen: the exact external Supalosa core,
target ranking, route-blocker logic, progress deadlines, home-threat exclusion,
maximum lease duration, and exact-one-building full-force rule are unchanged.
This isolation makes the next compatibility result diagnostic of detachment
size rather than a joint policy rewrite.

Policy v3 requires a distinct exact schema and canonical hash. Compatibility-v5
must use fresh seeds, an exclusive root, all nine countries, both reciprocal
slots, the ordinary four-unit reserve, complete failure preservation, and the
same physical enemy-building damage criterion. It must additionally prove the
new minimum and maximum selection arithmetic from live mission telemetry. No
outcome-bearing screen is authorized unless compatibility-v5 passes.
