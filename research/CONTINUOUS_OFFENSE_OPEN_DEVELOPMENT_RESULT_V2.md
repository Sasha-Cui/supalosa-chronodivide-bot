# Continuous objective-offense open-development result, version 2

Status: **complete; did not advance**

Completed: 2026-08-14 UTC

## Evidentiary status

This is complete open-development evidence, not a held-out paper performance
claim. Slurm array `22149889` and dependent controller `22149890` ran under
account `pi_jss233` from the frozen source revision
`7ec12901d47e9e3ad4d243c3c321e33c40ae28b1`. All 90 planned shards completed
with exit `0:0`; the dependent controller completed with exit `0:0`.

The technical gate reconciled 1,080/1,080 attempted games, 90 unique physical
scheduler job IDs, all nine countries, both reciprocal slots, and all six
frozen arms. It found zero technical failures, literal-endpoint violations,
information-boundary violations, source/runtime drift, or missing intervention
exposure. Its result-population commitment is
`51b027a2803bad5802ef34b1ed4be303fb20eeaa5fa004535b0ca7f2221ad9dc`.

Authoritative artifacts:

- technical gate SHA-256:
  `0cd94d417d58490d7d1227a0c84b51b4bd9151816ffe8394fd4f685463b7a851`;
- scheduled primary analysis SHA-256:
  `931a2598b6631e4e055a6ecec88b79de67c960ed7f4348c6413b295feeebff7a`;
- prospectively sealed conversion diagnostic SHA-256:
  `8eb2286e6bee343b90970372a7017c4f08fd18b1a8d3a584005a139747670974`;
- pre-unblinding diagnostic source SHA-256:
  `71fa4ed0e6aa6649f589498a1a4bd58f85e025782e2145c4f3ef60dc1da0cdaa`.

The 90 array tasks consumed 73.65 aggregate elapsed CPU hours. No partial
summary or episode outcome was inspected before the controller passed the
technical gate and performed the scheduled complete-population unblinding.

## Primary result

No arm met the frozen advancement rule. Each arm has 180 games:

| Arm | Wins | Draws | Losses | Literal-win probability | One-sided family-clustered 80% lower bound |
|---|---:|---:|---:|---:|---:|
| exact external Supalosa self-control | 41 | 98 | 41 | 0.2278 | 0.1785 |
| frozen macro champion | 27 | 103 | 50 | 0.1500 | 0.0914 |
| macro + all forces first | 32 | 97 | 51 | 0.1778 | 0.1180 |
| macro + buildings only | 23 | 105 | 52 | 0.1278 | 0.0701 |
| macro + route blockers, minimum strike | 27 | 101 | 52 | 0.1500 | 0.0910 |
| macro + route blockers, full strike | 27 | 100 | 53 | 0.1500 | 0.0919 |

The prespecified ranker selected `macro_all_forces_first`, but this is only the
least poor intervention, not an advancing policy. It was 32-51 in decisive
games, had a family-macro literal-win effect of -0.0500 against exact external
Supalosa control, and failed every positive performance gate except a small
effect over the already inferior macro control and a lower draw rate than that
control. Its Allied literal-win probability was 0.1100 and its Soviet value was
0.2625. Country win probabilities ranged from 0.0500 for Alliance and Germans
to 0.4000 for Russians; it did not have wins exceeding losses in seven
countries.

The proposed route-blocker/full-force policy did not improve the frozen macro
core's literal-win probability. Relative to that core it changed literal-win
probability by 0.0000, draw probability by -0.0167, and loss probability by
+0.0167. Relative to all-forces-first it reduced literal-win probability by
0.0278 and increased both draw and loss probability. Buildings-only was worse
still. These complete causal contrasts reject the current implementation of a
fixed target-class preference as a sufficient solution.

## Prespecified conversion diagnosis

