# Fresh dual-endpoint selector audit

Date: 2026-09-03

Status: **PASS (outcome-blind initialization only)**

This audit closes the zero-update selection stage for the prospectively frozen
fresh dual-endpoint remeasurement. It does not authorize competitive execution
and contains no policy-strength result.

## Frozen inputs

- Study plan: `research-evidence/fresh-dual-endpoint-v1/plan.json`
- Plan file SHA-256:
  `bd48c7d71d7eafe236d7747646c3c5a634976213affae1cef273526ace912f2b`
- Logical plan SHA-256:
  `6e7ca179e9cc095be3391c2b10d0c94be51a5affdcba0bc580fbd48ca03955ca`
- Planning source:
  `bf8f43ef84ea4491c74b1eccd9d4744601e316e4`
- Selector execution source:
  `85762309a400cba376367b0f7799f3fce6b11c1c`
- Passed seed-audit SHA-256:
  `b3efca5e170585ec4c501cb11a7589ff8ec48fb99790c6a47d77d59fc6a32e4d`

The source hashes differ by the documented prelaunch traversal-error hardening.
The selector independently verified that all plan-defining files, maps, assets,
runtime inputs, and the logical plan remained identical.

## Scheduler reconciliation

- Seed audit: job `24650637`
- Selector array: job `24651415`, 16 blocks
- Fail-closed selector finalizer: job `24651416`
- Account and partition: `pi_jss233`, `day`
- Accounting records checked: 18 (audit, 16 array tasks, finalizer)
- State and exit status: every record `COMPLETED 0:0`
- Restarts: zero for every record
- Allocated CPUs: one per record
- Total accounted CPU time: 4,404 CPU-seconds

The raw task identifiers are preserved in
`2026-09-03-fresh-dual-selection-audit/scheduler.csv`. No active
`pi_jss233` job remained when this audit was produced.

## Selection result

- Aggregate selection SHA-256:
  `ca1641860595e7a15f1d6651e7ddc6a8f4f6f9e64382829c34d3f8f7efde7189`
- Completion markers and sidecar hashes: all verified
- Selector blocks: 16
- Exact planned configurations selected: 2,160 / 2,160
- Game initializations created: 2,160 / 2,160
- Simulation updates: 0
- Replacement configurations: 0
- Unique case IDs: 2,160 / 2,160
- Observed starts: exactly equal to every requested candidate/opponent start
- Country, map, start, slot, repeat, pair, and seed bindings: exact
- Outcome-bearing fields: absent recursively
- `competitiveRunAuthorized`: `false`

The independent auditor reconstructed every selected row from the immutable
plan, compared it with its per-block artifact and the final aggregate, verified
all file and provenance bindings, and rejected any outcome-shaped key. Its
machine-readable result is
`2026-09-03-fresh-dual-selection-audit/validation.json`.

## Audit artifacts

- `blocks.csv`: block, job, count, update, and cell-hash reconciliation
- `cases.csv`: all 2,160 exact requested/observed case bindings
- `scheduler.csv`: immutable scheduler accounting
- `validation.json`: fail-closed aggregate validation
- Auditor: `research/scripts/audit-fresh-dual-selection-v1.mjs`

The tabular artifact hashes are recorded in `validation.json`; rerunning the
auditor regenerated the same hashes.

## Interpretation and next gate
This stage establishes only that the fresh populations are feasible, balanced,
collision-audited, and initialized without simulation or outcome observation.
It cannot support a win-rate, superiority, transfer, or endpoint-effect claim.

The next authorized source work is a new passive dual-endpoint competitive
driver, an actual imported-policy/runtime freeze, and the eight prescribed
outcome-blind noninterference canary runs. Competitive scaling remains blocked
until all canaries pass their exact normalized world/action equality gates.
