# S1 execution harness implementation — 2026-09-26

This checkpoint completes the production execution harness as development work.
It does not certify a formal gate, a real initializer, a seed collision census,
an advancing episode, or a strategic result. The frozen protocol remains
14710 bytes, SHA-256
`952bca278befb716a25551d022fd3954b9ed999be375d8d9baf1253c53dc5b54`.

Read the frozen S1 protocol and the foundation, episode, population and runtime
implementation notes first. This note supersedes their remaining
stage-envelope/runner/submission implementation placeholders, not their
observation, scientific, resource, identity or audit contracts.

## Completed components

`strategic-s1-stages.mjs` checks exact outer keys, literal publication flags,
complete source/runtime/pure bindings, scheduler identity, requests, launch
journals and prerequisite hashes. The complete preparation envelope is checked
before API initialization. Its exact 11-path registration census, nine pinned
registrations, original certificate/supporting audit/Gate2 receipt and failed
905-definition OD1 selector history must all match. No actual census was run
during development.

Canary records contain only ordered technical projections. Smoke rejects
competitive/strategic payload fields. Each main record runs the existing strict
episode and cross-ledger replay validators. The canary finalizer binds every
embedded worker's path, byte count, hash and scheduler identity. Main finalization
requires all 200 assignments and all 200 completed allocation rows before reading
the first game record; incomplete/failed accounting blocks even if an injected
accounting service returns an incomplete result without throwing.

`strategic-s1.mjs` connects the existing disabled StrongBot factory contract,
pinned Supalosa/Advanced factories, symmetric full-state firewall, explicit
starts, participant random-stream identities and seeded lifecycle. API.init
remains behind complete metadata verification. Every initialization/episode is
journaled before its callback. The runner never chooses a policy variant,
changes thresholds or provides a partial-analysis path.

The six execution stages are prepare, canary, canary-finalize, smoke, case and
finalize. Counts remain exactly 205 zero-update definitions, eight canary, one
smoke and 200 main episodes. After the real selector, cumulative historical
zero-update initializations would be 2220 (2015 prior plus205); total S1 advancing
episodes would be209. These are prospective counts, not work already performed.
The finalizer keeps all descriptive distributions and72groups. Its explicit
384MiB aggregate bound is separate from the unchanged32MiB whole worker bound
and every endpoint/strategic sample/ledger bound. Exact final execution count
remains416files; pure evidence, submissions, independent audits and Slurm logs
are outside the execution namespace.

`strategic-s1-tests.mjs` defines the engine-free formal test allowlist:
33Vitest files/329assertions plus85Node checks. It deliberately excludes the
engine-initializing final suite of seedControl.test.ts.
`strategic-s1-pure.mjs` builds current source, records the before/post-build
bindings, runs every allowed test, preserves all synthetic filesystem fixtures,
rechecks source/runtime and publishes an exclusive checksum marker. It never
calls the initializer or registration census.

`strategic-s1-gates.mjs` verifies the formal pure reports, exact test filenames
and zero-failure statuses, process exits, complete fixture inventory, compiled
trees, source/protocol/program/wrapper hashes and scheduler completion.
Prerequisite readers reject traversal, symlinked files/ancestors and changed
artifact descriptors. Synthetic symlink fixtures are inventoried without being
followed.

## Independent verification remains mandatory

The controller must independently verify each formal gate before progression.
The receipt reader does not make an implementation independent merely because a
boolean says so. Inspect and freeze an external auditor, its tests/wrapper and
complete program manifest; audit against retained data without importing the
production validator as the purported independent implementation.

The prospective receipt format is
`strategic-s1-stage-verification-v1` at
`research-evidence/strategic-diagnostic-s1/verification-<stage>-v1.json`.
Stages requiring receipts are pure, prepare, canary-finalize and smoke.
Each receipt binds the payload descriptor, exact source/protocol, audit job,
audit output and a `strategic-s1-independent-program-v1` PROGRAM.json containing
every auditor file descriptor (including audit.mjs and audit.sbatch).
The audit output uses kind `strategic-s1-independent-audit-v1`, its stage,
literal complete/passed flags, source/protocol/payload/program hashes,
independentMetadataAudit=true, discardedPayloadReplayIndependent=false and
exact scheduler identity. The reader rehashes every listed file and reconciles
the audit job as one CPU,8GiB,two hours,pi_jss233/day,zero restarts,repository cwd.
The controller's audit still must check the complete evidence, not just fabricate
these fields.

Scopes are independent-pure-metadata, independent-selector-metadata,
source-bound-discarded-canary and source-bound-discarded-smoke. The last two
explicitly do not claim independent reconstruction of discarded payloads.
The later main audit must independently replay all retained endpoint and
strategic ledgers and reproduce complete population descriptions/flags.
Raw action arguments remain counts/digests rather than independent raw replay;
tick-zero event assertions have the previously documented source-bound scope.

## Submission and held-job safety

`submit-strategic-s1.mjs` accepts only pure, prepare, canary, smoke or main.
The first phase must use a clean synchronized main/fork checkout with all
required harness files. Later phases require the independent receipts above.
The helper checks no active job has the repository workdir and refuses existing
attempt/submission/output reservations, including dangling symlinks.
Its source/runtime freeze, intent, raw sbatch response, receipt, initial scheduler
snapshot, readiness receipt and release intent/response are exclusive artifacts.

Each job is submitted held. Slurm's actual pending/priority-zero job record must
match account,partition,one node/CPU/task,requested memory/time,zero restarts,
no requeue/no GPU TRES,wrapper and repository workdir before READY.json is written.
The worker revalidates the full submission argv, source/runtime freeze, receipt
hashes, held scheduler evidence and prerequisite exports before any initializer.
An array and its afterok finalizer both receive durable receipts before release.
Finalizers are released first with their dependency intact, then workers.
Any uncertain submission/release is preserved and stops; reconcile that job,
never retry the phase or create a replacement implicitly.

