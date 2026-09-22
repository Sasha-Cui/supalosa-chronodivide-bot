# D1 execution implementation — 2026-09-22

This supersedes the incomplete-execution status in
[`2026-09-22-d1-implementation-checkpoint.md`](2026-09-22-d1-implementation-checkpoint.md).
The D1 runner, strict projections, provenance context, seed-registration audit,
full-population analysis, pure gate, Slurm wrappers and submission helper are
implemented. **No D1 game has been initialized or advanced at this source
freeze. Formal pure/selector/canary/smoke passes remain required.**

The prospective protocol is unchanged from `e03d137`; its SHA-256 is
`151c4cd5719459b8a6dc218f17d55f7fbc563803a11d6a0b7298a0a121247ebe`.
Submission, source context and pure checks explicitly require that digest.

## Evidence and scope of pre-submission checks

The previous 282-check development evidence remains preserved. The additional
**19 D1 tests** passed: 11 runtime/schema/registration checks and eight
analysis/action-accounting checks. The analysis suite independently computes
the complete 200,000-replicate weighted bootstrap and its index/score/win
digests; a full synthetic 200-block population exercises all 18 contrast/group
streams, both endpoints, all strata and all three policy comparisons.

Durable test evidence:

`research-evidence/unified-intent-arbiter-v2/d1/development/execution-implementation-baeYqE/`

Result SHA-256:
`d7e8f456742fa2e20e53fe5c8ba2d8a55aa17cfb419e417d4ea44eb0205b58e7`.

This is a development check, not the formal launch gate. It preserves source
hashes, syntax checks, logs and a checksum marker; earlier test directories
`runtime-analysis-3Y5tWz` and `analysis-final-tFQMeG` are also retained.
Read-only runtime verification matched all 335 assets, 15 maps and pinned
opponents. The broad metadata scan has **not** been run interactively and
belongs to the selector stage before initialization.

The formal pure gate runs a current-source build, 264 tests in 30 Vitest
files, and 37 Node checks (301 total), with exact counts, source hashes and
scheduler identity. No historical receipt can satisfy a D1 prerequisite.

## Execution and provenance

New code uses `research/runtime/unified-intent-d1-*.mjs`,
`research/scripts/unified-intent-d1*.mjs`,
`research/scripts/submit-unified-intent-d1.mjs`, and
`research/slurm/unified_intent_d1_*.sbatch`.
It does not modify the historical OD1 runtime or outcomes.

The fresh evidence root is
`research-evidence/unified-intent-arbiter-v2/d1`, with `execution-v1`,
`pure-v1`, and immutable `launch-*-intent-v1.json` / `launch-*-v1.json`
receipts. Do not delete these to retry an attempted stage.

There are 42 explicitly bound source/test/protocol/fixture/compiled files,
plus complete driver/candidate runtime trees and the pinned external runtime,
assets, maps, game API and optional AI configuration. The factory passes the
exact arm mode and ceiling. Participant names and RNG identities remain
OD1-equivalent. The old original/capped telemetry contract is unchanged;
D1 diagnostics are separately validated.

The registration scan has an exact allowlist, with no blanket exemption for
the old or new study directories. It includes the complete 905-case A1
registration, canaries/smoke, all seven earlier manifests, and the preserved
failed-V1 journal. Prior manifest hashes are checked against the audited A1
registration. Unknown metadata, changed registrations or seed collisions
block initialization. The entire metadata envelope is validated before
`cdapi.init`.

Slurm stdout/stderr are preserved under `d1/slurm/`, outside the fixed
execution-artifact count. **Competitive logs may contain partial information;
do not read them while any competitive task/finalizer is unfinished. On a
technical failure, preserve them sealed and use outcome-free failure metadata
and static source for diagnosis.**

## Stage sequence and resource contract

The helper requires clean synchronized main and refuses active jobs, existing
intents or receipts. Every source-bound stage uses the same frozen commit.

1. Pure: one CPU, 8 GiB, one hour; no simulator.
2. Selector: exactly 205 zero-update definitions; countries, reciprocal starts
   and seeded initialization checked.
3. Four canary tasks and afterok finalizer: three arms × two observers each,
   24 fixed-horizon episodes total and exact within-arm noninterference.
4. Smoke: three natural/capped episodes, ledger replay and byte/resource
   checks, competitive payloads discarded.
5. Exactly 200 three-arm blocks, `0-199%32`, one CPU/8 GiB/six hours,
   no requeue; afterok fail-closed finalizer, one CPU/24 GiB/eight hours.

All jobs use `pi_jss233/day`. The finalizer first reconciles all 200 clean
scheduler rows, then reads the full record population, verifies 600 launch
entries and replays every ledger. It requires exactly 416 execution files.
The rolling command window remains 900 updates; only the number of blocks
changed from OD1. A three-arm artifact retains the 32 MiB bound.

## Complete analysis, not a success assumption

Primary: unbounded minus capped V2. Secondary: unbounded minus disabled.
The capped-V2-minus-disabled comparison is also retained, even if inconvenient.
All 25 strata, both opponents/countries/factions/slots/directions, status and
W/D/L transitions, first-result times, v5/v6 differences, five-topology
sensitivity and four country/direction clusters are retained.

Every contrast/group uses its own named stream in the frozen D1 SHA-256
domain, 200,000 replicates and sorted index 20,000. Four-cluster intervals
are explicitly sensitivity descriptions, not reliable population uncertainty.
Mechanism improvement, improvement over unchanged StrongBot and absolute
Advanced eligibility are separate decisions. No result authorizes deployment
or manuscript writing.

Action summaries use actual observed update counts and retain all groupings.
Disabled arbiter diagnostics remain null, not zero. Denied unit-ID counts are
occurrences; rates and reference-threshold excursions are descriptive, not
standalone causal explanations.

After all tasks and finalizer finish cleanly, independently audit the complete
D1 endpoint/statistical/action evidence before scientific conclusions or source
changes. The existing OD1 independent auditor must not be treated as a D1 audit.
If D1 does not improve unchanged StrongBot, stop the primary arbitration line;
do not search ceilings or rerun selected cases. M2 remains unachieved.
