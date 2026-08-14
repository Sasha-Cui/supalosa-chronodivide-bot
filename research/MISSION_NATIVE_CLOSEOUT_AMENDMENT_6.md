# Mission-Native Closeout: Amendment 6

Date: 2026-08-14

Status: completed outcome-free execution diagnostic and prospective v6 freeze

## Completed diagnostic evidence

The observation-only V5 execution diagnostic completed as Slurm job `22212262`
under account `pi_jss233`.

- source commit: `44dd24f3db0efbcfd780b8674cdbeed7cb6147ac`
- artifact: `research-evidence/mission-native-closeout/outcome-blind-execution-diagnostic-v1/22212262/execution-diagnostic.json`
- artifact SHA-256: `a7b1331a49dbe5e5225320e63fe7ec537d3e3b9d0e67407aadffa5b04f116353`
- scheduler state: `COMPLETED`, exit code `0:0`, elapsed `00:05:52`
- artifact status: `PASS_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_EXECUTION_DIAGNOSTIC_V1`
- coverage: 9 countries, 2 reciprocal slots, 4 deterministic games per cell,
  72 games
- disabled-policy equivalence: 18/18 cells
- enabled repeat determinism: 18/18 cells
- enabled command intervention: 18/18 cells
- global validation errors: none
- outcome inspected: no

The diagnostic preserved the exact enabled and disabled V5 policies. It added
only schema-5 execution heartbeats and therefore does not provide performance
evidence.

## Outcome-free mechanism findings

- approach followed by assigned-attacker loss: 18/18 cells;
- failure to reach the near-firing-range region: 10/18 cells;
- direct-order distance reversal or oscillation: 11/18 cells;
- physical building damage: 8/18 cells;
- firing-range entry without any physical damage: 0/18 cells; and
- arrival within two tiles of firing range without entry: 0/18 cells.

The ten Allied country-slot cells began the closeout interval with only rifle
infantry (`E1`) assigned. Only Germans slot 1 later reached firing range and
damaged a building. The other nine Allied cells stopped at least 4.22 tiles
outside the firing perimeter, and most stopped at least 7.81 tiles outside it.
The eight Soviet cells began with only conscripts (`E2`) assigned. Seven
entered firing range and caused 199 damage each; Confederation slot 1 never
entered range or caused damage. A small number of later heartbeats included one
tank, but the activation force was infantry-only in every cell.

Every cell had route threats during the observed mission. The observed threat
range was 1--15 for Allied cells and 14--39 for Soviet cells. Within a cell,
the selected blocker identity changed between 4 and 12 times. The single-screen
allocation therefore sent most fragile infantry toward the building while a
sequence of route threats remained active. Direct attack commands did not cure
the problem: Alliance slot 0 and British slot 1 issued dozens of direct
building commands, approached to 4.22 tiles outside firing range, lost assigned
attackers, and caused zero physical damage.

These findings reject another monotonic building-allocation change. The
remaining defect is phase control and order persistence: the controller must
clear a certified interception when the building race is infeasible, but it
must not change blockers every few order ticks or treat force removal as the
terminal objective.

## Frozen V6 mechanism: phase-pure persistent clearance

V6 preserves V5's external strategy, low-building activation, minimum tick,
minimum force, zero reserve, committed building, public-state interface,
capability and reachability checks, route corridor, stall retargeting, and
three-tick order interval. It changes only blocker execution after the existing
completion-race certificate:

1. If any assigned attacker is already in the building firing perimeter, or
   estimated building completion is no slower than estimated force survival,
   every compatible assigned attacker attacks the committed building.
2. If route interception is predicted to destroy the strike force first, every
   assigned attacker that can damage the selected blocker attacks that blocker.
   Attackers that cannot damage it remain building-directed rather than idle.
3. The selected blocker identity is committed for the current building while
   it remains in the certified route-threat set. Recomputing scores every three
   ticks must not switch to another still-living blocker.
4. The commitment is released immediately when the blocker disappears, ceases
   to be a certified route threat, the committed building changes, an attacker
   reaches the building firing perimeter, or the building-completion race
   becomes favorable.
5. After release, the controller recomputes the race. A favorable race resumes
   full building focus immediately; an unfavorable race selects and commits the
   next deterministic route blocker.
6. Off-route forces remain irrelevant. The final enemy building retains the
   same literal priority: an off-route army, regardless of size, cannot veto a
   feasible winning strike.

This is a two-phase objective controller, not an instruction to eliminate every
enemy unit. Blocker clearance is an instrumental action whose stopping rule is
the feasibility of physical building destruction.

## V6 outcome-free gate

Before any outcome-bearing screen, V6 must pass compilation, pure tests, exact
disabled equivalence, repeat determinism, all nine countries, reciprocal slots,
and complete execution telemetry on fresh seeds. The live gate must demonstrate
both a phase-pure blocker allocation and a phase-pure building allocation,
preserve a blocker identity across consecutive eligible decisions, change
enabled commands relative to the exact external baseline, avoid early game
termination, and cause physical building damage in all 18 country-slot cells.

If any cell fails, no outcome is inspected. The complete outcome-free telemetry
is used to reject or revise V6 prospectively. If all cells pass, the subsequent
open-development outcome screen must include exact Supalosa self-play, the
nonpersistent all-blocker predecessor, and V6 so that persistence is causally
separated from allocation mode. No country-specific exception or selective
rerun is permitted.
