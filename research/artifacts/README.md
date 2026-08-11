# Committed Research Artifacts

This directory contains small, reviewable, machine-readable records that bind
the research protocol without committing proprietary maps or large execution
bundles.

Artifact groups:

- `project_inventory.json`, `experiment_inventory.jsonl`,
  `experiment_inventory_summary.json`, `map_inventory.json`, and
  `codex1100_reconstruction.json` record the forensic inventory and historical
  reconstruction.
- `map_family_catalog.json`, `role_blind_fidelity_targets_v1.json`, and
  `role_blind_temperate_fidelity_targets_v1.json` define outcome-blind map
  populations and exact representatives.
- `map_fidelity_expanded_preflight_v2.json`, seed-gate records, scheduler
  corrections, and readiness/retention records bind infrastructure decisions.
- `design_power_*.json` and `provisional_family_split_v1.json` are prospective
  design aids; the provisional split is explicitly compromised and is not a
  confirmatory split.
- `audit_pilot_*` and `determinism_screen_v1.json` describe diagnostics, not
  final policy evidence.
- `method_v2_*_result_v1.json` records the frozen confirmatory and diagnostic
  aggregates. `method_v2_confirmatory_family_diagnostics_v1.json` is the
  deterministic, release-safe family-level export used by paper figures; its
  source unblinding commitment is embedded in the artifact.

Do not hand-edit generated JSON or JSONL values. Change the producing script or
frozen input, regenerate deterministically, review the diff, and record the
command and source revision. Large per-family shards, logs, maps, MIX files, and
game assets belong outside Git. Any artifact used to interpret a result must be
traceable from [`../RESULT_REGISTRY.tsv`](../RESULT_REGISTRY.tsv).
