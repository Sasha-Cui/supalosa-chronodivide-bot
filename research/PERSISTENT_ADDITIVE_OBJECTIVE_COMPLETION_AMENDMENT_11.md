# Persistent Additive Objective Completion: Amendment 11

Date: 2026-08-14

Status: prospective architecture transition after a completed outcome-free gate

## Completed evidence

Compatibility-v11 completed as Slurm job `22198057` under account `pi_jss233`.

- source commit: `eaa11cab6bcb4bb6084bf0221fbed75b8a728e64`
- artifact: `research-evidence/persistent-objective/outcome-blind-compatibility-v11/22198057/compatibility.json`
- artifact SHA-256: `72aef53ce2fd476d4b743c643c6122670c939c3dc2edf35e5cbd1f7a3951fe9b`
- scheduler state: `FAILED`, exit code `1:0`, elapsed `00:08:03`
- artifact status: `FAIL_OUTCOME_FREE_PERSISTENT_OBJECTIVE_COMPATIBILITY_V11`
- account attestation: `pi_jss233`
- coverage: 9 countries, 2 reciprocal candidate slots, 4 deterministic repeats per cell, 72 games
- global validation errors: none
- outcome inspected: no

The nonzero scheduler exit was the intentional fail-closed response to the
completed validation artifact, not an infrastructure or simulator failure.

## Outcome-free findings

The full-compatible-offensive-force intervention changed the physical exposure
substantially relative to compatibility-v10, but did not meet its frozen gate.

- passing country/slot cells: 9/18
- failing country/slot cells: 9/18
- aggregate building damage: 2,219 across 285 telemetry events
- aggregate blocker damage: 10,128 across 542 telemetry events
- aggregate route progress: 318.544 tiles across 227 telemetry events
- compatible unit observations: 20,413
- selected unit observations: 16,749

Eight cells issued building-directed commands but produced no physical building
damage. One cell produced no building-directed action. Passing cells ranged from
7 to 394 building damage, so the pass set itself includes fragile exposure and
must not be described as reliable closeout.

The artifact contains no endpoint outcome and supports no win-rate claim.

## Decision

Compatibility-v11 failed the prespecified requirement that all 18 country/slot
cells produce physical building damage. Therefore:

1. Policy V9 does not advance to an outcome-bearing head-to-head screen.
2. No compatibility-v11 cell may be selectively rerun or used to tune a
   country-specific exception.
3. The persistent additive objective-completion overlay is retired as the
   primary closeout architecture.
4. No further target-ranking, target-rotation, lease-cap, or force-fraction
   amendment is permitted inside this retired line.

The evidence is consistent with a lifecycle conflict: the overlay can expose a
large offensive force and sometimes damage buildings, but it frequently spends
the remaining horizon clearing blockers, loses actionable mission ownership, or
falls back before completing a coherent eliminate-all-buildings sequence. This
is an inference from outcome-free command and damage telemetry, not a proven
causal claim.

## Next architecture

The next candidate must be mission-controller-native rather than an additive
order overlay. Before implementation, audit the existing building-elimination,
attack, defence, and all-in mission lifecycles and freeze an interface that can:

- own a coherent offensive force for the duration of a closeout campaign;
- preserve a bounded home-defence force only while a concrete home threat exists;
- choose between direct building destruction and removal of a genuinely
  intercepting enemy force using a completion race;
- regroup or retarget without returning units to an incompatible predecessor
  mission between decisions;
- continue until every enemy building is destroyed or a prospectively defined
  technical failure certificate is reached;
- emit public-state-only telemetry for ownership, orders, movement, force and
  building damage, target transitions, and physical completion.

The first gate for this architecture remains outcome-blind and must cover all
nine countries in reciprocal slots with fresh seeds. It must prove deterministic
external-baseline equivalence when disabled, mission ownership, building-directed
orders, physical building damage, and target transitions in every cell before
any outcome-bearing screen is authorized.

## Claim discipline

Compatibility-v11 is engineering evidence that full force commitment is
necessary in some states and insufficient as an additive overlay. It is not
evidence that the candidate beats Supalosa, improves win rate, or solves
Chrono Divide. Paper drafting remains blocked on a frozen positive head-to-head
signal followed by confirmatory evaluation.
