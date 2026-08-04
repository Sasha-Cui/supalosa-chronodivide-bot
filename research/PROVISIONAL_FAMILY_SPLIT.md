# Compromised capacity dry run — EXCLUDED FROM FINAL USE

This report contains aggregate counts and commitments only. The current 16/8/26 selected identities and roles are a capacity/determinism test, are retained only in a mode-0600 audit artifact, and are permanently excluded from final use. Capacity-reserve identities are not written to that artifact and remain unexposed to capacity roles. A separate committed manifest contains all Tier-B representatives without train, validation, or test roles for role-blind fidelity screening.

## Gate and commitment

- Status: COMPROMISED_CAPACITY_DRY_RUN_NOT_FROZEN
- Capacity seed revealed publicly: False
- Capacity seed commitment: 8ef9b34beaf2fb7186981a6581eebf5d6f2d4429c6bb17c489c71f90361ae50f
- Compromised assignment commitment: ec32a5de8eb95602b54441ca06c42513ed043c3ddc69cd14bdc7eef640b23ae1
- Role-blind fidelity-target commitment: 2ebdb5a6a0583b8ed23a61047255842aee243afc597bcd13b78fd451293a0f7f
- Immutable target-population commitment: 3e8c35b104c35c1b790df1b2da0521b167613a22d4bbd5c23ea8c14b4fa7d86b
- Freeze gate satisfied: False
- Final reuse prohibited: True
- Reuse-prohibition scope: selected_capacity_identities_only

## Exact capacity-test counts

| Role | Count |
|---|---:|
| dry_run_train_candidate | 16 |
| dry_run_validation_candidate | 8 |
| dry_run_test_candidate | 26 |
| dry_run_unassigned_reserve | 55 |

Capacity-allocated families: 50. Burned identities: 50. Capacity-role-unexposed eligible families remaining: 55 (minimum required for a final split: 50).

## Role-blind fidelity screen

Targets: 127 Tier-B family representatives. The immutable target projection contains only family ID and representative path/SHA; it has no role, fidelity status, or adjudication field.


## Family-grouping ambiguity aggregates

| Flag | Blocking | Families |
|---|---|---:|
| conflicting_start_counts | yes | 6 |
| conflicting_theaters | yes | 1 |
| exact_duplicate_or_compatibility_copies | no | 17 |
| multiple_content_revisions | no | 134 |
| multiple_revision_keys | yes | 14 |
| uninformative_hash_like_family_key | yes | 6 |

## Blocking gates

- This tool cannot emit a frozen split.
- All Tier-B representatives require role-blind full-map fidelity screening before pool freeze.
- Grouping and eligibility adjudications must be completed before pool freeze.
- Policy, source revision, methods, metrics, baselines, and the evaluation protocol must be frozen before role generation.
- A new prospective final-split seed must be committed after freeze and before final role generation.
- Exactly the 50 selected capacity identities are excluded from final role reuse; reserve identities are not recorded in the capacity artifact.
- Author-history and legal/release review remain external gates.

## Reviewer-facing limitations

- The aggregate split artifact hides capacity identities; the separate immutable role-blind fidelity manifest openly records only Tier-B family IDs and representative path/SHA values, without roles or fidelity outcomes.
- Fidelity pass/review/fail is an outcome-blind compatibility filter: a complete screen may exclude incompatible families without invalidating other passing families.
- Role-by-stratum capacity cells are withheld because sparse cells could indirectly reveal selected identities.
- Exactly the 16/8/26 selected identities test feasibility and determinism and are permanently excluded from final use; capacity-reserve identities are not recorded.
- At least 50 capacity-role-unexposed eligible families must remain before this dry run can be generated.
- The final candidate pool may change after fidelity or family adjudication and therefore requires a new prospective seed commitment.
- Structural strata use only INI theater, start count, and rectangular area, not difficulty, topology, resources, water, or symmetry.
- Area terciles are corpus-relative.
- Name/revision ambiguity flags are heuristic.
- A smoke/load pass is not a full-map fidelity pass.
- Fidelity binds one exact representative path and content SHA per Tier-B family; it does not validate every revision in the leakage family.

## Final-split ordering

- complete role-blind fidelity screening for all Tier-B representatives
- complete eligibility and grouping adjudication
- freeze policy, source revision, methods, and evaluation protocol
- create and publish a new prospective seed commitment
- generate final train/validation/test roles once
