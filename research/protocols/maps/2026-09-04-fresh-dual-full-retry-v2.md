# Fresh dual-endpoint full-population retry V2

Frozen: 2026-09-04, before any V1 competitive outcome was inspected

## Purpose

Execution V1 failed its scheduler-integrity gate after two compute nodes were
lost. This protocol replaces the entire execution. It is not a selective
repair, an enlarged sample, or a second statistical replicate.

The scientific population, arms, maps, opponents, seeds, endpoints, 90,000
update cap, quit suppression, action boundary, and decision gates remain
exactly those frozen by:

- `2026-09-03-fresh-dual-endpoint-remeasurement-v1.md`;
- `2026-09-03-fresh-dual-endpoint-seed-amendment-a1.md`; and
- V1 manifest SHA-256
  `137575de8d55b7a832ceced58f23f22b84b132416bb4d58ff7ec43e9bb1a7197`.

No V1 result field may be read to implement, launch, or interpret V2.

## V1 failure

Array `24734770` produced all 2,700 sealed cell artifacts, but tasks 2604 and
2607 were recorded as `NODE_FAIL 1:0` after their artifacts were sealed.
The fail-closed finalizer `24734771` was cancelled by dependency and emitted
no aggregate. The frozen requirement of 2,700 `COMPLETED 0:0` task records
therefore failed. The immutable disposition is recorded in
`research/results/2026-09-04-fresh-dual-v1-scheduler-failure.md`.

## Replacement population

V2 contains exactly 2,700 games. For every game index 0 through 2,699, its
assignment must equal the corresponding assignment in the V1 manifest under
canonical JSON equality. The replacement manifest must additionally bind:

- the V1 manifest bytes and SHA-256;
- the unchanged outcome-free selection and plan;
- the unchanged frozen candidate, external Supalosa, RA2Web Advanced,
  game-api, assets, maps, and endpoint implementations;
- the V2 analysis, runner, and Slurm source hashes;
- the candidate and baseline transitive dependency-tree hashes; and
- a proof that candidate/baseline executable package bytes did not change
  between the V1 and V2 source commits.

The requested engine seeds are reused because they were prospectively frozen,
never inspected scientifically, and the entire population is replaced.
V1 and V2 observations must never be pooled.

## Execution

The exclusive root is:

`research-evidence/fresh-dual-endpoint-v1/execution-v2-full-retry`

Run one Slurm array `0-2699%64` under `pi_jss233/day`, one CPU and 8 GiB per
task, at most 12 hours, without GPU or requeue. Exclude the two nodes implicated
in the V1 incident, `c1102u03n03` and `c1102u07n01`, at submission time.
This exclusion is based only on scheduler evidence and changes no scientific
assignment.

Every task writes to a new exclusive directory and must finish with:

- a complete technical cell JSON;
- a bounded compressed reconstructable ledger;
- independent SHA-256 sidecars;
- zero forwarded resignation;
- a completion marker written only after every artifact is closed; and
- Slurm state `COMPLETED`, exit `0:0`, zero restarts, account
  `pi_jss233`, partition `day`, and one allocated CPU.

Any other scheduler state invalidates all of V2. Do not accept a post-seal
node failure, selectively rerun a cell, or aggregate a successful subset.
A later repair, if needed, must again be prospectively frozen for the entire
population.

## Pre-unblinding analysis correction

V1 source review found a descriptive-only defect before unblinding:
`fresh-dual-analysis-v1.mjs` omitted `mapId` from multi-map endpoint-effect
clusters and selected only the 18- or 36-cell critical value. V2 must use a new
analysis module; V1 source and artifacts remain unchanged.

The V2 endpoint-effect analysis must:

1. use `mapId,country,candidateStart` as the cluster identity whenever a
   group can contain multiple maps;
2. use exact one-sided 95% Student-t critical values:
   - C=18: 1.7396067260750672;
   - C=36: 1.6895724577802655;
   - C=54: 1.674116236703115;
   - C=72: 1.6665996583285084; and
   - C=450: 1.6482543776503167;
3. fail closed on any other cluster count;
4. omit a confidence bound for the heterogeneous all-row mixture;
5. retain its raw mean and favorable/unchanged/unfavorable counts as
   descriptive values;
6. leave the central HFO, Peak, and Advanced frozen gate implementations and
   truth values exactly unchanged; and
7. expose the correction revision in every aggregate.

Tests must cover coordinate collisions across maps, all five allowed cluster
counts, rejection of an unknown count, omission of overall inference, and
deep equality of every frozen gate between V1 and V2 analysis on identical
synthetic rows.

## Finalizer and access

The finalizer uses `afterok` on the complete array. It must independently:

- reconcile exactly 2,700 unique raw job IDs and every scheduler field;
- verify the manifest, source, program, Slurm, runtime, dependency, asset,
  map, policy, opponent, case, and seed bindings;
- replay all 2,700 ledgers in bounded memory;
- verify exact assignment coverage and absence of duplicate/excluded cells;
- enforce per-game and aggregate storage bounds; and
- write outputs and the aggregate marker exclusively.

Before reading scientific fields, verify the finalizer's scheduler state,
marker, sidecar, file hashes, and transitive dependencies. Then run an
independent complete-population recomputation from `games.csv`, including
the corrected endpoint-effect table, all W/D/L tables, transitions, action
resource summaries, gates, and strata. Disagreement fails closed.

Only the fully verified V2 aggregate may enter the result ledger. The V1
execution remains a technical-failure row with no claim eligibility.

## Advancement

This retry changes no scientific threshold. Report all central, Peak,
