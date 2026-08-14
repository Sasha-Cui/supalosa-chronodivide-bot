# Persistent additive objective completion: prospective amendment 1

Status: **frozen before compatibility-v2 and before any outcome-bearing launch**  
Frozen: 2026-08-14 UTC

## Reason for the amendment

Outcome-blind compatibility job `22182704` completed under Slurm account
`pi_jss233` on clean main commit
`8292539365c261b73a118f9d19d31393d90b79bf`. All 72 fixed-tick runs completed
with exit `0:0`. The artifact has SHA-256
`191bc5ef97f7e33c24f80053e4d3d1b505376424ad0a72a22e0a572cab564a4c` and
records:

- exact disabled-wrapper equivalence in all 18 country-slot cells;
- deterministic repeated enabled traces in all 18 cells;
- changed enabled commands and observed movement or attack response in every
  cell;
- zero resignation attempts and zero early finishes; and
- selected attacker rule names `E1`, `E2`, `FV`, and `HTNK` across the gate.

No winner, score, endpoint, terminal aggregate, or policy performance was
recorded or inspected.

The v1 artifact retained country-level rule-name and rejection-reason sets, but
not the repeated per-type counts necessary to establish how much compatible
force was selected, delegated, locked, idle, moving, or attacking. It also did
not require observed physical building damage in every country-slot cell. The
protocol requires those quantities before an outcome screen. This is an
evidence-retention defect in an outcome-free gate, not an observed game-result
failure and not a reason to alter the policy.

## Prospective repair

Compatibility v2 must use a fresh seed block beginning at `4250000000`, an
exclusive output root, and the same fixed map, nine countries, reciprocal slots,
direct external control, disabled wrapper, enabled policy, and deterministic
repeat allocation. It adds no game outcome field.

For every country-slot cell it must retain:

- counts of decisions by phase and reason;
- exact enemy-building-count and selected-attacker-count ranges;
- compatible and selected observations and their ratio;
- selected and delegated action counts;
- rejection counts by reason;
- physical building-damage, blocker-damage, and route-progress event counts and
  totals;
- ordinary-weapon-plus-special-secondary exposure and selection counts; and
- per-rules-name observations, compatibility, selection, mission locking,
  actions, and rejection reasons.

The compatibility gate now additionally fails if an enabled trace does not
produce physical enemy-building damage in its country-slot cell. Existing
requirements for exact disabled equivalence, determinism, command difference,
legal selected attackers, next-cycle movement/attack response, no locked
multi-building lease, no resignation, clean external provenance, `main`, and
`pi_jss233` remain unchanged.

Compatibility v1 remains preserved and valid for the checks it actually
performed. Compatibility v2 supersedes it only as authorization for an
outcome-bearing open-development screen. No policy parameter or tactical rule
is changed by this amendment.
