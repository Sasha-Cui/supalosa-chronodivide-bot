# HFO west-start loss diagnostic V1

Status: **fixed before diagnostic replay; open-development evidence only**

## Why this case

The completed 180-game HFO literal pilot is positive in pooled, paired-family
analysis, but the candidate is only 10W/19D/22L from start `39,82`. The earliest
observed west-start Allied loss is the Korea/`Alliance` row from country ordinal
1, seed index 7, candidate slot 0. It ended at tick 9,556 and is intentionally
selected as a worst-case debugging example. It is not a random sample and must
not be used to estimate performance or choose a paper result.

## Frozen replay

- Map: `cd_chrono_4_heck_freezes_over_le.map`, SHA-256
  `e4dfc736a6355e0e68d4681e4d67419516e6bb94549e2d42880c9414e95e2e8d`.
- Candidate and baseline country: Korea (`Alliance`).
- Engine seed: `4,230,000,017`.
- Candidate participant slot: 0.
- Required starts: candidate `39,82`, baseline `151,119`.
- Candidate: deployed default StrongBot at source commit
  `5a97e40d4c32752947bb51fad37b3b466becc946`.
- Baseline: external Supalosa commit
  `165b77a71d0cf5ebd27c65b19d0486bcbae78d0f`.
- Literal endpoint, `shortGame=false`, 10,000 credits, superweapons disabled,
  and 90,000 maximum ticks, exactly as in the pilot.
- One replay only; no retries, alternate slots, or alternative seeds.

## Measurements

Record every 300 ticks and at termination, separately for candidate and
baseline:

- credits and defeated flag;
- total units, combatants, harvesters, and buildings;
- construction yard, barracks, refinery, war-factory, defensive-building, and
  power-building counts;
- unit-name histogram;
- combatant centroid and coordinate bounds;
- known enemy combatants/buildings from the candidate API;
- literal building counts and suppressed resignation attempts.

The analysis asks whether the west loss is primarily an opening economy or
production deficit, premature all-in/mission reassignment, inadequate local
defense, or inability to damage the east base. One diagnostic cannot establish
frequency. Any proposed repair must therefore be compared prospectively on a
fresh, balanced development population before it is accepted.

## Separation from confirmation

This replay and all subsequent variant screens are open development. Final
all-country confirmation must use fresh seeds not present in the 180-game pilot,
this diagnostic, or the development screens. The current pooled-positive policy
remains frozen as the no-repair control.
