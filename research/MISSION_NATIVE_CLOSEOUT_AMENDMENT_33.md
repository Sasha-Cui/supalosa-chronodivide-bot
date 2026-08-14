# Mission-Native Closeout: Amendment 33

Date: 2026-08-14

Status: **failed V27 focused gate and prospective V28 objective-feasibility arbitration freeze**

## Preserved V27 result

The V27 focused gate ran exactly once as Slurm job `22240415` under account
`pi_jss233`, from clean tracked `main` source
`5118f8a29cc8186179af50b5bd5ccf6cd4c88087`. The exact policy identifier was
`c336423f3682dcfccf8a11127c95fc3dad43e969ec88c87b6b1bafb8eb2d342b`; the
pinned external Supalosa baseline remained
`165b77a71d0cf5ebd27c65b19d0486bcbae78d0f` with a clean tracked tree.

- artifact: `research-evidence/mission-native-closeout/outcome-blind-focused-gate-v27/22240415/focused-gate-v27.json`
- artifact SHA-256: `8aaaf18af22b1fedf2bbd5ebf7a9d8f76c5e0141ca2e5ae84b763428e0773c2b`
- scheduler: `FAILED`, exit `1:0`, elapsed `00:02:11`
- artifact status: `FAIL_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_FOCUSED_GATE_V27`
- four games; both same-seed repeats were exact; no win, loss, draw, score, or other competitive outcome was serialized or inspected

V27 fixed the activation-scope discontinuity: every recorded evaluation in both
rows had `activationScopeLatched: true` even after the opponent rebuilt from four
to six buildings. It also exposed two distinct launch-control defects.

In the American row, the actual transfer-certified set first contained a main
tank and screens at tick 3924 and remained composition-ready thereafter. The
readiness mission nevertheless reported zero readiness-owned screens throughout
the trace because the compatible `E1` screens were vanguard units still under
preemptible Supalosa missions. The launch predicate continued to require the
readiness-owned count in addition to the actual transfer-certified count. No
activation or handoff occurred, and physical enemy-building damage was zero.
This is an ownership-bookkeeping veto, not absence of a compatible strike force.

In the African row, the actual transfer-certified set reached one `HTNK` and
three `E2` screens at tick 3876. The policy launched because the selected blocker
was predicted removable in 13.997 ticks, although the same evaluation predicted
1,308.414 ticks to clear the full route and only 121.340 ticks of force survival
against 21 route threats. One expected screen was destroyed before handoff; the
remaining three units transferred exactly. The wave caused no physical
enemy-building damage. A one-blocker certificate therefore did not establish a
viable preterminal building mission.

These are outcome-blind mechanism observations. They do not establish whether
V27 won, drew, or lost either game.

## Frozen V28 repair

V28 implements the force-versus-building doctrine in
`research/TACTICAL_TARGET_ARBITRATION_AMENDMENT_V1.md` at the activation boundary.
It preserves V27 except for the following two exact policy fields and their
sealed behavior.

1. Add `objectiveFeasibilityOverridesGroundAssaultCapability: true`. A direct
   building mission whose predicted completion precedes relevant interception,
   or a blocker-then-building mission whose complete route clearance fits the
   transferred force's predicted survival, may launch on the actual compatible
   transfer set. A fixed tank-and-screen composition heuristic may not veto a
   mechanically feasible objective mission. Actual transfer counts, rather than
   readiness-mission ownership counts, are authoritative for any composition
   check that remains.
2. Add `preterminalRequiresRouteFeasibleLaunch: true`. While more than one enemy
   building remains, a single removable blocker or merely positive blocker
   progress cannot activate the closeout mission when the complete route is
   predicted infeasible. The vanguard remains under active Supalosa combat while
   the readiness force defends, production continues, and the controller
   re-evaluates. This preserves army removal as an instrumental predecessor
   action instead of sending an outcome-irrelevant partial wave to die.
3. The exactly-one-building branch remains lexicographic. If the building can be
   destroyed before relevant interception, attack it regardless of enemy forces
   away from the route or threats to the candidate's base. If the route itself
   prevents completion, clear only the minimum relevant blocker set and resume
   the same building objective; the preterminal full-route restriction does not
   weaken this terminal rule.
4. Activation telemetry advances to schema 22 and records enemy-building count,
   direct-objective feasibility, complete-route feasibility, whether partial
   blocker launch is permitted, actual tank and screen counts, readiness-owned
   counts, and the count of compatible attackers still delegated to active
   predecessor combat.

This is a causal correction, not a parameter search. It distinguishes three
states that V27 conflated: a feasible building strike, a feasible complete
blocker-then-building mission, and an infeasible preterminal route on which
Supalosa should continue fighting the enemy army.

## Frozen V28 gates

Before Slurm use, deterministic tests must establish:

- a feasible direct building mission launches with a compatible infantry force
  even when no screen is owned by the readiness mission;
- a complete route-feasible blocker mission launches on the actual transferred
  force;
- a preterminal one-blocker-removable but complete-route-infeasible state does
  not launch and retains active predecessor delegation;
- the same state with exactly one enemy building retains minimum-blocker terminal
  behavior;
- one reachable final building is attacked despite 100 off-route enemy tanks;
  and
- schema-22 telemetry and disabled-policy behavior are deterministic.

The single outcome-blind focused V28 gate uses fresh valid seed base
`4_292_000_000`. It repeats the American and African rows exactly and serializes
no competitive outcome. It must require correct state-contingent arbitration,
exact handoff for every launch, continued production and active predecessor
delegation when preterminal launch is vetoed, no resignation attempt, and
physical building damage whenever a live objective-feasible launch occurs. It
must not require a doomed route-infeasible row to damage a building merely to
pass a generic assertion.

Only a focused pass may advance to the all-nine-country reciprocal-slot
outcome-blind gate at fresh seed base `4_294_000_000`. V27 seed base
`4_285_000_000` is never reused. No sealed test-family outcome may be opened
before both technical gates pass.
