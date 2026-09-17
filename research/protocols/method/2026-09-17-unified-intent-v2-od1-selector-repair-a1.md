# OD1 amendment A1: selector metadata publication repair

Frozen: 2026-09-17, after complete diagnosis of selector 26516850 and before
any A1 initialization or competitive outcome.

Parent protocol:
`research/protocols/method/2026-09-17-unified-intent-v2-open-development-od1.md`.

Failed predecessor:
`research/results/2026-09-17-v2-od1-selector-publication-failure.md`.

## Narrow reason and non-negotiable boundaries

Execution V1 initialized all 905 definitions at zero updates, then failed
publication because filesystem metadata keys containing `inventory` were
rejected by the competitive-field prohibition. Its manifest is invalid.
There were zero advancing episodes and no competitive information on which
to select a population or intervention.

Preserve V1, its failed status, all receipts, the 905-entry journal, and the
independent failure audit. Do not recover a success marker from control-flow
inference and do not reuse individual V1 cases. This amendment authorizes a
new complete execution, not a selective retry of V1.

## Sole implementation repair

1. Rename filesystem metadata fields to `registrationRoot` and
   `registrationAfterUtc`. Do not relax the prohibited-field checker.
2. Build and validate the complete source/runtime/plan/seed-audit technical
   envelope before simulator initialization; repeat validation on the complete
   published manifest. Add regression tests for the actual metadata builder,
   the formerly rejected keys, and nested prohibited competitive fields.
3. Pin this amendment and the parent protocol. Use new immutable roots and
   submission intents/receipts. Rerun the complete current-source pure tests.
4. Register the prior 905 zero-update identities as consumed metadata from the
   hash-bound failed journal and verify that no A1 identity overlaps them.

These changes do not affect policies, game dynamics, priorities, available
information, action ceilings, observation mode, outcome definitions, horizons,
analysis, or advancement decisions.

## Complete fresh population

The structural population is unchanged: the same 15 pinned maps, Supalosa
across all 15, Advanced across ten HFO variants, nine countries, both slots,
and both orientations of the first two starts. Preserve exact map/country
order, arm order, and all 900 case indices.

- Competitive cases: seed `3,350,108,000 + caseIndex`, indices 0–899.
- Four canary configurations, in the parent's unchanged order:
  seeds `3,350,109,000` through `3,350,109,003`.
- The unchanged HFO LE/Supalosa smoke configuration: seed `3,350,109,100`.

The new range is chosen before outcomes and must pass the original complete
metadata-only collision audit, now including the failed V1 journal. Any
collision or unrecognized registration blocks launch; no silent seed shift.

The original V1 seed identities remain abandoned and are not used in A1
gameplay or combined with A1 evidence.

## Execution and accounting

Use `research-evidence/unified-intent-arbiter-v2/od1/execution-a1`, a new
`pure-a1` result, and `launch-<phase>-a1.json` /
`launch-<phase>-intent-a1.json` receipts. Never delete or overwrite V1 files.

A1 has exactly 905 zero-update initializations, 16 fixed-horizon canary
episodes, two outcome-discarding smoke episodes, and 1,800 competitive episodes
in 900 paired tasks. Cumulative selector accounting across the preserved
failed V1 and A1 is 1,810 zero-update initializations; A1's scientific advancing
budget remains 1,818 episodes. Report both, without hiding the failed attempt.

The same pure → selector → complete canary aggregate → smoke → paired array
and complete finalizer ordering applies. Use pi_jss233/day CPU jobs, main
only, concurrency at most 64 for pairs, no requeue, no source edits during
source-bound stages, no partial result inspection, and no retries or exclusions
within A1. Preserve exact launch journals and scheduler identities.

## Unchanged analysis and decisions

All parent estimands, 200,000-replicate named SHA-256 bootstrap streams,
benchmark/topology/country-direction groups, quantile convention, Wilson
bounds, endpoint reconstruction, absolute/relative/safety gates, storage
limits, and uncertainty reporting remain exactly unchanged.

V6 is primary; V5 is passive measurement evidence. The cap remains 24,000
updates. A technical pass still makes no claim of policy improvement.
Replication, deployment, or paper writing cannot follow a failed gate.
