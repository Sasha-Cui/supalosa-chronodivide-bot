# Mission-Native Closeout: Amendment 29

Date: 2026-08-14

Status: **failed V24 focused gate and prospective V25 capability-certificate freeze**

## Preserved V24 result

The single fresh V24 focused gate ran as Slurm job `22237270` under
`pi_jss233` from clean tracked `main` source
`31751d51b1e5cd6b8409b5e28e617df0227d107b`. The exact V24 policy hash was
`f18a2001cf2c7200e5fa25d1e1c83d944d501882175d9999f801aa3d2e2b5a71` and
the pinned external baseline remained
`165b77a71d0cf5ebd27c65b19d0486bcbae78d0f`.

- artifact: `research-evidence/mission-native-closeout/outcome-blind-focused-gate-v24/22237270/focused-gate-v24.json`
- artifact SHA-256: `287d5a6ad60c07402b49219532a40758baa7d05d7a0399a44301e4efd207c2b3`
- scheduler: `FAILED`, exit `1:0`, elapsed `00:02:00`, peak RSS 387,956 KiB
- artifact status: `FAIL_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_FOCUSED_GATE_V24`
- four games; both same-seed repeats were exact; no outcome was serialized or inspected

Both factions activated at tick 2700 and emitted a complete schema-10 handoff
with no alive expected unit left unassigned. The American trace inflicted 431
physical building hit points of damage; the African trace inflicted none. Both
traces subsequently built a physical factory and one side-correct main tank,
but neither ever reported a readiness-owned tank or screen, and neither emitted
a schema-18 progressive-blocker launch.

The key ordering defect is deterministic. Activation and readiness release
happened before the factory, main tank, or factory-triggered screen existed.
Consequently the later purpose-built units were assigned outside the readiness
force, so the V24 progressive-launch mechanism could never be exercised. The
requested screen infantry did enter production and additional infantry became
physical; the zero readiness count therefore does not mean that the infantry
factory itself failed.

The launched force was infantry-only. Public snapshots show all ten American
handoff infantry gone by tick 4500 and all seventeen African handoff infantry
gone by tick 3900. The activation and execution safety model also explicitly
excluded every enemy building from its route-threat set. That excludes armed
defensive structures as well as harmless economy structures. The observed
destruction of the infantry columns near the enemy perimeter is consistent with
this code-level omission, but the V24 artifact does not by itself identify the
lethal attacker, so no stronger causal claim is made.

## Frozen V25 repair

V25 preserves V24 except for one linked launch certificate.

1. When ground-assault readiness ownership is enabled, neither a direct
   building launch nor a progressive blocker launch is certified until the
   readiness mission owns at least one side-correct main tank and at least one
   side-correct screen infantry unit. Pre-existing vanguard infantry may join
   the eventual handoff, but cannot satisfy this certificate.
2. Route-threat analysis includes visible or otherwise policy-observable enemy
   armed structures that can damage at least one compatible attacker. Harmless
   economy buildings remain objectives, not blockers. A defensive structure
   may itself be the building objective; attacking it is still objective
   progress rather than unrelated force chasing.
3. Direct building completion retains lexicographic priority once the
   capability certificate is satisfied. If the predicted building completion
   fits within force survival, attack the building. Otherwise clear only the
   selected relevant mobile or static blocker and immediately re-evaluate the
   building.
4. Emit a schema-19 `assault_capability_launch` certificate containing launch
   mode, target and optional blocker, readiness-owned tank and screen counts,
   compatible attacker count, total and static route-threat counts, predicted
   building completion, selected-blocker removal, and force-survival ticks.
5. Add the exact V25 policy field
   `requireGroundAssaultCapabilityForActivation: true` while preserving both
   V24 fields.

The V25 focused gate will use fresh seed base `4_300_000_000`. It must require
deterministic same-seed traces, zero resignation attempts, physical factories
and side-correct tanks for both factions, concurrent readiness ownership of a
tank and screen before activation, exactly one valid schema-19 certificate per
trace, a complete schema-10 handoff, persistent production, and positive
physical enemy-building damage. It must reject any activation before the
capability certificate. The artifact remains outcome-free.

Only a focused pass advances to the all-country compatibility gate at fresh
seed base `4_310_000_000`. No sealed test-family outcome may be opened before
both technical gates pass.
