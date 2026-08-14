# Persistent additive objective completion: prospective amendment 3

Status: **frozen before policy-v2 compatibility and before any outcome-bearing launch**  
Frozen: 2026-08-14 UTC

## Complete outcome-free diagnostic

Compatibility-v3 job `22189808` completed the fixed 72-run allocation under
`pi_jss233` on clean main commit
`2590085287c1f57b78ad1462a5e073bcd2be40bd`. It returned exit `1:0` only after
writing the complete outcome-free artifact with SHA-256
`9d4f3172e74a06266b5f1c88237d2696e95c3451a42bd88e55e8cf9bdb7ffd66`.
No winner, score, endpoint, terminal aggregate, or policy performance was
recorded or inspected.

All disabled traces remained equivalent, enabled repeats deterministic, and
selected units command-compatible. The gate failed because 7/18 country-slot
cells produced no physical enemy-building damage by tick 5,400: Americans slot
0, Alliance slot 1, both German slots, both Confederation slots, and Russians
slot 0. The other 11 cells recorded 294 building-damage events and 4,694 total
hit points of damage.

The complete repeated-observation audit recorded 8,007 selected observations
from 28,489 compatible observations. Selection was dominated by basic infantry:

| Rules name | Compatible observations | Locked observations | Selected observations |
|---|---:|---:|---:|
| `E1` | 7,061 | 4,961 | 3,291 |
| `E2` | 21,353 | 16,721 | 4,658 |
| `FV` | 21 | 23 | 4 |
| `HTNK` | 54 | 0 | 54 |

No locked unit was selected. In the seven failed cells the selected infantry
were observed moving and, in several cells, attacking, but never physically
damaging an enemy building. This rejects command labels and infantry-only
surplus allocation as sufficient pre-outcome evidence. It does not establish a
game-result effect.

## Prospective policy-v2 repair

The exact Supalosa core remains unchanged. Above one enemy building, policy v2
may additionally lease a bounded minority of units only from an already
offensive mission whose structural public name is:

- prefixed `attack_`;
- exactly `allInAttack`; or
- exactly `navalAssault`.

Locked defence, scouting, retreat, engineer, expansion, construction,
production, capability, and unknown missions remain ineligible. The ordinary
home-threat protection, four-unit reserve, overall eight-unit/one-third assault
cap, physical-progress deadlines, and exact-one full-force rule remain. A new
offensive-mission sub-cap allows at most four units and at most one third of the
compatible units assigned to each offensive mission. This is bounded objective
retargeting of an attack detachment, not mission-wide command takeover.

Policy v2 uses a distinct exact schema and canonical hash. Its outcome-blind
compatibility gate must:

- use fresh seeds and an exclusive root;
- retain the complete v3 per-type audit;
- allow selected locked units only from the three declared offensive mission
  name classes;
- verify the configured per-mission count and fraction caps;
- continue to forbid every other locked mission; and
- require physical enemy-building damage in all 18 country-slot cells.

No outcome-bearing campaign is authorized until this stricter gate passes.
