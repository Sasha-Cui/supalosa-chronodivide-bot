# Fresh dual-endpoint full retry V2 amendment A1

Frozen: 2026-09-04, before manifest creation or any V2 game

## Trigger

The first outcome-free `prepare` invocation for V2 stopped before writing a
manifest because the runner referenced `v1CandidateSourceGitTree` instead of
the locally computed `v1CandidateSourceTree`. The failed invocation created
only the empty directory:

`research-evidence/fresh-dual-endpoint-v1/execution-v2-full-retry/manifest`

No game initialized, no update executed, no competitive field was read, and
no manifest or completion marker exists in that root. Preserve the empty root
as zero-game preparation-failure evidence.

## Prospective repair

This amendment changes only:

1. the variable binding used to record the unchanged candidate source tree;
2. the exclusive execution root, now
   `research-evidence/fresh-dual-endpoint-v1/execution-v2-full-retry-a1`; and
3. the replacement manifest, which binds both the base V2 protocol and this
   amendment by SHA-256.

All 2,700 scientific assignments, seeds, arms, maps, opponents, endpoints,
caps, analysis gates, scheduler requirements, node exclusions, and
non-pooling rules remain exactly as frozen in the V2 base protocol. This
amendment authorizes manifest preparation only after the corrected runner,
Slurm script, structural tests, and analysis tests are committed on clean
synchronized `main`.

The old empty root must never be reused, deleted, or interpreted as a study.