All requests remain pi_jss233/day,one CPU/one node,no GPUs,no requeue:
pure8GiB/two hours; prepare8GiB/eight hours; canary/smoke/main workers8GiB/six
hours; canary finalizer8GiB/one hour; main finalizer24GiB/eight hours.
Main concurrency is0-199%32; canary is0-3%4. The stage wrapper uses the pinned
explicit-start loader. Node heaps are6144MiB, except18432MiB for the main
finalizer. Shell syntax checks pass. Nothing in these declarations is a real
game runtime or CPU-cost measurement.

## Development verification

The formatted current-source build and414checks passed:
329Vitest assertions across33files plus85Node checks, including26new harness
checks. Failed,pending,todo,skipped and cancelled counts are zero.
At the original harness documentation commit2782478, engine initialization,
advancing games, full registration censuses and real submission calls were zero.
The subsequent held/cancelled request and verified repair are recorded below.

Original harness evidence:
`research-evidence/strategic-diagnostic-s1/development/harness-final-fSiJrF/result.json`
286299bytes,SHA-256
`c0fc111088897419b7e3bf4284fa0174746d493d7e9e3be2a6d3b1513ec1fdbe`.

The harness tests exercise complete205-case synthetic callback ordering;
all four canary configurations; smoke discard; main envelope and dual-ledger
corruption; complete200-case finalization with all72groups/frequencies and
aggregate serialization beyond32MiB; accounting-before-read failures;
source/resource/journal/prerequisite drift; exact submission requests;
immutable rejected/ambiguous mock submissions; own receipt readback;
held-job readiness/release failures; safe paths; strict pure reports; and real
service entry guards that reject before imports/initialization.
Factory/default/firewall/RNG/endpoint/clock/schema/golden tests from earlier
checkpoints remain in the full suite. Mock initializer callbacks are not
actual engine initialization. Mock job IDs/receipts are only preserved
development fixtures, never reservations in the real execution/submission roots.

Preserved earlier attempts this turn:

- `harness-first-D9ZXo1`:24focused checks passed before later hold/entry refinements;
  result370bytes,SHA`534e3861494381768aa8db6f18c9ea99c24111ce7aa6f6a14feeb74849044d18`.
- `harness-regression-hioaGA`:full413checks passed before held-scheduler readiness;
  result288131bytes,SHA`19adc0eb1aeb5ced08d511c6c0daf94bf7bba8e3225969b9302bfe3211befb93`.
- One local wrapper-patch tool-script SyntaxError was caused by unescaped shell
  template interpolation. No remote command executed; the corrected patch
  succeeded. This event is recorded with the first development attempt.

No failed development run was removed. No historical D1/OD1 code, outcome,
protocol or evidence was changed. Both pre-change golden generators/fixtures
remain byte-identical. The original StrongBot policy and manuscript are unchanged.

## Held V1 submission and exact-one-node repair

Pure request27581017 was submitted under source2782478 with a hold.
The controller rejected its scheduler snapshot because Slurm rendered the
one-node request as NumNodes=1-1 while the parser required the literal string1.
Its account,partition,one CPU,8GiB,two-hour limit,zero restarts,no requeue and
repository workdir were correct. The job never started; no READY or release
intent was created. The held request was explicitly cancelled, with
CANCELLED/zero runtime confirmed before any source edit.

The unchanged V1 freeze,intent,response,receipt and scheduler snapshot remain
under submissions-v1/pure. Failure/cancellation evidence is
development/held-submission-review-yEgwUR/record.json,3110bytes,
SHA66260109f1e02a3d096a5141388bc4fda7c35994e2c00cd23cc1b1be2b706b4f.
This was a submission-controller schema defect, not a failed executed pure gate
or a game failure. No seeds or initializer identities were consumed.

The narrow repair accepts only1 and1-1; ranges1-2,0-1 and2-2 remain rejected.
All other resource/source/provenance guards are unchanged. The source-bound
next attempt uses fresh pure-v2 and submissions-v2 paths. Execution-v1 remains
unused. Schema kinds/markers remain V1 because the record schema did not change.
Never rerun/release the cancelled job or overwrite its V1 artifacts.

The post-repair formatted build and all414checks passed again, with
26harness tests including both one-node encodings in every stage.
Current evidence: development/harness-hold-repair-eqoKBH/result.json,
285642bytes,SHAb79ed3ccc5594bfaedced5175474efd5fe6826be7ee5f0e3221bce032de705a8.
The exact repair diff, source, reports and REPAIR.json remain in that directory.

## Next source-bound sequence

After logical commits and clean main/fork synchronization, submit only the
formal pure gate using the immutable helper. Reconcile it by scheduler first.
Do not call the gate complete based on development checks or a running report.
On clean completion independently audit all pure artifacts and write the
verified prerequisite receipt before prepare. The slow registration census
must occur in the Slurm prepare stage before API.init or any zero-update case.

Continue independently verified pure→205selector→8canary→1smoke→200main/finalizer
and complete independent all-population audit. The same source/compiled binding
must remain unchanged through dependent jobs and the complete chain. An
implementation repair after a failed attempt needs preserved failure evidence,
reconciliation and an explicit new technical namespace; no attempted job or
outcome-bearing case is silently reused.

Only complete audited S1 observations may support one separately frozen,
evidence-linked policy intervention. S1 itself makes no superiority, causality,
policy-selection, deployment or manuscript claim. M2 remains unachieved.
