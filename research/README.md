# Chrono Divide research audit

This directory is the isolated research layer created on branch
`codex/chrono-divide-paper-audit`. It does not replace or rewrite preserved
training, verification, Slurm, or benchmark artifacts.

The forensic conclusion is that Chrono Divide is the proper name of a browser
Red Alert 2 reconstruction, not a chronological data split. The credible study
is cross-context generalization of scripted RTS policies: quantify how
map/start-specific tuning trades in-domain strength for held-out-map and
worst-group robustness. That claim is a hypothesis, not an established result.

Contents:

- `FORENSIC_AUDIT.md`: inventory, objective reconstruction, reproducibility,
  leakage/contamination audit, and job outcomes.
- `PAPER_PLAN.md`: candidate formulations, recommended direction, related
  work, study design, abstract, and paper outline.
- `RELATED_WORK.md`: verified seed literature and a novelty boundary.
- `ENVIRONMENT.md`: observed runtime, dependency, and randomness constraints.
- `MAP_FAMILY_ELIGIBILITY.md`: outcome-blind strict and evidence-based map
  family eligibility counts and reference-source classification.
- `VENUE_STRATEGY.md`: verified venue fit and deadlines as of 2026-08-04.
- `EXECUTION_ROADMAP.md`: compute budget, experiment gates, and weekly plan.
- `DECISIONS_2026-08-04.md`: owner decisions, venue choice, positive primary
  hypothesis, and the not-yet-frozen confirmatory protocol.
- `RESULT_REGISTRY.tsv`: result-to-configuration/job provenance ledger.
- `scripts/audit_existing_results.py`: raw-summary metric reconstruction.
- `scripts/inventory_maps.py`: exact map-hash and duplicate inventory.
- `scripts/catalog_map_families.py`: outcome-blind family grouping, safe INI
  descriptors, provenance, and two-tier adaptive-exposure catalog.
- `scripts/design_power.py`: assumption-only crossed family/run power analysis.
- `scripts/check_seed_replay_gate.py`: exact fresh-process replay-gate checker.
- `scripts/run_audit_pilot_task.sh`: shared Slurm/allocation task runner.
- `scripts/run_determinism_screen_task.sh`: four-fresh-process terminal-state
  variability screen for an identical requested match tuple.
- `scripts/summarize_audit_pilot.py`: provenance checks and descriptive pilot
  aggregation.
- `artifacts/project_inventory.json`: machine-readable directory/coverage index.
- `artifacts/experiment_inventory.jsonl`: 1,475 settings/file-level run rows.
- `artifacts/audit_pilot_v1_{summary,snapshot}.json`: exact pilot result and
  registered runtime archive descriptor.
- `artifacts/determinism_screen_v1.json`: terminal signatures, launch ledger,
  internal-PRNG source inspection, and diagnostic runtime archive descriptor.
- `artifacts/scheduler_accounting_correction.json`: authoritative Slurm account
  correction for the fallback diagnostics and schema-3 remediation.
- `artifacts/map_family_catalog.json`: 333-file/145-family outcome-blind
  catalog with strict and evidence-based provisional eligibility.
- `artifacts/design_power_{assumption_example,selected_draft}.json`:
  prospective sensitivity reports that use no outcomes.
- `artifacts/pi_jss233_readiness_2026-08-04.json`: current submit-limit
  evidence and non-fallback decision.
- `scripts/prepare_external_baseline.sh`: clean-baseline runtime preparation.
- `slurm/audit_pilot_v1.sbatch`: four-task, paired-physical-start CPU pilot.
- `slurm/seed_replay_gate_v1.sbatch`: packaged 10-same/1-different fresh-
  process deterministic replay gate; not submitted while allocation is blocked.

Generated pilot outputs are append-only under
`/nfs/roberts/scratch/pi_jss233/zc362/chrono_divide-paper-audit`. Proprietary
maps, MIX archives, and copied game data are not duplicated into this layer.
