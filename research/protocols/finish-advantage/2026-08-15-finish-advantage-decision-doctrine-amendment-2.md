# Finish-advantage decision doctrine, amendment 2

Status: **prospective author-confirmed control rule frozen before policy implementation, state-audit launch, or sealed V5 confirmatory unblinding**

Recorded: 2026-08-15 (America/New_York)

This amendment operationalizes the terminal-objective rule in the decision doctrine and amendment 1. It does not authorize competitive outcome access, alter an active campaign, or convert a material advantage into a win.

## Author-confirmed objective

A literal win occurs only after every enemy building has been physically destroyed. The policy should therefore keep making progress toward enemy-building destruction. Enemy armed forces are intermediate constraints, not an objective whose complete elimination is required before attacking buildings.

The controller must distinguish two cases:

1. If hostile forces cannot prevent a feasible building strike and cannot destroy all of our buildings first, bypass them and attack the building. This remains true even if the opponent has one building and an arbitrarily large off-route army.
2. If hostile forces can intercept the strike, deny the required path or firing position, or win the base race first, neutralize only the minimum causally relevant blocking force, then immediately reconsider the building strike.

When effective hostile resistance is gone, the policy must not idle or search for nonexistent forces. It must continue sweeping reachable enemy buildings until the literal endpoint is achieved.

## Executable decision rule

Using only information legally available to the bot, estimate:

- T_building: credible time for the selected compatible strike force to reach and physically destroy a candidate enemy building;
- T_intercept: earliest credible time at which relevant hostile forces can make that strike infeasible; and
- T_own_loss: earliest credible time at which the opponent can physically destroy all of our remaining buildings.

Subject to a prospectively fixed safety margin, choose the building strike when T_building precedes both T_intercept and T_own_loss. Otherwise, protect survival or clear the smallest blocker responsible for the failed inequality, and recompute immediately. Unknown, malformed, or unsupported estimates fail closed to the frozen V5 or exact-Supalosa controller.

Army size, material value, and global kill opportunity are not sufficient reasons to delay a feasible terminal strike. A hostile unit is strategically relevant to this overlay only when the public state supports a causal interception, path-denial, firing-denial, production/deployment, or base-race role.

## Required deterministic cases

Before any outcome-bearing screen, unit and native-integration tests must cover at least:

1. one reachable enemy building plus one hundred off-route tanks: strike the building;
2. one reachable enemy building plus an intercepting tank: clear or route around the blocker, then strike;
3. one enemy building with our own final building under a faster lethal attack: defend or interrupt the base race;
4. several enemy buildings and no effective resistance or production: sweep buildings without idling;
5. several enemy buildings with irrelevant remote forces: continue the building sequence;
6. a stalled or unreachable building target: trigger liveness recovery, reroute, or retarget without beginning a global army hunt.

The tests must also verify that the overlay releases control when its certificate expires and preserves Supalosa-owned defense, retreat, construction, economy, scouting, and expansion missions.

## Empirical interpretation

The primary outcome remains literal wins against the exact pinned Supalosa bot. Mechanism evidence must separately report whether building strikes bypassed irrelevant forces, cleared a true blocker, or protected a base race; time to first building damage; time to each destruction; stalled intervals; and any losses caused by premature force leasing. Fewer draws or higher score cannot substitute for more literal wins.

This amendment records the author's tactical clarification without inspecting any state-audit game or sealed V5 outcome.
