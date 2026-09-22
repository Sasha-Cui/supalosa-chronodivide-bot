# D1 implementation checkpoint — 2026-09-22

D1 is implemented through the policy mode, frozen case definitions, telemetry
observer, and episode adapter. **The execution harness and D1 statistical
analysis are not complete. No D1 initializer or simulation has run, and no
D1 Slurm stage has been submitted.** This is not a performance result or a
passed launch gate. The OD1 negative result and deployment defaults are unchanged.

The prospective protocol remains
[`2026-09-22-command-budget-diagnostic-d1.md`](../protocols/method/2026-09-22-command-budget-diagnostic-d1.md)
at `e03d13758bd15101e9c40732370c4f869d19b010`. Do not rewrite it after outcomes.

## Implemented and verified

- `cdc2b01` captured full pre-change synthetic disabled, hard-total, and
  capped-V2 action/telemetry traces before editing the arbiter. The fixture
  includes source and generator hashes; capture refuses a different baseline
  or overwritten fixture. Fixture SHA-256:
  `4355d25c733807c3fd5cc7f4b5a9cb25e77769dc2d34fd603d6f7e814a905b1c`.
- `2c49528` added research-only `separated_lanes_unbounded_d1`, explicitly
  requiring `commandCeiling: null`. Only order/debug budget admission is
  removed. Essential forwarding, atomic production, priorities, grouping,
  validation, retry rules, duplicate suppression, one-forward semantics,
  chunk/request bounds, and deployment defaults remain intact.
- All budget-mode branches in the arbiter and StrongBot startup were reviewed.
  D1 does not fall into the hard-total fallback. The existing action boundary
  needed no modification.
- `5dcdd98` defined the complete 200 three-arm blocks, four canaries, and smoke,
  with 205 distinct fresh seeds and exactly the protocol ordering. Country
  ordinals are local to D1's two-country list (0/1), not the nine-country list.
- The D1 telemetry collector is observer-only. Budget-denied unit-ID occurrences
  and debug calls are distinct from invalid requests, duplicate suppression,
  pending observations, expiry, revocation, and supersession. Counts are
  occurrences, not unique units. Exceeding the reference 115 threshold is
  descriptive in the unbounded mode, not a cap violation.
- The D1 episode adapter preserves the original capped-V2 telemetry object.
  New diagnostics are an additive `budgetDiagnostics` field; the unbounded
  mode has its own explicit-null telemetry schema. Synthetic comparisons
  match complete disabled/capped OD1 payloads after normalizing only the
  study-kind identifier and removing the additive diagnostics.
- Plan and episode validation reject Infinity, NaN, and missing ceilings
  **before** JSON serialization can turn nonfinite values into null.
- `unifiedIntentD1Rng.test.ts` isolates the existing nine synthetic seed/stream
  tests. Do not run the entire historical `seedControl.test.ts` as a pure
  gate: its final suite initializes the real game engine.

The golden fixtures cover deterministic synthetic scenarios, not every
possible gameplay state. Actual observer noninterference still requires the
new complete canary stage.

## Development validation, not launch authorization

A build plus **264 tests across 30 Vitest files and 18 Node checks passed
(282 total)**. These cover the 26-file OD1 semantic, terminal, firewall,
endpoint/replay suite plus D1 mode/plan/episode/RNG tests; the 18 Node checks
include historical runtime/analysis checks and the pre-change golden trace.
They do **not** include a completed new D1 finalizer/analysis test suite.

Durable evidence outside the repository:

`research-evidence/unified-intent-arbiter-v2/d1/development/integration-lLcwvv/`

`result.json` SHA-256:
`b607ba6bd07ed44692099f610c6163fac0302d3eac27c48cd43bae00330c1177`.

This evidence records `precommitDevelopmentCheck: true`,
`formalLaunchGate: false`, zero game initializations and zero advancing
episodes. Source/test hashes were checked unchanged across the run; all logs,
the JSON test report, and checksum marker are preserved. Earlier development
checks are also preserved under `core-tests-5o6Si4` and
`episode-tests-M7F3NL`.

## Remaining implementation before any initializer

1. Implement isolated D1 I/O/context/strict projections, full three-contrast
   analysis and gates, stage runner, Slurm wrappers, and immutable submission
   helper. Reuse the audited OD1 architecture without changing historical OD1
   code or accepting old study receipts as D1 prerequisites.
2. Bind the new source, compiled trees, golden fixture, protocol, tests, maps,
   runtime, opponents and optional AI configuration. Carry a strict metadata
   envelope check before `cdapi.init`. The old factory hardcodes V2 whenever
   enabled; D1 must pass the exact arm mode and ceiling instead.
3. Complete the metadata-only collision audit, including the A1 905-case
   manifest (cases, canaries and smoke), the failed V1 selector journal, and
   all earlier registrations. Do not exclude unknown files by broadly
   trusting a study directory; unknown registrations or collisions fail closed.
4. Implement and independently test all three named contrasts using the new
   SHA-256 bootstrap domain and frozen 200,000 replicates/index 20,000. Keep
   mechanism, policy-improvement and absolute Advanced decisions separate.
   Preserve all 25 strata, five topologies and four country/direction clusters.
5. Commit/push a clean synchronized implementation, then run a current-source
   **complete** pure gate. After independent verification, proceed in order:
   205 zero-update selector, 24 canary episodes, three smoke episodes, and
   only then 200 three-arm tasks (600 games) plus the fail-closed finalizer.

Do not globally replace 900 with 200: the rolling window remains 900 updates.
Use a fresh D1 execution namespace and immutable receipts. Never duplicate
attempted stages, inspect partial outcomes, or edit source while bound jobs run.
A failed D1 scientific result does not authorize a ceiling search. M2 remains
unachieved; the manuscript remains frozen.
