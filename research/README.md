# Chrono Divide research layer

This directory is the paper and reproducibility layer for the stronger-bot
fork. It preserves the forensic conclusion that “Chrono Divide” names the
browser Red Alert 2 reconstruction; it is not a chronological data split. The
working study is cross-map and cross-start generalization of scripted RTS
policies, and its positive policy hypothesis remains untested.

## Read in This Order

1. [`STATUS.md`](STATUS.md) — current evidence, active blockers, and the next
   admissible experiment.
2. [`SUPPORTED_SCOPE_DECISION.md`](SUPPORTED_SCOPE_DECISION.md) — why the
   current source population is Temperate-only and how the 54-family candidate
   subset was obtained.
3. [`PAPER_PLAN.md`](PAPER_PLAN.md) — candidate formulations, primary paper
   direction, abstract, and outline.
4. [`RESULT_REGISTRY.tsv`](RESULT_REGISTRY.tsv) — append-only mapping from every
   interpreted result to its configuration, artifact, revision, and job ID.
5. [`FORENSIC_AUDIT.md`](FORENSIC_AUDIT.md) — original inventory,
   reproducibility assessment, leakage audit, and reconstructed objective.

## Study Design and Claim Boundaries

| Topic | Document |
| --- | --- |
| Owner decisions and positive primary hypothesis | [`DECISIONS_2026-08-04.md`](DECISIONS_2026-08-04.md) |
| Coordinate-free policy interface and equal-budget contract | [`METHOD_INTERFACE_GATE.md`](METHOD_INTERFACE_GATE.md) |
| Outcome-free compatibility protocol | [`MAP_FIDELITY_GATE.md`](MAP_FIDELITY_GATE.md) |
| Original 127-family no-go review | [`FULL_SCREEN_READINESS_REVIEW.md`](FULL_SCREEN_READINESS_REVIEW.md) |
| Map-family construction and eligibility | [`MAP_FAMILY_ELIGIBILITY.md`](MAP_FAMILY_ELIGIBILITY.md) |
| Compromised capacity exercise; not a final split | [`PROVISIONAL_FAMILY_SPLIT.md`](PROVISIONAL_FAMILY_SPLIT.md) |
| Diagnostic allocation and unblinding rule | [`DIAGNOSTIC_PROTOCOL.md`](DIAGNOSTIC_PROTOCOL.md) |
| Compute gates and weekly sequence | [`EXECUTION_ROADMAP.md`](EXECUTION_ROADMAP.md) |
| Literature and novelty boundary | [`RELATED_WORK.md`](RELATED_WORK.md) |
| Environment and randomness constraints | [`ENVIRONMENT.md`](ENVIRONMENT.md) |
| Venue fit and dated deadline checks | [`VENUE_STRATEGY.md`](VENUE_STRATEGY.md) |

## Reproducibility Layout

- [`artifacts/`](artifacts/) contains small, committed inventories, role-blind
  target manifests, power designs, and execution descriptors. See
  [`artifacts/README.md`](artifacts/README.md) before editing or adding one.
- [`scripts/`](scripts/) contains inventory, selection, gate, supervisor,
  verification, power, and aggregation tooling.
- [`slurm/`](slurm/) contains the allocation entry points for `pi_jss233`.
- [`tests/`](tests/) contains the Python protocol and verifier tests.
- [`configs/`](configs/) contains frozen small pilot/split inputs.
- [`environment.toml`](environment.toml) records the research environment
  contract.

Large execution bundles are deliberately outside Git. Current compatibility
evidence is retained under
`/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence`; each
interpreted bundle must also appear in `RESULT_REGISTRY.tsv`. Proprietary maps,
MIX archives, and copied game assets must not be added to the research layer.

Historical engineering outputs under the repository's `benchmark-results/`
directory are preserved separately. Their existence does not make them paper
evidence.
