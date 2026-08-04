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
- `PROVISIONAL_FAMILY_SPLIT.md`: compromised capacity-only 16/8/26 allocation,
  exact 50-identity burn scope, and deferred prospective final-split order.
- `FULL_SCREEN_READINESS_REVIEW.md`: independent P0/P1/P2 acceptance review for
  exact map-byte attestation, process isolation, start coverage, and durable
  evidence retention.
- `METHOD_INTERFACE_GATE.md`: source-based rejection of the historical trainer
  as a confirmatory runner and the required coordinate-free, seed-controlled,
  equal-budget replacement contract.
- `MAP_FIDELITY_GATE.md`: role-blind, outcome-free Slurm preflight/full-map
  parser/load/progress protocol and its deliberately narrow interpretation.
- `VENUE_STRATEGY.md`: verified venue fit and deadlines as of 2026-08-04.
- `EXECUTION_ROADMAP.md`: compute budget, experiment gates, and weekly plan.
- `DIAGNOSTIC_PROTOCOL.md`: fixed 1,000-launch pre-confirmatory allocation,
  technical stops, one-unblinding signal gate, and variance recalibration.
- `DECISIONS_2026-08-04.md`: owner decisions, venue choice, positive primary
  hypothesis, and the not-yet-frozen confirmatory protocol.
- `RESULT_REGISTRY.tsv`: result-to-configuration/job provenance ledger.
- `scripts/audit_existing_results.py`: raw-summary metric reconstruction.
- `scripts/inventory_maps.py`: exact map-hash and duplicate inventory.
- `scripts/catalog_map_families.py`: outcome-blind family grouping, safe INI
  descriptors, provenance, and two-tier adaptive-exposure catalog.
- `scripts/propose_map_family_split.py`: role-blind fidelity-target generation
  plus a private, compromised capacity test that cannot freeze a split.
- `scripts/select_map_fidelity_preflight.py`: deterministic validator/generator
  for the explicit 11-family, all-theater/start-count/extrema technical
  preflight; its identities do not assign dataset roles.
- `scripts/map_fidelity_gate.py`: strict Slurm-only fidelity manifest builder
  and independent, schema-allowlisted checker.
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
- `artifacts/provisional_family_split_v1.json`: aggregate-only compromised
  capacity check; it contains no candidate identities or paths.
- `artifacts/role_blind_fidelity_targets_v1.json`: all 127 Tier-B exact
  representatives without train/validation/test roles.
- `artifacts/map_fidelity_expanded_preflight_v2.json`: committed outcome-free
  11-family technical stress plan covering all observed theaters, start counts,
  and global representative area/byte extrema.
- `artifacts/design_power_{assumption_example,selected_draft}.json`:
  prospective sensitivity reports that use no outcomes.
- `artifacts/seed_replay_gate_v1_{summary,execution}.json`: exact deterministic
  fresh-process gate output and its Slurm/job/source/log provenance, including
  two zero-game launcher failures.
- `artifacts/map_fidelity_preflight_v1_execution.json`: failed and corrected
  three-map Slurm preflight accounting, exact artifact hashes, and the explicit
  non-clearance interpretation.
- `artifacts/pi_jss233_readiness_2026-08-04.json`: current submit-limit
  evidence and non-fallback decision.
- `artifacts/storage_visibility_incident_2026-08-04.json`: raw scratch
  visibility incident, successful private split-artifact mirror, and mandatory
  future project-storage remediation.
- `scripts/prepare_external_baseline.sh`: clean-baseline runtime preparation.
- `slurm/audit_pilot_v1.sbatch`: four-task, paired-physical-start CPU pilot.
- `slurm/seed_replay_gate_v1.sbatch`: packaged 10-same/1-different fresh-
  process deterministic replay gate; passed as job 21291720 under
  `pi_jss233`.
- `slurm/map_fidelity_gate_v1.sbatch`: pinned CPU-only, role-blind three-map
  preflight entry point; a preflight can never clear full-map fidelity.

Historical pilot outputs were intended to be append-only under scratch, but
their inconsistent visibility is now a recorded retention incident. Future
authoritative evidence must be atomically staged under versioned project
storage and independently reverified. Proprietary maps, MIX archives, and
copied game data are not duplicated into the Git research layer.
