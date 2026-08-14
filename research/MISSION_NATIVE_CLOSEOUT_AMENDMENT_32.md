# Mission-Native Closeout: Amendment 32

Date: 2026-08-14

Status: **failed V26 focused gate and prospective V27 transferable-wave continuity freeze**

## Preserved V26 result

The V26 focused gate ran as Slurm job `22238494` under `pi_jss233` from
clean tracked `main` source
`9a2270b9d15faaae7638bc63c99735d4be2b1675`. The exact V26 policy hash was
`a25457de54e5e31611bd7080daced9b41855cc91828d5ebcef3a1283eee23f1a` and
the pinned external baseline remained
`165b77a71d0cf5ebd27c65b19d0486bcbae78d0f`.

- artifact: `research-evidence/mission-native-closeout/outcome-blind-focused-gate-v26/22238494/focused-gate-v26.json`
- artifact SHA-256: `d30b052c04803cb968cf14be9576e83b0be71c323d724140bbd85486f7b10276`
- scheduler: `FAILED`, exit `1:0`, elapsed `00:02:03`, peak RSS 396,408 KiB
- artifact status: `FAIL_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_FOCUSED_GATE_V26`
- four games; both same-seed repeats were exact; no win, loss, draw, or other outcome was serialized or inspected

Queue-aware production removed the large V25 infantry overshoot. The American
row reached at most three physical screens and the African row reached five,
the frozen target of four plus the permitted one-unit scheduling margin.
Production remained active through tick 5400 in both rows.

The American row built one physical `MTNK` and three physical `E1` screens. At
tick 3888 it emitted a progressive-blocker and schema-19 capability launch with
one readiness tank, two readiness screens, a predicted 2.5-tick blocker
removal, and 47.98 predicted survival ticks. The actual transfer-certified
strike contained only two compatible attackers, both `E1`; the schema-12
activation event reported `assaultTankCount: 0`, and the handoff contained only
IDs 444 and 495. The readiness latch therefore certified a tank that was not
yet transferable into the launched mission. The force inflicted zero physical
enemy-building damage. Later loss of the candidate's army and production
caused 26 calls to the inherited Supalosa resignation action; the literal
endpoint harness suppressed those calls and recorded them. This row supplies
no outcome evidence.

The African row built one physical factory, one `HTNK`, and five physical `E2`
screens, but emitted no activation, capability, handoff, attritional launch, or
building-damage event. Activation evaluations were present from tick 2700
through tick 3588 and were all blocked; every sampled evaluation reported zero
transfer-certified assault tanks. The public state first showed the `HTNK` at
tick 3900, after activation evaluations had stopped, even though capability
production continued through tick 5400 under the existing production-scope
latch.

Source inspection constrains the missing-evaluation cause. At that time the
candidate still had more than the minimum own combatants, the tick threshold
had passed, and no closeout mission existed. The remaining early return is the
unlatched `maxEnemyBuildings` activation check: after the closeout state first
held, an opponent could build above the threshold and disable mission
activation while the production latch continued. The artifact did not
serialize enemy-building counts at every tick, so this is a source-backed
inference rather than a directly observed count claim.

## Frozen V27 repair

V27 preserves V26 except for two sealed continuity requirements.

1. Once the public state has entered the declared closeout scope, activation
   scope remains latched for the rest of the game. Later enemy construction
   cannot disable target evaluation or leave the newly produced assault force
   in a production-only state. This latch does not activate before the original
   low-building gate first holds.
2. A readiness latch is necessary but no longer sufficient for launch. When
   the transferred-capability option is enabled, the exact compatible force
   selected for handoff must itself contain at least one side-correct main tank
   and one side-correct screen unit. A tank or screen that is physical but still
   locked in another mission delays launch until it is transferable.
3. Activation telemetry advances to schema 21 and records public
   enemy-building count, whether activation scope is latched, the compatible
   tank and screen counts, and the resulting transferred-capability decision.
4. Direct building completion remains lexicographically first; safe relevant
   blocker clearance remains second; positive-progress relevant-blocker
   clearance remains third. Target priority, route geometry, production
   targets, and combat estimates do not change in V27.
5. Add exact V27 fields `persistentCloseoutActivationScope: true` and
   `requireTransferredGroundAssaultCapabilityForActivation: true`.

The V27 focused gate uses unused valid seed base `4_285_000_000`. It must
observe schema-21 evaluations after a physical main tank exists, exactly one
launch containing a transferred tank and screen, exact handoff, bounded
queue-aware production, no resignation attempts, and positive physical
enemy-building damage in both country rows. It remains outcome-free and repeats
each row exactly.

Only a focused pass advances to the prespecified all-country reciprocal-slot
gate. V26 seed `4_265_000_000` is never reused, and no sealed test-family
outcome may be opened before the technical gates pass.
