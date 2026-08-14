# Mission-Native Closeout: Amendment 37

Date: 2026-08-14

Status: **passed V29 focused gate and frozen all-country outcome-blind compatibility gate**

## Preserved V29 focused result

The V29 focused gate ran exactly once as Slurm job `22243283` under account
`pi_jss233`, from clean tracked `main` source
`ac9fc7b8dfc4a8c2ec1490f6e890145ff66c6ea0`. The frozen V29 policy identifier
was `04ba2e3dfe2a0280c8de468cd7f7217df2dc38e35ec888b12b011378cc549e77`;
the pinned external Supalosa baseline remained
`165b77a71d0cf5ebd27c65b19d0486bcbae78d0f` with a clean tracked tree.

- artifact: `research-evidence/mission-native-closeout/outcome-blind-focused-gate-v29/22243283/focused-gate-v29.json`
- artifact SHA-256: `fa9420228bbacce22a7e37508ecb2c094b27ba3fdc0604024f36fac6735c98c2`
- scheduler: `COMPLETED`, exit `0:0`, elapsed `00:02:52`
- artifact status: `PASS_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_FOCUSED_GATE_V29`
- four games; both same-seed repeats were exact; no win, loss, draw, score, or other competitive outcome was serialized or inspected

The American row exposed 75 preterminal evaluations in which the objective was
nominally feasible but the transferred set lacked the required composition.
Those forces remained blocked under an active predecessor until tick 4092,
when a certified conventional-blocker force launched. The launch handed off all
expected units and serialized 257 points of physical enemy-building damage.

The African row exposed 25 corresponding composition blocks and 128 total
blocked delegated evaluations. It did not launch or damage a building during
the fixed horizon, and it satisfied the no-launch contract by retaining active
predecessor control, production, and exact same-seed behavior. Neither row
attempted resignation.

These are outcome-blind mechanism observations. They establish that V29
prevents the V28 preterminal infantry sacrifice in the focused seed family and
can later convert a certified force into physical objective progress. They do
not establish a competitive win-rate improvement.

## Affiliation-safe validator correction

The focused validator's expected unit and factory names were sufficient for
its frozen American and African rows but selected the Allied names only for
`Countries.USA`. Before all-country use, that validator must classify all five
Allied countries (Americans, Alliance, French, Germans, and British) as GDI and
all four Soviet countries (Africans, Arabs, Confederation, and Russians) as
Nod. This is a prospective validation correction only; it does not change the
V29 policy or reinterpret job `22243283`. Unit tests must cover at least one
non-American Allied country and one non-African Soviet country.

## Frozen V29 all-country compatibility gate

The next gate is outcome-blind and uses unused valid engine seed base
`4_289_000_000`. It covers all nine countries in both candidate slots. Each of
the 18 country-slot cells runs four games on the attested
`simple-1v1-no-preview.map` bytes:

1. the direct pinned external baseline;
2. the disabled V29 adapter;
3. the enabled V29 policy; and
4. an exact same-seed repeat of the enabled V29 policy.

This yields 72 games. For every cell, the direct and disabled traces must be
identical when V29 telemetry is excluded, and the disabled adapter must emit no
V29 telemetry. Enabled traces must repeat exactly, change commands relative to
the direct baseline, make no resignation attempt, and satisfy the schema-23
force-objective, production, delegation, launch, handoff, and physical-progress
contracts. A cell may remain unlaunched within the fixed horizon only if a
preterminal force remains correctly blocked under active predecessor control.

Across the full matrix, the new composition block must be exposed for both
Allied and Soviet countries and in both candidate slots. A composition-blocked
row must subsequently launch a certified force, reconcile its handoff, and
cause positive building damage for at least one Allied row, at least one Soviet
row, and at least one row in each candidate slot. Every preterminal launch must
contain an actual side-appropriate main tank and screen. A direct or
complete-route launch with incomplete composition is permitted only when
exactly one enemy building remains. Live terminal-bypass exposure is recorded
if it occurs but is not required, because the fixed map and horizon need not
reach a one-building state in every unused seed family.

The gate serializes manifests, scheduler provenance, trace digests, bounded
self-snapshots, mechanism telemetry, validation errors, and aggregate coverage
only. It must not serialize or inspect a winner, loser, draw, score, competitive
margin, or sealed test-family outcome. Failure preserves the artifact and
retires the seed base; no failed country-slot cell is selectively rerun.

Only a clean pass permits construction of the prespecified diagnostic and
confirmatory evaluation interfaces. A pass is still technical evidence, not a
positive competitive claim.
