# Finish-Advantage Decision Doctrine V1

Status: prospectively recorded before implementing the multi-building finishing overlay and before unblinding the sealed V5 confirmation.

## Empirical objective

The optimization target is the literal Chrono Divide win condition: destroy every enemy building. A draw at the episode limit is therefore an unresolved failure to finish, even when the candidate has more units, more buildings, or an overwhelming material advantage. Material superiority is useful only insofar as it preserves survival or shortens the time until the last enemy building is physically destroyed.

The policy must improve literal wins against exact Supalosa over all nine countries, both player slots, and many map families. It must not depend on a suppressed quit attempt, private instrumentation, future information, or an outcome-bearing diagnostic.

## Central tactical lesson

Enemy buildings are terminal objectives. Enemy armed forces are usually instrumental obstacles.

The policy should not ask whether buildings or forces are globally more valuable. It should ask which action most safely reduces the time to literal victory in the current state.

1. If a reachable final enemy building can be destroyed before enemy forces can prevent the strike or destroy all of our buildings, commit the necessary attackers to that building. Irrelevant enemy forces do not outrank the terminal objective. A lone building with one hundred off-route tanks still makes the building the winning target.
2. If enemy forces can intercept the strike, block access, or create a faster lethal counterattack against our buildings, fight only the blocking or racing force needed to make the building strike safe.
3. If the opponent has no effective armed resistance or production/redeployment path, stop searching for combat and sweep the remaining buildings continuously.
4. If several enemy buildings remain and resistance is active, preserve Supalosa's defensive and economic missions. Lease only demonstrably surplus or already-offensive units to a focused building objective.
5. Re-evaluate immediately when a target disappears, a path fails, counterplay returns, or our base threat changes. Avoid fixed long leases that continue after their premise is false.

This is a lexicographic control objective:

- First, avoid immediate loss and preserve the capacity to complete a terminal strike.
- Second, take any safe terminal building strike.
- Third, minimize time to the next enemy-building destruction.
- Fourth, remove enemy forces only when doing so protects the first three objectives.

## Proposed public-state certificates

### Terminal-building race

When exactly one enemy building remains, the finishing overlay may use compatible attackers to approach and attack it even when the building is not currently visible. The command must be based on public last-known state and must hand off to a direct attack when visibility returns. Combat with other forces is justified only if they physically prevent the strike or create a faster threat to our own final building.

### Irreversible-opponent sweep

When more than one enemy building remains, a low-risk sweep may activate if public state establishes all of the following:

- at least one enemy building remains;
- no selectable enemy combatant, including an armed building, remains;
- no enemy production building remains; and
- no deployable enemy base unit remains.

This certificate must be computed from information available to the bot. The experiment harness's suppressed-opponent-quit signal is diagnostic evidence for designing the certificate, never an input to the policy. The sweep is revoked immediately if effective counterplay reappears.

### Active-resistance surplus strike

When resistance remains, the overlay may lease a subset of compatible anti-building units only after protecting existing non-offensive Supalosa missions. The provisional reserve rule is:

`desired_cover = min(N, max(base_reserve, enemy_mobile_combatants + margin))`

where `N` is the number of eligible anti-building units. Units assigned to defense, retreat, scouting, engineering, expansion, or base construction remain protected. Only unassigned units or units in recognized offensive missions are leaseable. If mission ownership cannot be inspected reliably, this active-resistance mode must remain action-free.

The fixed margins under outcome-blind consideration are 0, 2, 4, and 8. At most two margins may advance, selected only from state-exposure and mission-ownership measurements, never from game outcomes.

## Target selection and command liveness

The strike should focus enough compatible force on one building rather than diffuse damage over many targets. Target ranking should use only public state and should prefer:

1. the final building;
2. buildings whose destruction removes production, deployment, or dangerous defenses;
3. reachable buildings with the shortest credible time to physical destruction; and
4. stable targets that reduce command churn when estimates are close.

The controller needs explicit liveness checks. It should measure progress through target health reduction, decreasing approach distance, attacker arrival, and physical building destruction. If none occurs for a fixed prospective interval, it should retry pathing, select a new approach point, reassign compatible attackers, or abandon the invalid objective. A mere attack order is not evidence of progress.

## Safety invariants

