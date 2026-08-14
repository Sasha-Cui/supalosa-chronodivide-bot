# Mission-Native Closeout: Amendment 14

Date: 2026-08-14

Status: completed outcome-free V12 gate and prospective V13 freeze

## Completed V12 evidence

The repaired transfer-certified V12 compatibility gate completed as Slurm job
`22217842` under account `pi_jss233`.

- source commit: `61d7fc02c5aae66289a0262bfe83b966147171f9`
- artifact: `research-evidence/mission-native-closeout/outcome-blind-compatibility-v12/22217842/compatibility-v12.json`
- artifact SHA-256: `1a2567d911feb29d787ef85394e1fddcbc84dcc9337d983b0caf3a012c41d7bd`
- scheduler state: `FAILED`, exit code `1:0`, elapsed `00:09:00`
- artifact status: `FAIL_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_V12`
- coverage: 9 countries, 2 reciprocal slots, 4 deterministic games per cell,
  72 games
- global validation errors: none
- outcome inspected: no

The scheduler failure is the gate's intentional fail-closed exit after writing
the complete artifact. The separate pre-artifact interface failure in job
`22217753` remains preserved under Amendment 13 and is not an empirical run.

## Outcome-free findings

- cells passing the complete technical contract: 11/18;
- cells with physical building damage: 11/18;
- aggregate physical building damage: 2,353;
- phase-pure blocker allocations: 344;
- phase-pure building allocations: 186;
- blocker-to-building transitions: 6;
- transfer-certification shortfall evaluations: 282;
- maximum total-compatible versus transfer-certified shortfall: 1 unit; and
- no global gate-contract error.

Six Allied cells never activated. They began the closeout interval with five
transfer-certified rifle infantry against ten route threats. While the reserve
held later reinforcements, the predecessor vanguard continued fighting and the
certified force generally became weaker rather than stronger. One such cell
reached the external resignation condition. Arabs slot 0 activated with sixteen
certified attackers but lost its force from eight assigned attackers at the
first execution heartbeat to one at the last without ever entering a building
phase or causing physical building damage.

Every activated cell still exposed a launch-ownership transient. Passing
certificates counted ten Allied or seventeen Soviet attackers in immediate
cells, while execution began with one assigned attacker and acquired the rest
later. V12 correctly excluded one nontransferable unit, but eligibility alone
did not establish simultaneous ownership. V12 is rejected as a complete policy,
and no outcome-bearing comparison is authorized.

## Frozen V13 mechanism: mission-owned assembly

V13 preserves V12's target ranking, public-state interface, aggregate
route-clearance equation, zero terminal reserve, phase-pure persistent
clearance, and post-activation execution. It changes only pre-launch assembly.

1. On the first blocked V13 readiness evaluation, create a full-force staging
   mission rather than a reinforcement-only reserve.
2. The staging mission requests every currently eligible building attacker and
   every later eligible reinforcement. It does not freeze an unstaged vanguard.
3. Disband only the same preemptible predecessor attack missions already
   enumerated by V12. Defense, scouting, engineering, capability, and other
   non-preempted missions remain untouched.
4. Move staged units toward the player's start location while assembling so
   ordinary predecessor combat cannot attrit the purported launch force.
5. Evaluate building completion, force survival, and aggregate route clearance
   using only compatible units currently owned by the staging mission. Visible
   unassigned units and units merely eligible for future transfer contribute no
   readiness credit.
6. Continue staging until the unchanged V12 certificate passes. Do not add a
   fixed army threshold, country exception, elapsed-time override, or forced
   uncertified launch.
7. Release the staging mission, create the closeout mission, and require its
   first execution heartbeat to own at least the force counted by the passing
   staging certificate.

This mechanism makes the readiness force, protected assembly force, and
handoff force the same auditable object. It tests whether V12 failed because
dual-track waiting consumed the vanguard and readiness counted a force before
ownership converged.

## V13 outcome-free gate

Pure tests must distinguish full-force staging from the legacy
reinforcement-only reserve and must exclude unstaged units from readiness. The
live gate uses fresh seeds and all nine countries with reciprocal slots. It
retains disabled equivalence, repeat determinism, no resignation, same-tick
certificate ordering, target focus, phase-pure execution, blocker persistence,
and physical building damage in all 18 cells.

Every cell must create a zero-vanguard staging mission, accumulate a positive
mission-owned force, release it before activation, and expose no closeout order
before activation. Every activation record adds the staged-compatible count,
which must equal the force used by the readiness certificate and may not exceed
the total compatible count. The first execution heartbeat must own at least the
passing staged-compatible count.

If any cell fails, no outcome is inspected. A complete pass authorizes only a
fresh open-development comparison of exact Supalosa, V12, and V13.
