# Fresh dual action audit V1 pre-execution failure

Recorded: 2026-09-05

## Decision

The complete-population action-resource audit V1 is invalid before execution.
No V1 action-audit output was emitted. The V2 competitive evidence and its
scientific gates are unaffected.

## Trigger

Protocol V1 was frozen at commit
`f5c3a72669ea40a090458ce365be3799f2e05629` before any V2 scientific field was
read. After scientific access, its integrity section was compared against the
complete V2 rows. It required “2,700 unique action hashes.”

The complete `games.csv` contains 2,700 indexed rows but 2,520 distinct
`actionSha256` values. Exactly 180 hash values occur twice and no value has
multiplicity above two. The 360 involved rows are the 180 frozen paired Peak
observations: `strategy_both` and `deployed` have exact action, ledger, v5,
and v6 equality for every pair. Duplicate hash values therefore represent
legitimate identical executions, not duplicate rows or missing evidence.

Two additional wording defects were identified before audit implementation:

- `bySideAndMethod` is a sparse map of nonzero calls, so requiring every cell
  to “expose” all 15 methods would incorrectly reject valid zero counts; and
- the finalizer aggregate exposes a global corpse-target count but not a global
  action-call scalar, so the latter must reconcile to the sum of the 2,700
  `games.csv.actionCalls` values rather than a nonexistent aggregate field.

## Scope

The defect concerns only the post hoc descriptive action-resource audit. It
does not change, rerun, relabel, or exclude any game; alter any competitive
gate; or affect the finalizer’s complete scheduler, ledger, endpoint, outcome,
or provenance validation.

V1 remains immutable and must not be executed with an undocumented
interpretation. Amendment A1 prospectively replaces only the three defective
integrity clauses. All estimands, groups, weightings, bootstrap settings,
outputs, exclusions, and scientific limitations remain frozen.
