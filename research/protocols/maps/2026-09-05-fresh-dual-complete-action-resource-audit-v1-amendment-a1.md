# Fresh dual complete-population action-resource audit V1 amendment A1

Frozen: 2026-09-05, after recording the V1 pre-execution failure and before
implementing or executing the action-resource audit

Parent protocol:

`2026-09-05-fresh-dual-complete-action-resource-audit-v1.md`

Failure record:

`../../results/2026-09-05-fresh-dual-action-audit-v1-preexecution-failure.md`

## Purpose

This amendment repairs three fail-closed integrity clauses that cannot be
satisfied by the already immutable evidence schema. It changes no game,
scientific result, action estimand, comparison, grouping, weighting, bootstrap
seed, interval, output, or interpretation.

## A1 — Hash identity, not hash-value uniqueness

Replace:

> all 2,700 games and 2,700 unique action hashes are accounted for at their
> exact manifest indices

with:

> all 2,700 manifest indices occur exactly once; every indexed row carries one
> valid lowercase 64-hex action hash; and each value equals the action hash in
> that index’s cell JSON, replayed ledger final record, and `games.csv` row.

Action-hash values are allowed to repeat when two valid executions emit
canonical-identical action streams. The audit must report a complete
multiplicity table and verify:

- exactly 2,700 indexed observations;
- exactly 2,520 distinct action-hash values;
- exactly 180 values with multiplicity two;
- no value with multiplicity above two; and
- every repeated value links the deployed/strategy_both observations of one
  frozen Peak case with exact ledger and endpoint equality.

Any other repetition pattern fails closed. These counts were read only to
diagnose the impossible V1 clause and are now fixed as integrity expectations,
not a scientific selection rule.

## A2 — Sparse method maps

Replace:

> both sides expose the complete fixed public action-method vocabulary

with:

> every key in every sparse `bySideAndMethod` map parses as
> `candidate|baseline` plus one of the 15 frozen public action methods; all
> values are nonnegative safe integers; and the analysis materializes absent
> side-method keys as explicit zeros before summaries.

The complete 15-method allowlist remains the one frozen by
`FRESH_DUAL_ACTION_METHODS`. Unknown methods, unknown sides, malformed keys,
and negative/noninteger values fail closed.

## A3 — Global total reconciliation

Replace:

> independent summaries reproduce the finalizer's global action-call and
> corpse-target totals exactly

with:

> the independent global action-call total equals both the sum of all
> cell/ledger `actionAudit.callCount` values and the sum of all 2,700
> `games.csv.actionCalls` values; the independent corpse-target total equals
> the analogous cell/ledger/CSV sum and
> `aggregate.json.technical.corpseTargetRequests`.

The aggregate has no global action-call scalar; the signed finalizer CSV is
the authoritative finalizer output for that scalar.

## Advancement

Implement and execute only the A1-amended audit. Preserve V1 as a
pre-execution failure. All other parent-protocol requirements remain in force.
