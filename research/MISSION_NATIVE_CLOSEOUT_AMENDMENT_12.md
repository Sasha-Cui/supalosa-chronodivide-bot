# Mission-Native Closeout: Amendment 12

Date: 2026-08-14

Status: completed outcome-free V11 gate and prospective V12 freeze

## Completed V11 evidence

The aggregate route-clearance V11 compatibility run completed as Slurm job
`22217134` under account `pi_jss233`.

- source commit: `d2000fb15f7175d31596ca2851832ab9f7a54dc4`
- artifact: `research-evidence/mission-native-closeout/outcome-blind-compatibility-v11/22217134/compatibility-v11.json`
- artifact SHA-256: `951e99096172fc97beb86ba8dcb35339be0982e4973ce63e9995f5f22a0f874b`
- scheduler state: `FAILED`, exit code `1:0`, elapsed `00:08:46`
- artifact status: `FAIL_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_V11`
- coverage: 9 countries, 2 reciprocal slots, 4 deterministic games per cell,
  72 games
- disabled-policy equivalence: 18/18 cells
- enabled repeat determinism: 18/18 cells
- outcome inspected: no

The scheduler failure is the gate's intentional fail-closed exit after writing
the complete artifact.

## Outcome-free findings

V11 accumulated a positive readiness reserve in all twelve cells that created
one. Six cells never activated. Twelve cells activated, and eight physically
damaged a building. Aggregate physical building damage was 1,471, with 458
phase-pure blocker allocations, 134 phase-pure building allocations, zero mixed
allocations, and six blocker-to-building transitions.

Four Soviet cells passed aggregate route clearance at tick 2,748 with fourteen
compatible attackers, an estimated route-clearance time of 299.56 ticks, and an
estimated force-survival time of 303.64 ticks. They nevertheless caused zero
building damage. Their execution traces began with one assigned attacker and
only later reached fourteen. Two otherwise identical reciprocal cells did
damage buildings. The four-tick predicted margin was therefore smaller than the
unmodeled ownership-transfer transient.

This is an interface mismatch: readiness evaluated every visible compatible
attacker, but mission ownership did not guarantee simultaneous command of that
set. V11 is rejected as a complete policy. No outcome-bearing screen is
authorized.

## Frozen V12 mechanism: transfer-certified launch force

V12 preserves the V11 target, reserve, aggregate-clearance, and post-activation
mechanisms. It changes only the attacker set used in the readiness certificate.

1. Add a read-only mission-controller query returning the current mission name
   for a unit identifier.
2. A visible compatible attacker is launch-transferable only if it is currently
   unassigned, belongs to the readiness reserve, or belongs to a mission that
   the closeout factory will disband at activation (`attack_*`,
   `retreat-from-attack*`, or `allInAttack`).
3. Exclude combatants locked in defense, scouting, engineering, capability,
   expansion, or other non-preempted missions from building, survival, and
   route-clearance estimates.
4. Continue staging reinforcements until the unchanged V11 certificate passes
   on this transfer-certified set.
5. At activation, disband exactly the enumerated predecessor missions and the
   reserve, then request exactly the eligible force as before.

This is not an army threshold. It enforces consistency between the force used
by the mathematical launch certificate and the force the controller is
authorized to command. Existing public-state and off-route-force rules are
unchanged.

## V12 outcome-free gate

Pure tests must include unassigned units, readiness-reserve units, and units in
preemptible attack missions while excluding locked non-preempted missions. The
live gate uses fresh seeds and all nine countries with reciprocal slots. It
retains disabled equivalence, determinism, no resignation, reserve lifecycle,
same-tick certificate ordering, both phase-pure branches, and physical building
damage in all 18 cells. Each activation-evaluation record adds both total
compatible and transfer-certified attacker counts, and the latter must never
exceed the former.

If any cell fails, no outcome is inspected. A complete pass authorizes only a
fresh open-development comparison of exact Supalosa, V11, and V12.
