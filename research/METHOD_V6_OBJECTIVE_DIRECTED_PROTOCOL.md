# Method-v6 objective-directed closeout protocol

Status: prospective design frozen before Method-v6 implementation or games
Frozen: 2026-08-13 UTC

## Research question

Can a visibility-limited, objective-directed closeout layer added to the exact
pinned external Supalosa `DefaultStrategy` reliably increase literal wins by
concentrating on feasible building kills, while leaving force clearing to the
base strategy when buildings cannot yet be attacked?

This is a hypothesis, not a claim. The first Method-v5 campaign is technically
invalid and partially exposed; no policy-level ranking from it exists and none
of its outcomes may be combined with or used to select Method-v6. Method-v6 is
motivated by the stated last-building win condition, source-confirmed engine
stalemate behavior, and inspection of the frozen controller algorithm.

## Endpoint and baseline

- Use literal building-elimination endpoint v5.
- A win requires opponent-attributed physical destruction of every building
  currently owned by the opponent. Engine defeat, stalemate, resignation,
  cleanup, score, sale, capture, and unspawn are not wins.
- A clean nonliteral engine termination with a defeated combatant is a draw and
  is reported separately. It cannot satisfy advancement.
- Use the exact external Supalosa package checkout and runtime commitments. The
  candidate invokes Supalosa's unmodified `DefaultStrategy` first on every AI
  update; the overlay acts only afterward.
- Disabled-overlay trace equivalence is required before outcome-bearing use.

## Information boundary

The candidate may use own objects, currently visible enemy objects, remembered
enemy-building sightings, public starting locations and map geometry,
visibility and reachability queries, available production, and ordinary
Supalosa state. Only the endpoint evaluator may enumerate complete state.
Evaluator information cannot enter policy decisions or policy telemetry.

## Objective hierarchy

At each eligible closeout interval, apply this hierarchy using only allowed
information:

1. **Feasible building strike.** Construct opportunities from visible and
   remembered enemy buildings. An attacker is compatible only if its known
   weapons can damage the target armor and, when enabled, a static reachable
   firing perimeter or remembered vicinity exists.
2. **Concentrate on one target.** In focused mode, rank feasible targets by:
   currently visible before remembered; nonstalled before stalled when an
   alternative exists; lower estimated volleys to destroy using compatible
   attackers; higher frozen strategic target weight; lower nearest squared
   distance; then object ID. Assign the dispatchable compatible attackers to
   only the first target. A single remaining building therefore receives the
   strike regardless of visible enemy-army size.
3. **Bound home defense.** In bounded-reserve mode, reserve

   `min(N - 1, max(base_reserve, min(max_threat_reserve,
   visible_home_threats + advantage)))`

   of `N` orderable combatants, with zero reserved when `N=0`. Thus at least one
   orderable unit remains available for a feasible building strike, even in the
   limiting example of one exposed building and 100 enemy tanks. Compatible
   strikers are chosen before incompatible units, and higher effective
   anti-building damage is preferred. The cap prevents an arbitrarily large
   visible army from pausing the whole closeout layer.
4. **Clear blockers through the base policy.** Supalosa's ordinary update has
   already issued combat orders. Units not assigned to the building retain
   those orders. If no remembered building has a compatible reachable attacker,
   the overlay issues no target override; Supalosa may fight obstructing forces
   while adaptive production requests the missing movement/damage capability.
5. **Search continuously.** If no enemy building is visible or remembered,
   dispatch the nonreserved search force by attack-move over public enemy starts
   and stale visibility cells. Search never uses complete-state locations.
6. **Replan stalled attacks.** A target that has taken no observed damage for
   `stallTicks` is deprioritized when another feasible target exists. If it is
   the only feasible target, the policy continues the strike while capability
   production and the base policy remain active.

Distributed mode and global-pause mode retain the Method-v5 behavior solely as
prespecified causal controls. Distributed mode load-balances attackers across
up to `maxTargetGroups`; global-pause mode issues no closeout orders when the
visible-threat rule is met.

## Policy schema and frozen screen

Policy schema version 2 adds:

- `targetAssignmentMode`: `distributed` or `focused`;
- `threatResponseMode`: `global_pause` or `bounded_reserve`; and
- `maxThreatReserveCombatants`: the hard cap in the reserve formula.

The fresh open screen contains these eight arms in fixed order:

1. `baseline_control`: exact Supalosa, overlay disabled;
2. `distributed_global_pause`: original memory/search controller without
   adaptive air production;
3. `focused_global_pause`: focus intervention only;
4. `distributed_bounded_reserve`: bounded-reserve intervention only;
5. `focused_bounded_reserve`: both objective interventions;
6. `focused_bounded_air4`: both interventions plus four-country-appropriate air
   finishers;
7. `focused_bounded_early_air4`: earlier activation and air finishers; and
8. `focused_bounded_aggressive_air4`: earlier activation, two-unit base reserve,
   three-tick refresh, three-unit maximum threat reserve, four air finishers,
   and higher production/tech priorities.

The 2×2 arms 2-5 isolate focus and bounded reserve without adaptive-production
confounding. Arms 6-8 test progressively stronger practical policies.

## Telemetry and mechanism diagnostics

Telemetry is schema version 2 and exact-schema validated. It records:

- activation and capability requests;
- home-threat count, computed reserve, and global-pause decisions;
- for every target order: assignment mode, target ID and hit points, visible or
  remembered state, compatible and assigned attackers, total eligible and
  reserved combatants, home threats, target count, estimated volley burden, and
  time since observed building damage;
- an explicit no-feasible-strike reason when remembered targets exist but none
  can be damaged/reached; and
- search attacker and point counts.

Complete open analysis reports literal wins/draws/losses; nonliteral termination
draws; activation/search/capability/no-strike rates; concentration; remaining
buildings; time to literal win; and country breakdowns. No per-game anecdote can
change the frozen design during a campaign.

## Population, execution, and advancement

- Use the same committed 22 permanently open families only as a population
  definition, but generate wholly new Method-v6 plans and exclusive outputs.
- Test all nine countries in matched candidate/baseline country pairs, both
  physical slots, and one common seed per family-country block.
- Run eight arms, 198 shards, 16 launches per shard, 3,168 games total,
  `shortGame=false`, a 24,000-tick cap, no retry, and only Slurm account
  `pi_jss233`.
- Do not combine any Method-v5 games with Method-v6.
- Analyze only after every shard and the fail-closed technical controller pass.

Ranking remains: literal wins; win-minus-loss margin; draw rate; worst-country
margin; median literal-win tick; canonical policy hash. An arm advances only if
literal candidate win probability is strictly above 0.50, wins exceed losses,
wins exceed losses in at least seven of nine countries, and all launches are
technically clean under endpoint v5. The practical goal is stronger than this
screening threshold: sealed confirmation must establish a robust positive
margin with family-cluster uncertainty and no endpoint violations.

## Preflight and probe sequence

Before the full screen:

1. compile and run focused plus full tests;
2. repeat disabled-overlay exact-baseline trace equivalence across all countries;
3. repeat the outcome-blind all-country capability smoke gate;
4. run a declared, permanently open `mf_hills` endpoint probe on the three
   deterministic blocks that previously ended nonliterally, using only the
   baseline-control arm and reciprocal slots; and
5. verify those episodes are either literal outcomes, tick-cap draws, or exact-
   schema nonliteral termination draws, with zero technical failures.

Only after all five gates pass may the new 3,168-game screen launch.
