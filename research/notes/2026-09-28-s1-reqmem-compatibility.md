# S1 scheduler memory-format compatibility — 2026-09-28 UTC

This is a prospective technical harness repair before any S1 initializer,
seed census or advancing game. The frozen S1 scientific protocol is unchanged
(SHA-256 `952bca278befb716a25551d022fd3954b9ed999be375d8d9baf1253c53dc5b54`).
Read this after the September26 harness checkpoint and its earlier linked
foundation/episode/population/runtime notes.

## Reconciled V2 run and consumer defect

Trusted refresh/SSH succeeded after the user reported access restored. No SSH
trust or authentication setting was changed by the agent. Main/fork were clean
at `7f5f39441854190e473b3c54c7fd402c77aa2c04`, with no active Chrono jobs.

Pure job27581146 completed0:0 on pi_jss233/day with one CPU,one node,8GiB,
two-hour limit and zero restarts. Elapsed time was263seconds. Full-step
accounting reports TotalCPU03:30.493 and batch MaxRSS865708K. The -X allocation
query reports TotalCPU00:00:00; do not substitute that value for the retained
full-step process accounting. These are technical resources, not gameplay
strength or an estimate of the strategic study's total cost.

The retained pure result reports329Vitest assertions across33files plus85Node
checks=414, all passed. Native non-scheduler validation rehashed its73artifact
descriptors (including intentional negative/symlink fixtures), exact report
filenames/process results, full1061source inventory, runtime/assets/configuration
and both current compiled trees. This was explicitly a diagnostic check with
accounting disabled; it is not an independent completed launch-gate receipt.
The actual scheduler rows were retained separately rather than fabricated.

Result `pure-v2/pure.json`:340715bytes,SHA-256
`99b6d6b9ea2559da3269a02e8895651a9d615786a239221bffa6c5926ea643f9`.
The checksum marker is COMPLETE_S1_PURE_V1. Original source/program/wrapper,
submissions-v2/pure, readiness/release receipts, STARTED, reports, fixtures and
logs remain immutable. Stdout106bytes,SHA
`07eee723e770d6b33ad52caa7ca9dfd6f459b35be0b98ac298a9928750f1e7d3`;
stderr0bytes,SHA
`e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.

The production consumer's live `schedulerRows("27581146","pure")` call failed
with `S1 Slurm memory unit`. Actual ReqMem is `8G`, while the frozen parser
required a trailing `n` or `c`. The submitted8192M request, initial held snapshot,
ReqTRES and AllocTRES all bind the same8GiB,one-CPU/one-node budget. The failure
is an accounting-format assumption in the harness, not a game failure, a failed
test assertion or permission to skip accounting.

Failure/reconciliation receipt:
`research-evidence/strategic-diagnostic-s1/development/reqmem-review-3qM2id/record.json`,
25800bytes,SHA
`e4183c17478a98c2bc2c1e4de4bb64a6458ae5c773dfd095b5b62d47991a570a`.
It retains full and exact consumer accounting, failure stack, original reader,
every V2 output/submission identity, compiled identities and both Slurm logs.
It marks launchReadiness=false and formalGateIndependentlyVerified=false.

V2 post-build driver:2524files/14149539bytes,
SHA`2fa9bae207698c2478da68f5f42d5862ff90b1707f92af4e89d3d10840fe19af`.
Candidate:240files/1740452bytes,
SHA`e6b4302cc07886353b209dffcdd34388d2ee7043254fe299c218ff7b88ae24f8`.
These belong to the retained V2 source/run. Bind the next formal run's current
trees explicitly; do not substitute historical D1 identities.

## Narrow repair and new technical identity

Only the S1 memory parser, its Node tests/test-count declaration and technical
attempt paths change. K/M/G/T accept either no suffix or an explicit n/c suffix.
All accepted allocations still require exactly one CPU and the exact frozen
memory; no amount, time limit, completion, account, partition, restart, workdir,
source or scientific requirement is dropped. Malformed/unknown units still fail.
The existing one-node/held-resource checks are unchanged.

The old negative fixture incorrectly classified bare8G as invalid; it is now
a positive format fixture. A separate regression uses the complete retained
allocation-row shape and rejects memory-budget changes, extra CPUs/restarts,
wrong time/account/partition and unsuccessful/running states. It calls no
scheduler or engine. All earlier semantic/firewall/RNG/endpoint/observer/
population/golden checks remain in the suite.

The new source-bound gate uses `pure-v3` and `submissions-v3`. V1's cancelled
held attempt and V2's completed run are never overwritten, rerun, or represented
as this new source's gate. The execution-v1 namespace remains unused and the
205reserved case definitions are unchanged and unconsumed. Schema kinds and
markers remain V1 because the record schema is unchanged.

The repaired source needs a fresh current-source formal pure gate because its
source hash changed. Independent gate acceptance is deferred to that new run;
the old V2 result is not relabeled as independently verified. No selector or
other game stage may advance before the repaired gate and independent audit.

## Development evidence

The post-format build and415development checks passed:329Vitest/33files plus
86Node checks, including21S1runtime checks and26harness checks. Failures,
pending/todo/skipped/cancelled checks are zero. No real engine initialization,
advancing episode or full registration census occurred.

`development/reqmem-repair-YkPmpB/result.json`:287314bytes,SHA
`b87fcaaf6e3a5e01f065c6f83fdef0e2311eb93ec18a46021b876d74fa272d6a`.
The directory preserves REPAIR.json, exactdiff, before/after source, complete
reports/logs and every generated fixture. These are development checks, not
a formal Slurm result and not independent audit evidence.

## Next action

Commit and push the logically grouped repair on clean synchronized main, then
use the immutable helper to submit only the fresh V3 formal pure gate.
Freeze tracked source and compiled/runtime files through that job and evidence
verification. Reconcile scheduler first, preserve every result/failure, and
independently audit the full completed415-check output under the documented
receipt contract before any prepare/API initialization.

All prior launch resources, exact416final execution files, per-game/ledger/
sample limits,384MiBcomplete aggregate bound,200case population and209advancing
episode plan remain unchanged. No policy, manuscript, historical outcome,
threshold or seed has changed. M2 remains unachieved.