The diagnostic was written, hashed, self-tested, and verified to refuse outcome
access before controller completion. It then analyzed all 1,080 committed
episodes without changing the primary selection or advancement rules.

### The frozen macro core is not a competitive base

The macro-only control was 27W/103D/50L against Supalosa, whereas the exact
external self-control was symmetric at 41W/98D/41L. An objective overlay cannot
realistically recover reliable superiority while inheriting a core with this
large deficit, particularly for Allied countries. The next method must preserve
the exact external Supalosa production, defense, scouting, and ordinary combat
core and add a narrow objective controller; the frozen macro champion is
retired from candidate construction.

### The blocker scheduler can persist without irreversible progress

For `macro_route_blockers_full`, 142/180 episodes reached activation. The median
activation tick was 12,600; 38 episodes ended before activation. Among sampled
post-activation decisions, the policy emitted 51,764 blocker-clear, 39,964
regroup, 18,132 building-strike, and 1,479 terminal-strike events. It contained
51,264 adjacent same-target blocker-clear pairs but only 297 observed
blocker-clear-to-building-strike transitions. No event used the
`offensive_liveness_deadline` reason.

This is not proof that every repeated sampled command lacked intervening
physical damage, because telemetry is change-or-120-tick sampled and the
campaign lacks a continuous blocker-health trace. It is, however, direct
evidence that the current liveness mechanism does not terminate persistent
blocker-clear behavior: changing or retaining a mission label can update the
controller's progress clock, and liveness is not tied exclusively to physical
damage, blocker destruction, route improvement, search coverage, or capability
creation.

### Activation is late and sometimes absent

The scheduler activated in 142/180 episodes and did not activate in 38. Its
median activation tick was 12,600. Even when it activated, the median delay to
the first building strike was 48 ticks only among the 59 episodes that ever
produced one, while many games first entered blocker-clear or regroup. This
supports an earlier objective-pressure component, but timing must be ablated
separately from liveness and target selection.

### The final-building reserve contradicts the terminal race

The route-blocker/full-force arm recorded 1,557 decision snapshots with exactly
one enemy building. It reserved exactly two combatants in every snapshot. The
reserved units were sampled idle 1,111 times, moving 1,585 times, and attacking
418 times. The current records do not establish whether a particular reserved
unit could damage the target, so they cannot quantify withheld compatible
damage. They do establish that reserve selection occurs before terminal mission
compatibility and never collapses to zero for the last-building race.

### Full versus minimum strike did not matter at this stage

The full and minimum route-blocker arms both produced 27 literal wins. Their
draw probabilities differed by -0.0056 and mean game lengths by -25 ticks.
Strike-group size is therefore not the next priority while the predecessor core,
activation, and physical-progress liveness remain defective.

## Prospective method decision

The next method version will:

1. wrap the exact pinned external Supalosa core rather than the inferior frozen
   macro champion;
2. activate objective pressure earlier under its own causal arm;
3. define progress only by physical building damage, blocker damage or
   destruction, route-feasibility improvement, search coverage, or creation of
   a missing capability;
4. impose a bounded blocker-clear deadline and fall back to a newly ranked
   building mission when no irreversible progress occurs;
5. use zero terminal reserve for a certified final-building race, or reserve
   only units that cannot contribute compatible damage before the predicted
   finish; and
6. rank buildings by full mission cost, including necessary blocker clearance
   and switching cost, rather than direct building completion time alone.

Before any outcome-bearing screen, deterministic tests and an outcome-blind
all-country live gate must demonstrate exact Supalosa equivalence with the
controller disabled, final-building-versus-100-off-route-tanks priority, true
blocker clearance, stale-blocker escape, physical-progress liveness, dynamic
terminal reserve, target stability, actionable orders, and intervention
exposure in every country and reciprocal slot.

The next campaign must use a new protocol version, disjoint seeds, exclusive
outputs, and complete-population analysis. This result cannot be pooled with
that campaign and cannot support a positive paper claim.
