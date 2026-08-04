# Outcome-free full-map fidelity gate

`map-fidelity-gate-v1` is an infrastructure gate, not a policy benchmark. It
uses passive `Bot` subclasses, never queries game completion or player stats,
and rejects result JSON containing outcome fields such as winners, defeats,
credits, scores, or unit/building counts.

## Scope

-   Input families: all 127 records in the committed, outcome-blind
    `research/artifacts/role_blind_fidelity_targets_v1.json`. It declares
    `roleBlind=true`, `finalSplit=false`, and `isSplit=false`; no split, role,
    fidelity status, or adjudication is an input. Its immutable target projection
    contains only family ID and representative path/SHA and has a canonical
    population commitment. The gate cross-validates that its family set equals
    every evidence-based eligible family in `map_family_catalog.json`.
-   Representative: selected directly from cataloged contents by the committed
    role-blind rule: passed-load content first, then failed-load content, then
    unverified content, with path depth/length/lexical tie-breaks. Its exact path
    and SHA-256 are bound before execution.
-   Static checks: exact map hash, required INI sections/keys, nonempty terrain
    payloads, and enumeration of indexed start waypoints 0 through 7.
-   Engine checks: two passive 1v1 sessions per map at the same explicit seed,
    with participant order reversed. Both must load, advance through target tick
    250, return distinct declared starts, and preserve the physical-slot pair
    under the reciprocal participant order.
-   Dynamic start limit: one deterministic reciprocal pair is exercised per map.
    All declared starts are enumerated statically, but maps with more than two
    starts do not receive exhaustive dynamic start coverage in this gate.

The gate captures warning-like console messages and assigns `fail` or `review`
categories. Released records retain only the category, severity, phase, and a
SHA-256 of the diagnostic; raw text is not serialized. A full 127-family run may
be `screenComplete=true` even when some families are classified `review` or
`fail`, provided every family was classified and there was no global
infrastructure/provenance finding. Only an individual family whose original
automated status is `pass` may enter the later eligible pool; `review` cannot be
converted into a pass by informal adjudication. This outcome-blind compatibility
filter avoids making one incompatible map invalidate every passing map.

A family `pass` establishes only internal parser/load/progress behavior under
the pinned Chrono Divide simulator. It does not establish behavioral equivalence
to Red Alert 2, strategic suitability, or sealed-test validity.

## Slurm package

The only engine entry point is `research/slurm/map_fidelity_gate_v1.sbatch`.
Both the static preparer/checker and the Node runner require `SLURM_JOB_ID`,
query `scontrol`, and reject any authoritative account other than
`pi_jss233`. Preflight job 21296136 failed closed before map load because the
manifest used display label `Iraq`, not the pinned API's internal country ID
`Arabs`. Commit `3f605eb` fixed and regression-tested that configuration.
Corrected job 21296316 completed under `pi_jss233`: 3/3 role-blind families and
6/6 reciprocal passive sessions passed through tick 250 with no warning
category or global provenance finding. This is preflight evidence only; it is
not full-map clearance or policy-strength evidence.

Preparation also fails closed if tracked source is dirty, if source/build/
research-control directories contain untracked files, if a required Git query
fails, or if the gate sources, role-blind target manifest, or family catalog are
not committed. The input manifest records the commit, exact source and compiled
files, the complete installed `@chronodivide/game-api` tree (including
`dist/res/ra2cd.mix`), the complete installed dependency tree, every map and
asset hash, pinned `DEBUG_LOGGING=1`, and the authoritative Slurm job ID.
Untracked map assets are allowed only because their bytes are independently
bound by SHA-256.

Reserved resources are one CPU, 4 GiB RAM, two hours on `day`, and no GPU. The
engine workload is 127 maps times two reciprocal sessions times 250 target
ticks (63,500 target ticks, plus map construction). The existing full asset
tree is about 370 MiB; the gate hashes it before and after the probe. Expected
new output is JSON and scheduler logs, ordinarily well below 10 MiB. Warning
text is not retained, and a 100-warning-per-session cap hit is itself a gate
failure.

When execution is authorized, first run the deterministic, role-blind three-map
preflight. The three representatives are chosen by a committed SHA-256 ranking,
and retain their full-run population indices and seeds:

```bash
/opt/slurm/current/bin/sbatch \
  --partition=devel --time=00:30:00 \
  --export=MAP_FIDELITY_SCOPE=preflight \
  research/slurm/map_fidelity_gate_v1.sbatch
```

A preflight `PASS` has `fullCoverage=false`, `passed=false`, and
`eligibleForFidelityClearance=false`; it is infrastructure evidence only. Do
not submit the complete role-blind 127-map run until two full-run hardening
items are implemented: collision-free proof of the exact VFS-resolved map bytes
and per-family process isolation with timeout/atomic checkpointing. The full
script remains packaged for review but is not yet authorized as clearance
evidence.

The corrected preflight's registered aggregate and exact hashes are in
`research/artifacts/map_fidelity_preflight_v1_execution.json`.

Artifacts are written without overwrite to
`/nfs/roberts/scratch/pi_jss233/zc362/chrono_divide-paper-audit/map-fidelity-gate-v1/<job-id>/`:

-   `input-manifest.json`: exact source, runtime, map, and asset hashes;
-   `probe-results.json`: outcome-free load/progress/spawn records;
-   `gate-summary.json`: per-family pass/review/fail categorization.

Preflight artifacts use the parallel `map-fidelity-preflight-v1/<job-id>/`
root. Both roots are created mode 0700 and files mode 0600. Scheduler stdout is
role-free and reports only aggregate counts; neither mode consumes or emits any
train/validation/test role assignment.

The checker exits nonzero for overall `REVIEW` or `FAIL`, so a complete
screen containing incompatible families can appear as a nonzero Slurm job while
still writing a valid `screenComplete=true` summary. For a preflight, a zero
exit means only that its selected infrastructure checks passed. For a full run,
per-family eligibility additionally requires `scope=full`, complete population
classification, no global infrastructure finding, matching source/runtime and
immutable target-population commitments, and an exact passing family
path/SHA/job binding.
