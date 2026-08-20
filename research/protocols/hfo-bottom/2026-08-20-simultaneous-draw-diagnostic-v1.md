# HFO bottom simultaneous-draw diagnostic V1

Status: **fixed before replay; open-development evidence only**

## Selected case

The complete 180-game literal pilot reported 17W/14D/8L from HFO bottom
`88,157`. Eleven draws were engine terminations with both sides at zero
buildings. This diagnostic fixes the first USA case in pilot order:

- country: USA (`Americans`), mirrored;
- engine seed: `4,230,000,001`;
- candidate participant slot: 1;
- candidate start: bottom `88,157`;
- baseline start: top `88,34`;
- observed endpoint: `engine_nonliteral_termination_draw` at tick 59,916 with
  zero candidate and zero baseline buildings;
- map/runtime/credits/short-game/superweapon/literal-endpoint settings exactly
  match the complete pilot.

The case is deliberately outcome-selected and is ineligible for performance
estimation.

## Measurements

Replay the unchanged bottom policy once. Record every 300 ticks and at
termination for both sides:

- credits;
- unit, combatant, harvester, and building counts;
- construction-yard, barracks, refinery, war-factory, defense, and power
  counts;
- unit-name histograms and combatant coordinate bounds/centroids;
- candidate-visible enemy units/buildings;
- normalized candidate `orderUnits` actions;
- literal building counts and suppressed resignation attempts.

Additionally derive the first ticks at which either side reaches 8, 4, 2, and
1 buildings; the final 6,000-tick building-count trajectory; candidate action
targets during that final interval; and whether mobile candidate combatants are
near the home base, enemy base, or neither.

## Questions

The diagnostic distinguishes:

1. a favorable race lost only by late target ordering;
2. an unfavorable base trade requiring a defensive reserve;
3. failure to find or reach the last enemy building; and
4. simultaneous engine accounting despite an effectively earlier destruction.

No policy change is selected from one replay. Any proposed bottom repair must
be compared against the unchanged deployed policy on a prospectively selected,
fresh, all-country bottom-versus-top development population. Final HFO
confirmation remains disjoint from diagnostic and development seeds.
