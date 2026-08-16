# Finish-Advantage Complete Open Causal-Screen Protocol, Amendment 4

Status: **prospectively frozen before campaign generation, before any
finish-advantage competitive outcome, and before access to the sealed V5
confirmatory outcome**

Recorded: 2026-08-15 (America/New_York)

Parent protocol and amendments remain binding except where this amendment
explicitly supersedes the arm identities, arm count, and base-race behavior.
Decision-doctrine amendment 6 supplies the outcome-blind endpoint audit and
prospective correction.

## Rationale

Unchanged V5 ignores the candidate's own-final-building destruction deadline
after sufficient terminal evidence. The literal endpoint used by this project
instead awards the opponent a physical win when the candidate's buildings
reach zero first. The final candidate must correct this boundary without
silently changing the V5 comparator.

## Corrected fixed arms

The canonical arm list is now:

1. `external_supalosa_control`: exact pinned external Supalosa.
2. `visibility_aware_final_building_v5`: unchanged frozen V5, including its
   legacy terminal base-race behavior.
3. `v5_plus_terminal_base_race_guard`: unchanged V5 construction plus only the
   prospective strict final-building base-race decision guard; the
   multi-building finish layer is disabled.
4. `termination_aware_plus_irreversible_finish`: the strict final-building
   guard plus the multi-building `irreversible_only` finish policy.
5. For each outcome-blindly state-audit-selected margin in ascending order, at
   most two arms named `termination_aware_plus_surplus_m{margin}`.

There are four fixed arms plus zero, one, or two selected surplus arms:

| Selected margins | Total arms | Exact launched games |
|---:|---:|---:|
| 0 | 4 | `180 * 4 = 720` |
| 1 | 5 | `180 * 5 = 900` |
| 2 | 6 | `180 * 6 = 1,080` |

All arms remain paired within the same 90 family-country seed blocks and both
reciprocal slots. No arm may be launched, repaired, or rerun alone.

## Eligibility and selection

Arms 3 through 6 are intervention arms and are each evaluated against both
exact Supalosa and unchanged V5 under every existing conjunctive eligibility
criterion. Thus the base-race-only arm may advance only if it independently
produces more literal wins, fewer draws, positive clustered lower bounds,
broad gains, positive leave-one-family-out effects, and zero V5-win regression.

The deterministic final-candidate ranking is unchanged. `irreversible_only`
continues to rank as safer than numerical surplus margins at the existing
safety tie-break. For the new base-race-only arm, its safety rank is above
`irreversible_only` because it introduces no multi-building force leasing. The
canonical arm ID remains the final tie-break.

## Causal interpretation

Arm 3 isolates the final-building base-race correction. Comparing arms 4--6
with arm 3 isolates the additional multi-building finish mechanism. These are
developmental ablations; the primary advancement comparisons remain exact
Supalosa and unchanged V5.

The aggregate must additionally report:

- strict-guard opportunities, activations, and nonactivations;
- whether the identified base-race threat was also a route blocker;
- predicted `T_objective` and `T_own_zero` at every guard decision;
- terminal building-strike-to-base-defense and base-defense-to-building-strike
  transitions; and
- malformed or unavailable base-race evidence.

These fields are descriptive and cannot determine retries, exclusions, or
post-hoc arm selection.

## Required implementation binding

The campaign generator, episode schema, analyzer, finalizer, composite gate,
and both Slurm wrappers must bind this amendment by exact path and SHA-256.
They must reject the old three-to-five-arm schema and any candidate arm whose
strict base-race mode is missing from its committed configuration. The V5
comparator must reject the strict mode.

No paper claim, sealed-population decision, or screenshot selection is
authorized by this open amendment.

