# S1 A1 repair and launch checkpoint — 2026-10-01

The user approved the reviewed completion plan and required JSS rather than BTK
accounting. The heartbeat remains deleted. This is an implementation checkpoint,
not a completed diagnostic study, stronger-policy result or M2 acceptance.

## Prospective authority and preserved evidence

A1 protocol:
research/protocols/method/2026-10-01-strategic-diagnostic-s1-amendment-a1.md,
9724 bytes, SHA-256
9ea76da3bb2ef960dd192f1fdaefde5ad6b5d6378867a22e6b09d49b49682bde,
committed/pushed as ebf2c14 before implementation.
The original S1 protocol remains byte-identical and separately source-bound.

The original source and both compiled trees were archived before edits under
research-evidence/strategic-diagnostic-s1/development/amendment-a1-preservation-Nlw0cL.
PRESERVED.json SHA-256:
6d64c945ec4470aa6721846a9408e7ffe44112043186882702740f2f635432db.
Archive SHA-256:
228038e124f6c8fe9449ae3e26fbf6b23a453a004aa488c0861959af7779c37d.
All original canary failures, journals, receipts and logs remain untouched.
No old game payload or opaque competitive log was opened or engine game rerun.

## Implemented repair

Finite weapon speed remains numeric. Only supported positive infinity becomes
the exact positive_infinity tag for primary/secondary weapon speed. NaN,
negative infinity and malformed raw/decoded values still fail closed; all other
numeric channels remain finite-only. Changed samples, strategic ledger/header/
final records, plans, diagnostic episodes and population analysis carry V2 kinds.

Only the four player/weapon-slot speed metrics admit the extended domain.
Frequencies retain infinity as an observed value ordered after finite numbers.
Quantiles preserve the frozen rank rule. Sum and mean are explicitly infinite
when any infinity is present, including a mixture with very large finite values;
all-finite arithmetic overflow still fails. Missing values, coverage, all cases,
pooled distributions and equal-case means are preserved. Screening predicates
and thresholds do not change. No gameplay policy class or golden trace changed.

Fresh A1 seeds: main3350130000..3350130199, canary3350131000..1003,
smoke3350131100. New root is research-evidence/strategic-diagnostic-s1-a1:
pure-v1, submissions-v1 and execution-v1. Both Slurm wrappers now default their
logs to this root; submission argv independently fixes the same paths.

Registration reconstructs the original205S1 assignments/observations/launches,
binds its eight attempted canary launches and immutable failure evidence,
and retains unknown observed-update counts as null. Before-init census requires
12 exact paths, independent post-publication13. Historical zero-update count is
2220; successful A1 selection would make2425. No blanket exemption or old receipt
substitution is allowed. The source guard checks both the parent protocol's
original hash and the new amendment.

## Development verification and failures

All development execution below used CPU Slurm pi_jss233/day, one CPU/one node,
8GiB/two hours/no GPU/no requeue/zero restarts, repository cwd. These are not
formal launch-gate receipts. No game initialization or advancing study episode ran.

- repair-check-v1, job28014592: FAILED1:0,20elapsed seconds,10.133CPU seconds,
  batch MaxRSS467000K. A malformed validator import caused TS1005 before tests.
  INPUT/DIRTY.patch/program/held/READY/release/log/failure/accounting identities
  are preserved in FAILURE_CLOSEOUT.json.
- repair-check-v2, job28014816: FAILED1:0,292elapsed seconds,259.750CPU seconds,
  batch MaxRSS1004124K. Build and all336Vitest tests passed; the first seven Node
  groups passed62tests. Harness passed25/26 and rejected its synthetic report,
  whose declared total336 still contained329 assertion rows. The fixture was
  corrected to304+32 rows; the validator was not weakened. Full failures,
  fixtures, source diff, reports and accounting remain preserved.
- repair-check-v3, job28015447: COMPLETED0:0,71elapsed seconds,46.344CPU seconds,
  batch MaxRSS594152K. Focused corrected harness26 and independent pure-auditor
  self-tests20 passed. Controller rehashed all1062bound source descriptors.
  CONTROLLER_VERIFIED.json records the limited scope. This is not a whole
  final-source424check pass.

Final source review additionally covered the very-large-finite/infinite arithmetic
edge in the existing new distribution test. The full final-source424check proof
(336Vitest across33files +88Node) remains the next formal pure job. Current
compiled bytes must be freshly built and bound there rather than assumed from
the earlier development build.

## Logical commits and current documentation

- ebf2c14: prospectively freeze A1 representation/population.
- f185007: reconcile STATUS/README and mark August paper/checklist claims historical.
- 8a08229: lossless S1 A1 schema/statistics, fresh plan and synthetic regressions.
- ce9e0c6: fresh launch/receipt namespace, original S1 registration history,
  current counts and strict parent-protocol guard.
- 83fd053: isolate scheduler log defaults in A1.

No added/tracked file in these commits approaches100MB. The original policy,
manuscript, old results and both golden fixtures/generators remain unchanged.

## Required continuation

Submit the fresh final-source formal pure build/424checks via the immutable held
helper, then independently audit its complete reports/source/runtime/resources.
Only a controller-verified new pure receipt permits the full selector. Independently
audit all205definitions and exact original/new registration population before
any canary. Then verify all four canary pairs and smoke before200main.

The independent pure auditor is staged outside the repository from the preserved
old independent implementation, with A1 counts/namespaces and unchanged strict
parser/filesystem tests. Its source/job/input placeholders must be filled from
the actual complete pure result and frozen with PROGRAM/INPUT/REVIEW/intent
before submission. It has not executed or certified a gate.

The new selector auditor must independently reconstruct both original and A1 S1,
all OD1/D1/history, exact12/13-path census and consumed identities. Implement the
full independent population auditor before main submission. It must reconstruct
all retained ledgers, windows, flags, distributions and72groups with the extended
speed semantics, using no production validator/analysis import as reconstruction.

Keep all source/compiled/runtime bytes unchanged while any bound job is active
and through verification. Read scheduler completion before payloads; preserve
every failure and namespace. All formal gates/audits remain pi_jss233/day CPU
Slurm with the amendment's exact resources. No partial competitive inspection,
selective retry, automatic seed shift, manuscript change or deployment.