- Never treat a score lead, material lead, suppressed quit attempt, or simulator termination without physical destruction as a win.
- Never commandeer units in non-offensive Supalosa missions.
- Never use outcome-bearing games to choose a reserve margin, target heuristic, or timeout.
- Never selectively rerun a losing or drawn game. Technical failure repair is prospective and applies to the full affected design unit.
- Preserve paired seeds, country, slot, map family, exact opponent, engine, and literal termination rules across arms.
- Fall back exactly to V5 and then exact Supalosa whenever an overlay certificate or interface is unavailable.

## Measurements required before claiming improvement

Primary competitive measurements:

- wins, draws, and losses against exact Supalosa;
- paired score difference and paired win-probability difference;
- family-clustered confidence bounds;
- country, slot, theater, and map-family heterogeneity;
- transitions from baseline draw to candidate win and any baseline win to candidate draw/loss regressions.

Mechanism and safety measurements:

- terminal enemy-building count at episode end;
- time from advantage certificate to first building damage, each building destruction, and literal win;
- number of building-focused commands, target changes, retries, and stalled intervals;
- fraction of attackers reaching firing range and fraction of strikes completed physically;
- enemy forces killed because they blocked a strike versus enemy forces bypassed;
- own-building losses, own-base threat, and candidate losses attributable to leased units;
- certificate activations, revocations, malformed mission interfaces, and exact-fallback events.

A positive paper result requires a reproducible literal-win improvement with uncertainty bounds, no unacceptable loss regression, broad enough family/country support, and an ablation tying the effect to the finishing mechanism rather than incidental controller changes.

## Visual evidence plan

After the competitive results are unblinded, retain replay checkpoints for prospectively defined examples rather than selecting only flattering games. Annotated frames should show:

- a final-building race where irrelevant forces are bypassed;
- a blocking force that must be cleared before the building strike;
- an irreversible-opponent multi-building sweep;
- preservation of the home defense while surplus units attack;
- an unseen-building approach followed by visible direct attack; and
- a failure case in which liveness recovery or target switching is necessary.

Annotations should identify the target building, strike force, protected defenders, blocking enemies, approach path, decision time, and subsequent physical destruction. Captions must connect each screenshot to an exact campaign, configuration, seed, family, country, slot, job ID, and replay artifact.

## Research-process lessons

1. Start from the literal win condition and build telemetry backward from it. Aggregate score alone hid the central failure: advantageous games were not being finished.
2. Separate narrow terminal interventions from broad strategy replacement. The broad mission-native controller damaged base safety; the narrow V5 final-building intervention produced the cleanest open signal.
3. Treat Supalosa as a competent fallback and lease control conservatively. A new policy should own only the decision it can justify from public state.
4. Use outcome-blind state audits to choose feasibility parameters. Competitive outcomes belong only in predeclared open screens or sealed confirmations.
5. Diagnose stalls mechanistically. Record physical progress, path progress, mission ownership, and threat changes so a draw yields an actionable failure category.
6. Scale compute only after interface, determinism, equivalence, and short-map diagnostics pass. This avoids spending thousands of games testing malformed control logic.
7. Keep result provenance automatic. Every table row and screenshot must resolve to immutable code, config, seed, map hash, opponent hash, scheduler account, job ID, and raw artifact hashes.
8. Prefer decisive gates. A stage either completes in full and advances, or it fails closed; partial evidence does not authorize the next stage.
9. Reserve genuinely fresh map families before adapting to current results. Repeatedly examining the same families turns them into development data.
10. Write claims last. The eventual paper should explain what the completed experiments establish, including negative results and remaining failure modes, rather than retrofitting experiments to a desired story.

## Next execution sequence

1. Complete and reconcile the already-running sealed V5 confirmation without touching its frozen source or inspecting outcomes early.
2. Run the prespecified passive state/mission-ownership audit and select at most two reserve margins using only exposure criteria.
3. Implement the composite policy with an unchanged V5 outer layer, the multi-building overlay, and exact-Supalosa fallback.
4. Pass deterministic unit tests, exact-fallback equivalence, command-validity checks, and short all-country technical diagnostics.
5. Run an open paired causal screen that separates final-building, irreversible-sweep, and active-resistance effects.
6. Audit the committed candidate map-family reserve for genuine historical freshness and compatibility.
7. Freeze one policy before launching the new-family sealed confirmation and mechanism ablations.
8. Only after complete unblinding, generate registered screenshots, uncertainty tables, the paper narrative, and the candid venue decision.
