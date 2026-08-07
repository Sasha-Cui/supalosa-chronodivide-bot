# Historical Benchmark Outputs

This directory is a preserved working archive of generated engineering runs.
It contains useful debugging and development evidence, but it is **not** the
canonical scientific result ledger. Some historical runs used shared modified
packages, tuned starts, changing configurations, incomplete source provenance,
or exploratory outcome inspection.

Approximate directory roles:

| Directory | Typical contents |
| --- | --- |
| `campaigns/` | Larger head-to-head development campaigns |
| `training/` and `checkpoints/` | Parameter-search runs and intermediate state |
| `smoke/` and `verification/` | Small engineering and regression checks |
| `debug/`, `trace/`, `trace-runs/`, and `traces/` | Diagnostic runs and trace captures |
| `slurm_jobs/` | Scheduler-launched development outputs |
| `analysis/` and `tools/` | Derived summaries and helper outputs |

Preservation rules:

- Do not rename, reorganize, or delete existing run directories merely to make
  the tree look cleaner; paths are part of the forensic record.
- Do not infer paper claims from directory names or hand-picked summaries.
- Register every newly interpreted research result in
  [`../research/RESULT_REGISTRY.tsv`](../research/RESULT_REGISTRY.tsv), including
  its exact configuration, revision, job ID, and durable artifact location.
- Keep large new scientific execution bundles in the versioned external
  `research-evidence` tree, not in Git.
- Keep proprietary maps, MIX archives, copied game assets, and secrets out of
  the repository.

For the current admissible evidence and blockers, start at
[`../research/STATUS.md`](../research/STATUS.md).
