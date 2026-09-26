# S1 foundation implementation checkpoint

Date: 2026-09-25. The prospective S1 protocol is unchanged:
`952bca278befb716a25551d022fd3954b9ed999be375d8d9baf1253c53dc5b54`.

**Partial implementation, not a launch gate. No S1 game initialization or
advancing simulation has occurred.** The end-to-end episode adapter, full
population aggregation, provenance/registration context, strict technical
projections, runner, pure gate, submission helper and Slurm wrappers still
need implementation and verification before any S1 initialization.

## Pre-change evidence and policy boundary

Before changing a policy class, the current-source synthetic baseline was
captured from `f19009edc8a11254e1f7d09a6b317e73dd9c8490`:

- Generator: `research/runtime/strategic-s1-golden.mjs`.
- Fixture: `research/fixtures/strategic-s1-prechange.json`, 239,368 bytes,
  SHA-256 `d128869bde111dbde65733b4852c101e275817054e0c9df3c705803a93ea9eca`.
- Commit `9d7d24a` preserves the fixture before accessor edits. Capture is
  source-locked and exclusive. Never recapture from changed code.
- The fixture retains inherited policy control-flow/action traces and the
  existing disabled/hard-total/capped-V2 action/default traces. The original
  pre-D1 fixture remains unchanged.

The only policy-class change is `SupalosaBot.getResearchMissionSnapshot()`.
Default gameplay never calls it. It copies mission name, constructor type,
priority, active state and sorted membership IDs, without updating missions,
sorting their original collections, changing ownership or issuing commands.
An opaque mission-object handle is returned solely for an observer-owned
WeakMap. The observer never dereferences or serializes the handle; the game
object is not frozen or modified. This permits a new mission reusing an old
name to receive a fresh ID and first-observed age. No counter or research
state was added to the gameplay policy itself.

Synthetic accessor/no-accessor action traces are equal. This is not a real
gameplay noninterference claim: the frozen fresh canaries remain mandatory.

## Implemented modules

All modules below are additive under driver `src/training/`:

- `strategicS1Plan.ts`: one disabled gameplay policy, two instrumentation
  variants, 200 cases +4 canaries +1 smoke, exact reserved seeds and counts.
  It reuses pure frozen map/start definitions, not historical game receipts.
- `strategicS1Observation.ts`: public API enum contract, action/window/event
  observation and snapshots of both players, all six public production queues,
  participant-owned live units and candidate-owned mission metadata.
- `strategicS1Validation.ts`: exact nested schemas, optional-null handling,
  complete sample grid, window conservation, checked owners, mission identity
  continuity, event deduplication and maximum unit population.
- `strategicS1Analysis.ts`: per-sample composition/mission descriptions,
  nullable four-screen predicates, per-episode consecutive-sample accounting,
  sampled membership differences and core descriptive distributions.
- `strategicS1Ledger.ts`: bounded gzip-JSONL-base64, checksum verification,
  complete sample/window replay and reconstructed per-episode analysis digest.

The per-episode analysis is a foundation, not the complete S1 finalizer. The
full-population implementation must still provide every required continuous
queue/status/value/mission/order distribution and all prespecified subgroup
and outcome-status descriptions. Required information is retained in the
raw samples and per-sample rows; do not silently drop it from final reports.

## Exact enum and raw-channel contract

The implementation verifies the pinned API's numeric enum order before use:

- Orders 0..18: Move, ForceMove, Attack, ForceAttack, AttackMove, Guard,
  GuardArea, Capture, Occupy, Deploy, DeploySelected, Stop, Cheer, Dock,
  Gather, Repair, Scatter, EnterTransport, PlaceBomb.
- Queues 0..5: Structures, Armory, Infantry, Vehicles, Aircrafts, Ships.
- Queue status 0..3: Idle, Active, OnHold, Ready.
- Build status 0..2: BuildUp, Ready, BuildDown.
- Weapon type 0..2: Primary, Secondary, DeathWeapon.
- Object type 0..11: None, Aircraft, Building, Infantry, Overlay, Smudge,
  Terrain, Vehicle, Animation, Projectile, VoxelAnim, Debris.

Unknown enum values fail closed. Public action wrappers preserve the original
receiver, argument references, return value and property descriptor. Every
public method is counted; each order also has an exact order enum, requested
unit-ID occurrence count and target category: none, position, missing-object,
or owner class (candidate/baseline/other/unowned) × building/nonbuilding ×
live/nonlive/unknown-health. These are observation counts, not action changes.

Startup calls belong to the tick-0 window. Later windows are after the prior
sample through the current sample, with no overlap. Events are the normalized
public destruction/unspawn/owner-change events, deduplicated by exact tick
and event value. Raw event fields and every window count are validated.

The snapshot keeps public credits/power/defeat status and full queue items.
Unit records keep checked participant ownership, rule/type, tile rx/ry,
health/maxHealth, purchaseValue, canMove, isIdle, build status, powered state,
both runtime weapon descriptions and declared weapon-rule slot availability.
Other-owner and non-live records have explicit census counts. An ID lacking
its public unit data fails; it is not silently omitted.

