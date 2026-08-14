# Mission-Native Closeout: Amendment 31

Date: 2026-08-14

Status: **failed V25 focused gate and prospective V26 regenerative-progress freeze**

## Preserved V25 result

The corrected V25 focused gate ran as Slurm job `22237913` under
`pi_jss233` from clean tracked `main` source
`8d2b84763f9443cbd5a2859d78aed97c7bea8adc`. The exact V25 policy hash was
`99c7b10c9108ca29963629cbe97009cae43b99a9657b953f80ec1a5d96caeeac` and
the pinned external baseline remained
`165b77a71d0cf5ebd27c65b19d0486bcbae78d0f`.

- artifact: `research-evidence/mission-native-closeout/outcome-blind-focused-gate-v25/22237913/focused-gate-v25.json`
- artifact SHA-256: `5d12a2addc1e8db081553e171566f2ca8ab8695f3ed0a0ae64a5d777bf4d2cf9`
- scheduler: `FAILED`, exit `1:0`, elapsed `00:02:05`, peak RSS 395,852 KiB
- artifact status: `FAIL_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_FOCUSED_GATE_V25`
- four games; both same-seed repeats were exact; no outcome was serialized or inspected

The American trace satisfied the intended launch mechanism. It built two
physical main tanks and emitted one schema-19 direct-building certificate at
tick 4308 with one readiness-owned tank, one readiness-owned screen, nine
compatible attackers, one static route threat, 212.47 predicted building
completion ticks, and 513.91 predicted force-survival ticks. The same-tick
activation handed off every expected unit. The mission inflicted 1,204 physical
building hit points of damage, nearly destroyed the selected construction yard,
and then damaged multiple additional structures before the tick cap.

The American row still failed one validator because the periodic schema-17
screen-production heartbeat never sampled the transient readiness count of one:
the screen became physical immediately before the tick-4308 launch and the next
heartbeat occurred after readiness release reset the count. The schema-19
certificate and the later public snapshot identify that unit as physical `E1`
ID 645. Future gates use the same-tick launch certificate as authoritative
physical readiness evidence rather than requiring a slower heartbeat to sample
the same event.

The African trace built a physical factory, one `HTNK`, and as many as eight
readiness-owned `E2` screens. It never emitted a capability certificate,
activation, handoff, or building-damage event. The screen target was four, but
the type request and infantry queue continued producing after the target was
reached; this spent resources and delayed the combined force. The readiness
mission emitted 151 local-defense events. Its factory was gone by tick 4524,
and the tank was gone after tick 5172. This is continued defensive activity,
not terminal-objective progress.

The artifact did not serialize activation evaluations, so it does not reveal
the exact African blocker timing estimates. Code inspection nevertheless gives
the fail-closed branch: once a tank and screen coexist, absence of schema-19
means that the direct building race was not certified and no selected blocker
could be fully removed within estimated force survival. No stronger empirical
claim is made.

## Frozen V26 repair

V26 preserves V25 except for a bounded regenerative-progress mechanism.

1. Ground-assault production accounts for already queued side-correct tanks
   and screens. It does not refresh a type request when physical plus queued
   units meet the target. When a readiness target is already saturated, stale
   type requests are removed without canceling the last required queued unit.
   This bounds screen overshoot and preserves resources for tanks.
2. Direct building completion remains lexicographically first. A blocker that
   can be fully removed within force survival remains the next choice.
3. If a relevant blocker cannot be completely removed in one sortie, V26 may
   launch the certified tank-plus-screen force only when the force is predicted
   to reach the selected blocker before destruction and can deal positive
   calibrated damage. The mission attacks that blocker, observes physical
   progress or removal, and immediately re-evaluates the building. It does not
   chase off-route forces.
4. Persistent production remains active after an attritional sortie so later
   waves can complete cumulative blocker removal and resume building damage.
5. Emit a schema-20 `attritional_blocker_launch` event containing target,
   blocker, static/mobile classification, readiness counts, compatible count,
   blocker approach, blocker removal, full-route clearance, and force-survival
   ticks. Schema-19 adds `attritional_blocker` as a launch mode.
6. Add exact V26 fields `queueAwareGroundAssaultTargets: true` and
   `positiveProgressBlockerLaunch: true`.

The V26 focused gate uses unused valid seed base `4_265_000_000`. It retains all
V25 determinism, no-resignation, provenance, physical factory/tank, persistent
production, capability, handoff, and positive building-damage requirements.
It additionally validates bounded queue-aware production and accepts either a
safe direct/progressive launch or a schema-20 positive-progress launch. The
gate must serialize activation evaluations for diagnosis but remains strictly
outcome-free.

Only a focused pass advances to an all-country reciprocal-slot gate using
unused valid base `4_292_000_000`. No sealed test-family outcome may be opened
before both gates pass.
