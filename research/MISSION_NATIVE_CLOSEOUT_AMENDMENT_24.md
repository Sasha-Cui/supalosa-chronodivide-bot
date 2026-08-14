# Mission-Native Closeout: Amendment 24

Date: 2026-08-14

Status: **failed focused V20 gate and prospective V21 readiness-defense freeze**

## Completed outcome-free focused V20 gate

The frozen focused V20 gate completed as Slurm job `22235571` under account
`pi_jss233`.

- source commit: `fce975e600fe6db257066a17ae9bac0f34922372`
- external baseline commit: `165b77a71d0cf5ebd27c65b19d0486bcbae78d0f`
- artifact:
  `research-evidence/mission-native-closeout/outcome-blind-focused-gate-v20/22235571/focused-gate-v20.json`
- artifact SHA-256:
  `1025bcce11df1ffbbe3f3efab2808c52ca1011b2db4aabf1276e8da269ddb3ce`
- scheduler state: `FAILED`, exit code `1:0`, elapsed `00:00:58`
- peak batch RSS: 385,240 KiB
- artifact status:
  `FAIL_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_FOCUSED_GATE_V20`
- launched games: 4
- exact same-seed repeat identity: passed for both countries
- resignation attempts: zero
- outcome inspected: no

The gate wrote a complete artifact and then intentionally exited nonzero. The
failure was empirical, not a runtime or infrastructure fault.

## Outcome-free findings

### Allied trace (`Americans`, slot 0)

- maximum physical `MTNK` count: two;
- enemy-building damage: 213 hit points;
- first physical-tank telemetry: tick 3,876;
- final production telemetry: tick 5,352;
- focused technical contract: passed.

### Soviet trace (`Africans`, slot 0)

- maximum physical `HTNK` count: one;
- enemy-building damage: zero;
- first physical-tank telemetry: tick 3,816;
- final production telemetry: tick 5,400;
- focused technical contract: failed.

The persistent production-scope latch worked: production telemetry and
reservation remained live after tank acquisition. The remaining failure is
tactical. The Soviet war factory fell from full health to 86 hit points and was
then destroyed between the tick-4,200 and tick-4,500 self snapshots. The staged
`HTNK` remained near the start location under the readiness mission and
survived, but it neither neutralized the nearby attacking force nor reached an
enemy building. Returning it to the staging point was counterproductive once
the force threatened the infrastructure needed to assemble the closeout group.

## Frozen V21 repair

V21 preserves every V20 economic, production, target-selection, engagement,
transfer, staging-ownership, and side-generic rule. It adds exactly one
mechanism.

1. **Active readiness defense.** While the readiness reserve is accumulating,
   identify public-visible enemy combatants within 12 tiles of either a staged
   reserve unit or the side-correct war factory.
2. If such a threat exists, issue attack orders from the staged reserve to the
   nearest threat instead of returning staged units to the start location.
3. If no such threat exists, retain the existing start-location staging
   behavior. The ordinary attacking vanguard remains untouched.
4. This is a blocker decision, not a change to the terminal objective: forces
   are engaged only when they directly threaten the reserve or the production
   infrastructure required to reach the last buildings.
5. When the existing route-clearance certificate passes, preserve the exact
   transfer into the building-elimination mission; active defense creates no
   new ownership or disband path.
6. Emit schema-16 readiness-defense telemetry containing the visible threat,
   protected object, distance, and staged attacker count.
7. Bump the exact policy schema to V21 with
   `readinessReserveDefenseRadius: 12`.

## Staged V21 technical gates

Run a fresh focused gate with the same prospectively fixed country/slot strata,
exact same-seed repeats, and seed base `4_200_000_000`. It must require:

- deterministic traces and zero resignation attempts;
- physical `MTNK` and `HTNK` acquisition;
- persistent production telemetry after acquisition;
- valid schema-16 defense telemetry whenever a reserve threat is engaged; and
- positive physical enemy-building damage for both factions.

Only if the focused V21 gate passes may V21 run the full nine-country,
reciprocal-slot compatibility gate with fresh seed base `4_210_000_000`, four
deterministic games per cell, exact handoff reconciliation, physical tanks and
infrastructure for both factions, and building damage in all 18 cells.

Both gates remain outcome-free. No win, loss, draw, score, terminal tick,
opponent outcome, or sealed-family field may be inspected or serialized.
