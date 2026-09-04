# Fresh dual-endpoint noninterference canary audit

Date: 2026-09-03

Status: **PASS (technical, outcome-blind)**

The four prospectively frozen canary configurations completed their legacy-only
reference and passive dual-observer runs on identical seeds. Every pair had an
identical normalized public-world trajectory and identical public-action
trajectory. This authorizes implementation and launch preparation for the
complete fresh competitive study; it is not evidence of policy strength.

## Frozen provenance

- Runtime/policy freeze SHA-256:
  `be47027c8526daa961500a1ca2acc3c04dd1a487460d4dec78361faa03ece649`
- Canary aggregate SHA-256:
  `a4e9d38a91dfb9840e30041be52b83b65b564fd3d91ba06292346ad0b8107a52`
- Frozen source:
  `dc17f42d76abf6e449b7ad326a04bbda67d5f650`
- Imported StrongBot tree: 232 files,
  `c2bfaf67767ef675fbce2f6c00c6164d77f93a2f58501cd9f4424175996598fc`
- External Supalosa tree: 172 files,
  `34349919500c8019f9d9b1c2b2a7e2269dd57dde6b3414216bb6336e02977199`
- Original game API:
  `dd398f5c8c2b4c3e3d6eb0f9ca6d7549bf70fee16c5950cd8902616ac922497d`
- Effective explicit-start game API:
  `4ad4a5dd7a6a8ae53a7e671a29d7dd0a5fbad1916d94e52c69c9eda133a30f0c`
- RA2Web Advanced bundle:
  `81d8797b6dd1371ba2dcbd79e25df8b42254290c820159e121a82650fd97a143`
- Revalidated immutable inputs: 23 files, 335 runtime assets, and 15 maps

A component-level validator checks the frozen files and trees directly and
requires the frozen source to be an ancestor of the current synchronized main
branch. This preserves the policy/runtime freeze while allowing later,
separately reviewed orchestration and analysis commits.

## Scheduler reconciliation

- Paired canary array: `24728660`
- Fail-closed finalizer: `24728661`
- Account and partition: `pi_jss233`, CPU `day`
- Workers: four, each running its reference and dual game sequentially
- Technical games: eight
- Accounting records: five (four array tasks and one finalizer)
- State: every record `COMPLETED 0:0`
- Restarts: zero
- CPUs: one per task
- Accounted CPU time: 2,051 CPU-seconds

The raw task identifiers and elapsed times are preserved in
`2026-09-03-fresh-dual-canary-audit/scheduler.csv`.

## Exact paired checks

| Configuration | Map | Action calls | Public snapshots per game | World | Actions | Quit audit |
|---|---|---:|---:|---|---|---|
| deployed / Supalosa | HFO LE | 4,725 | 6,001 | exact | exact | exact |
| strategy_both / Supalosa | Peak | 702 | 6,001 | exact | exact | exact |
| deployed / RA2Web Advanced | HFO LE | 8,037 | 6,001 | exact | exact | exact |
| external Supalosa / RA2Web Advanced | HFO LE | 379 | 6,001 | exact | exact | exact |

Across the eight games:

- exactly 48,000 simulation updates were executed;
- exactly 48,008 normalized public-world snapshots were hashed;
- all four paired world hashes matched;
- all four paired action hashes, call counts, and per-method counts matched;
- bounded corpse-target diagnostic summaries matched;
- all requested and observed starts, seeds, maps, arms, and opponent identities
  matched the frozen manifest;
- no quit attempt occurred and no resignation was forwarded; and
- every artifact rejected outcome-shaped keys recursively.

Detailed hashes and counts are in
`2026-09-03-fresh-dual-canary-audit/pairs.csv`. The machine-readable audit is
`2026-09-03-fresh-dual-canary-audit/validation.json`.

## Preserved bootstrap failure

The first login-shell attempt to generate the runtime freeze failed before
JavaScript execution because the pinned Node binary lacked its ICU library
path. No game was created. The failure is preserved under
`research-evidence/fresh-dual-endpoint-v1/bootstrap-failures`. The unchanged
freeze command then passed with the same explicit ICU/GCC/OpenSSL/Node runtime
environment used by the Slurm scripts.

## Interpretation and limits

The pass supports the narrow claim that adding the passive v6 observer and
dual-manager bookkeeping did not change the public world or policy actions in
these four fixed 6,000-update pairs. It does not prove equality of inaccessible
private engine state, universal noninterference on every map, or competitive
superiority. The absence of direct object-target requests against zero-health
buildings in these short canaries also does not exclude effects through ground
orders, target discovery, or policy thresholds.

The complete 2,700-game study remains unrun. Before launch, its competitive
cell runner, complete-cohort finalizer, ledger replay, scheduler accounting,
storage limits, and all frozen statistical gates must be implemented and
tested on synchronized main. No partial competitive outcome may be inspected.
