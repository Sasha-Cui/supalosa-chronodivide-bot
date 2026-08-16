# Finish-advantage decision doctrine, amendment 3

Status: **prospective author-confirmed liveness and target-priority rule frozen before state-audit launch or any finish-advantage outcome-bearing experiment**

Recorded: 2026-08-15 (America/New_York)

This amendment refines amendment 2. It does not alter the active sealed V5 campaign, authorize outcome access, or claim that the proposed controller improves wins.

## Author-confirmed liveness principle

Persistent attacking should make stalemate uncommon, but an attack is useful only when it advances the literal win condition. The bot must continuously pursue one of two proximate objectives:

1. destroy an enemy building; or
2. remove the smallest causally relevant obstacle that prevents a safe building strike.

Eliminating the opposing army is not a prerequisite for attacking buildings. Once effective resistance is gone, all remaining enemy buildings are cleanup targets and the bot must sweep them without idling. Conversely, when the last reachable enemy building can be destroyed before hostile forces can stop the strike or destroy all friendly buildings, that building takes priority even if a much larger enemy army survives.

## Opportunity-aware target hierarchy

At every decision update, using only legally observed state, the overlay must apply this ordering:

1. **Immediate terminal strike.** If any enemy building is reachable and its destruction would end the game before interception or friendly-base loss, attack it now. Do not divert to enemy units that are irrelevant to that strike.
2. **Feasible building progress.** If a building strike is safe and advances the destruction sequence, continue it. Prefer a target that minimizes credible time to physical destruction, subject to path feasibility and base survival.
3. **Minimum blocker removal.** If no safe building strike exists because a specific hostile force blocks the route, firing position, or survival inequality, engage only the minimum causally relevant blocker and recompute immediately after it is removed or displaced.
4. **Production denial.** Treat an enemy production building as strategically urgent when leaving it intact can regenerate resistance that would invalidate the current or next building strike.
5. **Base-race defense.** Interrupt or defend only when hostile forces can destroy all friendly buildings before the selected enemy-building sequence completes.
6. **Fallback.** If evidence is incomplete, malformed, or unsupported, release control to the frozen inner strategy rather than begin an unconstrained army hunt.

This hierarchy is lexicographic. Material value, enemy unit count, nearby kill opportunities, and a desire to clear the whole map cannot override an earlier feasible objective.

## Liveness requirements

The overlay must not repeatedly issue an attack that makes no observable progress. It must track bounded, outcome-free indicators such as target distance, legal command acceptance, time since target damage, route progress, and target existence. On a prospectively fixed stall threshold, it must reroute, choose another building, clear the identified blocker, or release control. It must never respond to a stalled building strike by globally hunting enemy forces.

The controller must also retarget immediately when a building is destroyed, becomes unreachable, disappears from legal observation, or ceases to be the fastest safe route to the literal endpoint.

## Required deterministic cases

In addition to amendment 2, tests must establish:

1. last building reachable with one hundred off-route tanks: attack the building;
2. last building guarded by one route-blocking force: remove or bypass only that blocker, then retarget the building;
3. last building reachable while a hostile force is winning the base race: defend or interrupt only if the building cannot be destroyed first;
4. several undefended buildings: choose a destruction sequence and keep sweeping until no building remains;
5. a production building that can replenish blockers: prioritize it when that shortens the credible route to termination;
6. a stalled strike: recover locally without switching to global force elimination;
7. a destroyed current target: retarget another building on the next legal update;
8. protected Supalosa missions: defense, retreat, construction, economy, scouting, and expansion units remain untouched unless the frozen lease certificate explicitly makes them available.

## Empirical implication

Literal win rate against the exact pinned Supalosa bot remains primary. Draw reduction is supporting evidence only if it converts to more wins without adding losses. Mechanism reporting must distinguish direct building strikes, blocker clears, production denial, base-race intervention, stall recovery, and fallback. The central falsifiable question is whether this opportunity-aware hierarchy turns otherwise nonterminal advantages into completed building destruction across countries and map families.

