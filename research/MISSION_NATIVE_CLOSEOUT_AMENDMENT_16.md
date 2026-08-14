# Mission-Native Closeout: Amendment 16

Date: 2026-08-14

Status: completed outcome-free V14 gate and prospective V15 freeze

## Completed V14 evidence

The staged first-blocker V14 compatibility gate completed as Slurm job
`22232436` under account `pi_jss233`.

- source commit: `d5a47ffde86d82f44b353d7c96feba03fbfa5164`
- external baseline commit: `165b77a71d0cf5ebd27c65b19d0486bcbae78d0f`
- artifact: `research-evidence/mission-native-closeout/outcome-blind-compatibility-v14/22232436/compatibility-v14.json`
- artifact SHA-256: `3297ddd8f88a5bc0562d97cb236bdb362d0f0fead93cd56087e25751eafe89ff`
- scheduler state: `FAILED`, exit code `1:0`, elapsed `00:07:55`
- artifact status: `FAIL_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_V14`
- coverage: 9 countries, 2 reciprocal slots, 4 deterministic games per cell,
  72 games
- global validation errors: none
- outcome inspected: no

The scheduler failure is the gate's intentional fail-closed exit after writing
the complete artifact.

## Outcome-free findings

- closeout activation and launch handoff: 18/18 cells;
- cells passing the complete technical contract: 6/18;
- cells with physical building damage: 6/18;
- aggregate physical building damage: 2,520;
- staged identifiers expected at handoff: 184;
- expected identifiers assigned to closeout: 176;
- expected identifiers confirmed destroyed before handoff: 8;
- expected identifiers alive but unassigned: 0;
- phase-pure blocker allocations: 602;
- phase-pure building allocations: 154;
- blocker-identity switches: 106; and
- blocker-to-building transitions: 2.

V14 resolves the prior ownership ambiguity. Every cell launched, every staged
identifier was accounted for exactly once, and no surviving staged unit was
lost to another mission. Activation absence and handoff failure are therefore
rejected as explanations for the remaining zero-damage cells.

The twelve failing cells all remained in blocker-clear for every sampled
execution heartbeat. None assigned an attacker to a building, entered a
building firing perimeter, or caused physical building damage. The failed
Allied cells launched with five infantry, reached at most six assigned units,
and lost thirteen assigned identifiers while cycling through five to seven
distinct blockers. The failed Soviet cells launched with twelve assigned
infantry, reached at most thirteen, and lost sixteen to twenty-three assigned
identifiers while cycling through thirteen to fifteen blockers. The execution
diagnostic classified every failure as `no_approach_progress`.

The post-launch controller is therefore pursuing a sequence of predicted route
interceptors before advancing. The first blocker is removable, but the next
newly produced or newly ranked blocker immediately replaces it. Force removal
has again become the de facto objective. V14 is rejected as a complete policy,
and no outcome-bearing comparison is authorized.

## Frozen V15 mechanism: contact-triggered clearance with objective advance

V15 preserves V14 full-force mission-owned staging, audited handoff,
first-blocker launch certificate, reinforcement-source target ranking,
committed target, zero reserve, public-state interface, capability and
reachability checks, and phase-pure allocation. It changes only the
post-launch condition for entering blocker-clear.

1. Continue to compute the same public route-threat set, completion race,
   blocker score, and preferred-blocker commitment.
2. If an attacker is already in the building firing perimeter, no route threat
   exists, or estimated building completion is no slower than force survival,
   direct the whole compatible force to the committed building exactly as in
   V14.
3. If interception is predicted to win but the selected blocker cannot yet
   damage any assigned attacker, direct the whole compatible force toward the
   committed building. This is an `objective_advance` phase, not a claim that
   the route is safe.
4. Enter phase-pure blocker clearance only when the selected blocker is in
   contact: its existing public-state earliest-intercept estimate is exactly
   zero, meaning it can currently damage at least one assigned attacker.
5. Once contact clearance begins, preserve the existing blocker commitment
   while that blocker remains a certified route threat, unless a building
   strike becomes feasible under the existing V14 stopping rule.
6. After the contact blocker disappears, resume objective advance. A later
   blocker is cleared only when it independently reaches contact.
7. No elapsed-time budget, country, slot, target identity, force-count
   threshold, map coordinate, or outcome-derived exception is introduced.

This is a spatially reactive two-phase controller. It concentrates fire on
forces that are actually engaging the strike group while forbidding the group
from chasing every enemy predicted to intersect the route in the future. It
directly implements the tactical doctrine that enemy-force destruction is
instrumental and must stop whenever the building objective is actionable.

## V15 outcome-free gate

The fresh V15 gate uses new seeds and all nine countries with reciprocal slots.
It retains exact disabled equivalence, deterministic repeats, clean
`pi_jss233` provenance, full-force staging, same-tick readiness certification,
identifier-level launch reconciliation, no resignation, target focus, and
physical building damage in all 18 cells.

Every cell must expose at least one objective-directed execution heartbeat and
must reach the building firing perimeter or cause physical building damage.
Globally, the gate must expose both an `objective_advance` decision with a
positive nonzero earliest-intercept estimate and a phase-pure contact-clear
decision with zero earliest-intercept estimate. Blocker commitment must remain
persistent across consecutive eligible contact heartbeats somewhere in the
population. No win, loss, draw, score, terminal tick, or opponent-outcome field
is inspected or serialized.

If any cell fails, no outcome is inspected. A complete pass authorizes only a
fresh open-development comparison of exact Supalosa, V14, and V15.
