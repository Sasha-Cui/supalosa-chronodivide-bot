# Method-v3 prospective amendment 3: complete Stage-2 recovery

Status: **frozen on 2026-08-12 before any replacement campaign generation or
replacement gameplay**.

## Failure record

The primary Stage-2 campaigns for optimizer runs 0 and 3 are invalidated in
full by identical pre-game infrastructure failures:

- run 0 array `22024004`, controller `22024005`, campaign SHA-256
  `5b049ca6b0022d0f5e11c3fc1de467cb60b694cb649673ec935ced1008e3e22c`,
  and array-launch SHA-256
  `a6415a95a2fd762b36b4eafd22f4ecf155106c65aa5c9d17c224156926b1372c`;
- run 3 array `22025430`, controller `22025431`, campaign SHA-256
  `d8bf5df2ce0d2d4024b45c1e4b415ba2e00d520322b308c0c03b2bef61fbbe82`,
  and array-launch SHA-256
  `f5b1386b9d218f7e53f1d999888da715184305a3ccfe3a5ec031319fce489b87`;
- in both arrays, logical task 197 failed before creating its evidence directory
  with Slurm exit code `141:0` under account `pi_jss233`;
- under `set -euo pipefail`, the account parser allowed `awk` to exit after its
  match while upstream `tr` was still writing, so `tr` could receive SIGPIPE
  and make the command substitution fail with status 141; and
- the complete failure audits have SHA-256
  `9728b7859b2e580dc0df724cdd6a5804a1638592194ea3ba60113c7c95f5427a`
  for run 0 and
  `28ec158cc141e89a29d2bac9680cbe1c7c4136f65afe12de6d487e813a9bca8e`
  for run 3.

Run 0 completed 185 shards before cancellation; 12 tasks were cancelled. Run
3 completed 181 shards before cancellation; 16 tasks were cancelled. Neither
failed task launched a game. The dependent controllers were cancelled. These
partial results are preserved but remain sealed and are permanently excluded
from reduction, finalization, cross-run development selection, and paper
claims. No outcome was inspected to decide this repair.

The execution revision is the clean `main` commit containing this amendment.
Its exact identity will be attested by a new all-country outcome-free Stage-0
interface gate and copied into both replacement campaigns. The parser repair is
the infrastructure-only parent commit
`eae36a2facfa1d5a997c97249e970ccbe6043b50`.

## Prospective replacement

Campaign version `stage2-recovery-v1` replaces the **complete** Stage-2 blocks
for optimizer runs 0 and 3. Each replacement keeps exactly the already frozen:

- three Stage-1 survivor policies for that run;
- 22 opened historical training families in their original order;
- all nine country mirrors in their original order;
- both reciprocal candidate slots;
- 18,000-tick limit, literal building-elimination win invariant, telemetry,
  reduction rule, and pinned Supalosa runtime; and
- 198 shards and 1,188 launched games.

No policy, family, country, map, slot, endpoint, ranking rule, or scalar search
choice changes. Only the source attestation, safe scheduler parser, campaign
version, job identities, and engine seeds change.

The recovery engine-seed base is prospectively fixed to

`3,900,000,000 + run_index * 10,000,000 + 2,000,000`.

The row-major family-country shard ordinal is then added using the existing
paired-seed primitive. Thus run 0 uses base `3,902,000,000` and run 3 uses base
`3,932,000,000`. These domains are disjoint from every primary optimizer run
and from each other.

Both immutable recovery campaigns must be generated before either simulation
array is submitted. A dedicated launcher may submit only runs 0 and 3, only
Stage 2, only under `pi_jss233`, and only after validating the exact failure
audits and a passed 18-match outcome-free all-country interface gate on the
execution source. It writes exact array and controller job IDs, campaign hashes,
source commit, account, and parent evidence. Existing recovery roots may never
be reused.

## Advancement rule

Each replacement block must independently establish all 198 scheduler tasks as
`COMPLETED` with exit code `0:0` under `pi_jss233`, all 1,188 literal-endpoint
games accounted, no nonempty shard error log, no technical failure, and no
actual-win invariant violation. Any replacement failure blocks that entire run
again; there is no selective rerun.

Only the passed recovery finalizers for runs 0 and 3 and the passed primary
finalizers for runs 1, 2, and 4 may enter the prespecified cross-run finalizer.
Optimizer outcomes remain open-training evidence, not a paper claim. Fresh-map
development and the diagnostic protocol remain separately gated.