Undefined/null optional fields are retained as null; NaN/Infinity and wrong
types fail before JSON serialization. An absent runtime weapon alone does
not establish that an object is unarmed: absence is known only when both
declared rule slots were observed and both are empty. Otherwise armed status
is unknown. Mobility follows the literal public canMove predicate, including
unknown for missing mobility when armed; no object-type shortcut imputes it.
`HARV` and `CMIN` are excluded as prospectively specified.

## Screen and ledger semantics

Predicates use three-valued logic: known false can determine a conjunction,
known true can determine a disjunction, otherwise needed unknowns remain
null. Availability and sample denominators are retained. No missing value
becomes a measured zero.

Only strictly periodic positive-tick samples count toward four-sample screens;
tick 0 and nonperiodic final samples do not. Dispersion must persist for the
**same mission instance**, not a different large mission at each sample.
Sampled membership deltas are null at first observation or after a gap, rather
than invented transfers. Duplicate/stale member counts remain explicit.

The raw strategic ledger has one header, the exact complete sample sequence,
and one final record linking the public action hash/counts and reconstructed
analysis hash. It enforces the frozen 8MiB gzip /64MiB plain /512KiB-record
limits and canonical base64 checksums. The sampler also checks each record
size before returning it. The future episode/runner must additionally enforce
the combined 32MiB outer-artifact bound together with the endpoint ledger.

The analysis returned by replay is computed from retained samples. This is
the runtime integrity check, not the later independent audit implementation.
Never import this production analysis as the alleged independent final audit.

## Development verification and preserved failures

Current-source build and **331 pure/synthetic development checks passed**:
292 Vitest assertions across 31 files (264 historical +28 new S1 checks),
plus 39 Node checks including both S1 golden checks. No real engine was
initialized or advanced. This is not a complete formal S1 gate or permission
to launch selector/canary/smoke/main.

Evidence outside repo:
`research-evidence/strategic-diagnostic-s1/development/foundation-final-Co5blC/result.json`
SHA-256 `2bee6fd80b5391fdcd61bcb15724f9f7bf1f117819536c169e8b835725c07c28`.
The record binds source files and the test report, and explicitly sets
`precommitDevelopmentCheck=true`, `formalLaunchGate=false`, and zero
initializations/advancing episodes.

Earlier `foundation-LFMSxr` preserves the failed build (TypeScript narrowing
and unsupported Array.at declarations); compatibility fixes did not change
policy or protocol. `foundation-4crEoS` and `regression-xah52a` preserve the
earlier 26-new-test /329-check passes. The final added mobility-null regression
test enforces the literal protocol predicate. No attempt was deleted.

## Remaining integration work

The earlier 330-check pre-format result remains at `regression-v1edwE`.
Post-format attempt `regression-IstbVb` built successfully and its preserved
Vitest report passed all 291 checks, but its controller tried to write a run
log to the same `vitest.json` path and failed EEXIST. Exclusive writing
prevented replacement. After trusted access returned on 2026-09-26 UTC,
every STARTED source binding matched, the report was reconciled, and
`CONTROLLER_FAILURE.json` was preserved. The missing 39 Node checks passed
in `postformat-completion-FH90PP`; result SHA-256
`c8b0c3e862ed0b4f9bb906548e72380a32fd1cf2005a290dd3037b3c8f5b0463`.

Before committing or collecting any observations, protocol review found that
the dispersion predicate incorrectly required an active mission. The frozen
protocol requires a candidate mission with the stated member/dispersion
conditions, without that extra eligibility condition. The conjunction was
removed, active remains descriptive raw metadata, and an inactive same-instance
four-sample regression was added. Original analysis/test source is retained in
`protocol-review-7vJXbI`. The current 331-check result above includes this fix.
No protocol, thresholds, population, gameplay, old outcome or gate was changed.


1. New S1 episode adapter: original disabled D1-equivalent settings/endpoints,
   endpoint-only versus strategic canary instrumentation, complete endpoint
   trajectory equivalence hashes, both ledger reconstructions and strict
   technical-only projections. Keep historical D1/OD1 adapters unchanged.
2. Install the strategic action wrapper after PublicActionAudit installation
   but before original policy startup, so startup calls are included once.
   Sample the final state while public APIs still exist, then check total
   action counts and restore wrappers before instance cleanup. Add full
   synthetic adapter tests, not just sampler/schema fixtures.
3. Implement complete descriptive population aggregation, source/runtime/
   registration context, runner, fresh pure gate and Slurm submission helpers.
   Include all completed D1 registrations and historical failed selector
   identities in the exact metadata allowlist. No interactive duplicate scan.
4. Capture all new source/test/schema/protocol/compiled bindings and commit
   clean synchronized main before any formal CPU Slurm gate. Then advance
   only through independently verified pure →205selector →8canary →1smoke
   →200main plus finalizer. No partial outcomes and no source edits while jobs run.

No S1 initializer, simulation, launch intent or Slurm stage exists yet.
The deployment policy and manuscript remain unchanged. M2 is not achieved.
