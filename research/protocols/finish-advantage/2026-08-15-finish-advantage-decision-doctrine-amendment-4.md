# Finish-Advantage Decision Doctrine Amendment 4

Date: 2026-08-15

Status: frozen prospective design note; outcome-blind with respect to the sealed V5 confirmatory campaign.

Parent doctrine amendment: `2026-08-15-finish-advantage-decision-doctrine-amendment-3.md` (`sha256: a143882f4a12b60d381693e36b7dfd1a43055c6c2f837bb74a831aac04c912ce`).

## Clarification

The terminal objective is the physical destruction of every enemy building. A finishing controller therefore must keep making measurable progress toward that objective instead of treating a materially favorable position as sufficient.

At every decision point it should compare the credible time-to-win of two routes:

1. attack the remaining buildings directly; or
2. remove only the enemy forces whose survival blocks, interrupts, or can soon reverse the building-destruction route, then resume the building attack.

Enemy forces are instrumental targets, not terminal targets. The controller must not detour to destroy an off-route force merely because it is large. In particular, when one reachable enemy building remains and a large enemy army cannot prevent its prompt destruction, the building remains the target. Conversely, when defenders prevent access, threaten the attacking force before the building can fall, can rebuild or regenerate resistance, or create a faster base-loss race, the controller may remove the minimum causal blocker first.

Once meaningful resistance is gone, all available eligible attackers should sweep the remaining buildings without idle or defensive oscillation. Persistent draws in such states are treated as a policy defect to diagnose, not as an acceptable strategic outcome.

## Prospective implementation consequences

- Preserve the existing protected-mission ownership rules; continuous pressure does not authorize leasing units needed by an inner Supalosa mission.
- Add progress and liveness observables: target-building hit-point decrease, distance-to-target decrease, blocker removal, target change, and ticks since last progress.
- Require a deterministic retarget or regroup action after a frozen no-progress interval, while retaining the same building-first/blocker-first hierarchy.
- Test the explicit edge cases: one building plus many off-route tanks; one defended building with causal blockers; no meaningful resistance with several buildings; and a base-race exception.
- Validate mechanics and action order without reading sealed outcomes. Any performance evaluation belongs to a new prospective campaign with frozen seeds, arms, stopping rules, and analysis.

## Non-retroactivity

This amendment does not alter the sealed V5 policy, its running jobs, its gate, or its authorized aggregate. It may inform only later compatibility tests and prospective experiments.
