# Mission-Native Closeout: Amendment 7

Date: 2026-08-14

Status: completed outcome-free V6 gate and prospective V7 freeze

## Completed V6 evidence

The phase-pure persistent-clearance V6 gate completed as Slurm job `22213318`
under account `pi_jss233`.

- source commit: `acf1d3f0eca327f833a6558f75045028ec7ecc6e`
- artifact: `research-evidence/mission-native-closeout/outcome-blind-compatibility-v6/22213318/compatibility-v6.json`
- artifact SHA-256: `46a1c90326c5e6d0b8e723776a81aa19ab596027c2147707ed30bccd2718e854`
- scheduler state: `FAILED`, exit code `1:0`, elapsed `00:06:14`
- artifact status: `FAIL_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_V6`
- coverage: 9 countries, 2 reciprocal slots, 4 deterministic games per cell,
  72 games
- disabled-policy equivalence: 18/18 cells
- enabled repeat determinism: 18/18 cells
- enabled command intervention: 18/18 cells
- global validation errors: none
- outcome inspected: no

The scheduler failure is the gate's intentional fail-closed exit after writing
the complete artifact.

## Outcome-free findings

- cells with physical building damage: 9/18;
- aggregate physical building damage: 1,459;
- phase-pure blocker allocations: 570;
- mixed blocker/building allocations: 0;
- phase-pure building allocations: 152;
- persistent-blocker heartbeat intervals: 95;
- observed blocker-identity switches: 101; and
- observed blocker-to-building transitions: 7.

All nine failing cells remained in blocker-clear for their entire observed
horizon and issued zero building-phase decisions. The mechanism therefore
executed as specified but could still make force clearance an indefinitely
renewed subobjective.

The target identity separates the clearest execution regimes. Every successful
Allied cell initially committed to the Allied barracks (`GAPILE`); every failed
Allied cell initially committed to a refinery (`GAREFN`). Most failed Soviet
cells remained committed to a refinery (`NAREFN`) while successive conscript
blockers were selected. The one initially weak Soviet cell that later caused
substantial damage was also the only such trace to expose the Soviet barracks
(`NAHAND`) as a target; it transitioned into a building phase and caused 947
damage. Two other Soviet successes began with a large direct strike on a power
plant and caused 199 damage before returning to blocker clearance.

Force size is a competing explanation rather than a resolved fact. Successful
Allied cells reached twelve assigned attackers while failed Allied cells reached
only six. Several failed Soviet cells nevertheless reached fourteen attackers,
and the 947-damage Russian cell began with only one attacker. V6 therefore does
not justify a hard attacker-count threshold. A prospective target-priority
intervention is needed to test whether suppressing the source of replenished
blockers breaks the loop.

The V6 gate does not authorize an outcome-bearing screen.

## Frozen V7 mechanism: reinforcement-source suppression

V7 preserves V6's external strategy, activation rule, minimum tick, zero
reserve, public-state interface, one committed target, capability and
reachability checks, completion-race estimator, eight-tile route corridor,
phase-pure allocation, persistent blocker identity, stall retargeting, and
three-tick order interval. It changes only target ranking from geometric
nearest-first to a structural reinforcement-suppression order:

1. barracks;
2. weapons factories;
3. construction yards;
4. power infrastructure;
5. armed defenses;
6. refineries; and
7. other buildings.

Distance and deterministic identity remain tie-breakers within a structural
class. If the highest-ranked building is incompatible or unreachable for the
available force, the existing capability and reachability logic selects the
next feasible class. Once only one enemy building remains, structural class is
irrelevant and the literal final-building rule is unchanged.

The rationale is instrumental, not score based: a route blocker is worth
clearing only to enable building destruction, and the first building should be
the one whose removal most directly prevents replacement of those blockers.
V7 tests that mechanism without changing force allocation, engagement timing,
or the completion-race threshold.

## V7 outcome-free gate

The fresh V7 gate retains exact disabled equivalence, repeat determinism, all
nine countries, reciprocal slots, zero resignation attempts, both phase-pure
allocation branches, blocker persistence, and physical building damage in all
18 cells. It additionally requires a barracks or weapons-factory target to be
selected somewhere in each faction and verifies that reinforcement priority
outranks refinery priority in pure tests.

If any cell fails, no outcome is inspected. The complete artifact is preserved
and the target-priority mechanism is accepted or rejected from the full
outcome-free population. If all cells pass, the subsequent open-development
screen includes exact Supalosa self-play, V6, and V7 so that target priority is
causally isolated before any confirmatory policy is frozen.
