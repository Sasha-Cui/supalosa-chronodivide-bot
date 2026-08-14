# Mission-Native Closeout: Amendment 11

Date: 2026-08-14

Status: completed outcome-free V10 gate and prospective V11 freeze

## Completed V10 evidence

The certified first-blocker V10 compatibility run completed as Slurm job
`22216767` under account `pi_jss233`.

- source commit: `000eaca4cb66f6a4f91fbdb0b4d63daf88a3a535`
- artifact: `research-evidence/mission-native-closeout/outcome-blind-compatibility-v10/22216767/compatibility-v10.json`
- artifact SHA-256: `6c1a9d5bd95704ae57bc333ef3a02c4ae19d52869399f5f44d369e2eb93d6164`
- scheduler state: `FAILED`, exit code `1:0`, elapsed `00:06:05`
- artifact status: `FAIL_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_V10`
- coverage: 9 countries, 2 reciprocal slots, 4 deterministic games per cell,
  72 games
- disabled-policy equivalence: 18/18 cells
- enabled repeat determinism: 18/18 cells
- resignation attempts: none
- outcome inspected: no

The scheduler failure is the gate's intentional fail-closed exit after writing
the complete artifact.

## Outcome-free findings

V10 activated in all eighteen cells: seven through a direct building-ready
certificate and eleven through first-blocker clearance. Eleven cells physically
damaged a building, for 1,080 aggregate damage. Execution contained 510 phase-
pure blocker allocations, 156 phase-pure building allocations, zero mixed
allocations, and four blocker-to-building transitions.

Seven activated cells caused no building damage. Six were Allied cells that
initially blocked, created a reserve, then activated at tick 2,724 with zero
staged combatants. Their assigned-force range was one to six units and they
remained in blocker-only execution. The seventh was Russian slot 0, which
activated immediately through blocker clearance, reached fourteen assigned
units, and also remained blocker-only.

Thus V10's first-blocker estimate was a necessary but insufficient certificate:
it admitted positional changes in a small unchanged force and did not account
for the cost of clearing the remaining route-threat cluster. V10 is rejected as
a complete policy, and no outcome-bearing screen is authorized.

## Frozen V11 mechanism: aggregate route-clearance certificate

V11 preserves V10's dual-track reserve, target ranking, public information
interface, and post-activation controller. It changes only the clearance term
in the activation certificate.

For every enemy force already classified as a route threat by the existing
corridor, intercept, and damage rules:

1. Estimate aggregate compatible-attacker damage per tick against that force.
2. Divide its current hit points by that damage to obtain optimistic focused
   removal time.
3. Sum focused removal time over the complete certified route-threat set and
   add the approach time to the first selected blocker.
4. Launch through the clearance branch only if this aggregate route-clearance
   time is no greater than the existing piecewise force-survival time.

The estimate deliberately assumes unchanged attacker damage while threats are
removed, but the survival side conservatively retains every threat's damage.
It is therefore stricter than V10 and cannot pass merely because one nearby
infantry unit is removable. Direct building-ready and in-range launches remain
unchanged. Forces outside the building corridor are excluded exactly as before,
including the 100-off-route-tank case.

Activation-evaluation telemetry adds aggregate route-clearance time. The V11
artifact retains the complete technical activation-evaluation sequence for each
cell so future mechanism diagnosis does not discard the certificate values.

## V11 outcome-free gate

Pure tests must reject lethal one-unit route clearance, reject a force that can
remove only the first blocker but not the full threat set, and accept a force
whose aggregate route-clearance time precedes survival. The live gate uses fresh
seeds, all nine countries, and reciprocal slots. It retains exact disabled
equivalence, determinism, no resignation, reserve lifecycle, no pre-activation
orders, both phase-pure branches, and physical building damage in all 18 cells.
Every clearance activation must expose a finite aggregate estimate no greater
than force survival, and at least one live aggregate-clearance activation must
occur.

If any cell fails, no outcome is inspected. A complete pass authorizes only a
fresh open-development comparison of exact Supalosa, V10, and V11; it does not
authorize confirmatory or paper claims.
