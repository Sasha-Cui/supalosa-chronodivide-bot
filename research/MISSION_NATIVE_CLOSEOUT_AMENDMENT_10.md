# Mission-Native Closeout: Amendment 10

Date: 2026-08-14

Status: completed outcome-free V9 gate and prospective V10 freeze

## Completed V9 evidence

The dual-track reserve V9 compatibility run completed as Slurm job `22215978`
under account `pi_jss233`.

- source commit: `4d31abd6eac8802046cabe090e401d827694a58a`
- artifact: `research-evidence/mission-native-closeout/outcome-blind-compatibility-v9/22215978/compatibility-v9.json`
- artifact SHA-256: `21d55ef2b1d5043fa949f0d824c4cd43bb3fb77c69a18fc5c76fa2023c69a021`
- scheduler state: `FAILED`, exit code `1:0`, elapsed `00:09:10`
- artifact status: `FAIL_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_V9`
- coverage: 9 countries, 2 reciprocal slots, 4 deterministic games per cell,
  72 games
- disabled-policy equivalence: 18/18 cells
- enabled repeat determinism: 18/18 cells
- resignation attempts: none
- outcome inspected: no

The scheduler failure is the gate's intentional fail-closed exit after writing
the complete artifact.

## Outcome-free findings

V9 created a readiness reserve in fourteen cells and achieved positive reserve
growth in all fourteen. Four reserves released into a certified closeout. The
maximum staged reserve was 25 combatants. Aggregate physical building damage
rose to 1,537, with 249 phase-pure blocker allocations, 142 phase-pure building
allocations, zero mixed allocations, and nine blocker-to-building transitions.

Eight of eighteen cells completed the full technical gate. Every activated cell
physically damaged a building. Four reserve-handoff cells activated at tick
2,928; their damage totals were 733, 345, 317, and 98. Four Soviet cells were
already ready and activated at tick 2,700 without a reserve.

Ten cells never activated. The six blocked Allied cells each accumulated a
six-unit reserve. The four blocked Soviet cells each accumulated a 25-unit
reserve. Thus the V9 failure is not a reserve-production or transfer failure.
The direct-building completion certificate remained false even after a large
force had been preserved. V9 is rejected as a complete policy, and no outcome-
bearing screen is authorized.

## Frozen V10 mechanism: certified route clearance

V10 preserves V9's vanguard/reserve split, reinforcement-source target ranking,
and post-activation phase-pure controller. It changes only the readiness
certificate by adding a blocker-clearance branch.

For the already selected building and highest-ranked certified route blocker:

1. Estimate the earliest approach time at which any compatible attacker can
   damage the blocker.
2. Add the blocker hit points divided by aggregate compatible damage per tick to
   obtain estimated blocker-removal time.
3. Retain the existing piecewise force-survival estimate against every certified
   route threat and its intercept time.
4. Launch if the direct building certificate passes, as in V8, or if estimated
   blocker-removal time is no greater than estimated force-survival time.
5. Otherwise continue staging reinforcements under V9 without issuing a
   closeout attack.

This is an objective-relative clearance certificate, not a fixed army-size
threshold. One infantry facing lethal route interception must still wait. A
large reserve may launch when it can remove the obstacle before being destroyed.
An exposed building still launches immediately even if 100 enemy tanks are off
route, because no blocker clearance is required.

V10 adds an outcome-free activation-evaluation event recording the target,
decision branch, route-threat count, building-completion estimate, force-
survival estimate, and blocker-removal estimate. This telemetry is emitted
before activation or at the blocked heartbeat and is the audit trail for the
new certificate.

## V10 outcome-free gate

Pure tests must cover the original off-route 100-tank and in-range cases, reject
a one-unit lethal interception, and accept a sufficiently strong force whose
blocker-removal estimate beats force destruction. The live gate uses fresh seeds
and all nine countries with reciprocal slots. It retains exact disabled
equivalence, deterministic repeats, no resignation, no pre-activation closeout
orders, reserve lifecycle checks, both phase-pure branches, and physical
building damage in all 18 cells. It additionally requires at least one
`blocker_ready` activation evaluation and verifies that every activation is
preceded at the same tick by a passing building or blocker certificate.

If any cell fails, no outcome is inspected. If all cells pass, the first open-
development outcome screen compares exact Supalosa self-play, V9, and V10 on
fresh seeds to isolate the certified-clearance contribution.
