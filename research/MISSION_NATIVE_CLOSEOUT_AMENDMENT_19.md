# Mission-Native Closeout: Amendment 19

Date: 2026-08-14

Status: **completed outcome-free V17 gate and prospective V18 repair freeze**

## Completed V17 evidence

The infrastructure-and-handoff V17 compatibility gate completed as Slurm job
`22233795` under account `pi_jss233`.

- source commit: `3e197420cee73024f16b29ebbd1d066a25ca9c42`
- external baseline commit: `165b77a71d0cf5ebd27c65b19d0486bcbae78d0f`
- artifact:
  `research-evidence/mission-native-closeout/outcome-blind-compatibility-v17/22233795/compatibility-v17.json`
- artifact SHA-256:
  `6130fdbc989cce6c688423b66b047c19e9ef17c26bd803f6ecce6edf4723c418`
- scheduler state: `FAILED`, exit code `1:0`, elapsed `00:06:49`
- peak batch RSS: 433,040 KiB
- artifact status:
  `FAIL_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_V17`
- coverage: 9 countries, 2 reciprocal slots, 4 deterministic games per cell,
  72 games
- outcome inspected: no

The scheduler failure is the gate's intentional fail-closed exit after writing
the complete artifact.

## Outcome-free findings

V17 exercised both intended repair paths but did not satisfy the technical
contract.

- The gate emitted 419 main-battle-tank requests across both `MTNK` and `HTNK`,
  but neither side acquired a tank before the gate horizon.
- It emitted 146 valid placement requests across both `GAWEAP` and `NAWEAP`,
  but no requested war factory appeared in the recorded infrastructure count.
- Twelve cells activated. Their launch audits contained 171 expected live
  identifiers: 80 transferred and 91 remained alive outside the closeout.
- The 8-unit reserve transferred in cells where it existed, while the active
  predecessor vanguard did not remain assigned to the closeout.
- Six Allied cells did not reach a complete-route activation certificate.
- Eleven cells caused physical building damage, totaling 1,268; only three of
  18 cells passed the entire outcome-free contract.

Source tracing identifies two prospective engineering causes.

First, V17 cleared force-disbanded unit identifiers only from the controller's
ownership map. It did not remove them from the donor mission's internal unit
list. When an attack mission ended later in the same update, its existing
completion callback created a retreat mission from that still-populated list,
allowing the retreat to reclaim the vanguard. The reserve transferred because
its mission has no equivalent retreat callback.

Second, the closeout infrastructure request used priority 130. Frozen strategic
plans request their first war factory at priorities as high as 148. A valid
placement request therefore does not imply that the queue selected or completed
it; V17 repeatedly exposed the former without the latter.

These are mechanism diagnoses from outcome-free telemetry and source behavior,
not performance claims. V17 is rejected and no outcome-bearing comparison is
authorized.

## Frozen V18 repair

V18 preserves the V17 tactical doctrine and all activation, staging, production,
target-selection, combat-allocation, terminal-building, country-generic, and
deadline rules. It makes only the following prospective repairs.

1. **Transfer-specific disband semantics.** Add a controller operation that
   disbands a mission for immediate transfer. Before same-update specific-unit
   requests are resolved, it removes every owned identifier from both the donor
   mission's unit list and the controller ownership map. The donor still ends
   at the existing end-of-update point, but its completion callback receives an
   empty unit list and therefore cannot recreate ownership through retreat.
   Ordinary external disband behavior remains unchanged.
2. Use transfer-specific disbanding only for the closeout's predecessor attack
   missions and readiness reserve. Do not weaken locked-unit transfer rules or
   allow the closeout to steal from unrelated missions.
3. **Terminal infrastructure priority.** Add a separate exact-policy field,
   `adaptiveGroundAssaultInfrastructurePriority`, fixed at 300. It applies only
   to the side-generic `GAWEAP`/`NAWEAP` request while low-building closeout
   scope is live. This matches the closeout mission's terminal priority and is
   above the observed strategic structure priorities; it does not change unit
   production priority or ordinary build plans.
4. Extend outcome-free infrastructure telemetry summaries to distinguish a
   valid request from physical acquisition by recording maximum visible
   infrastructure count and availability/request exposure.
5. Bump the exact policy schema to V18. No target count, tank count, country
   exception, map coordinate, activation inequality, combat heuristic, or
   terminal outcome field changes.

## V18 outcome-free gate

The fresh V18 gate uses seed base `4_140_000_000`, all nine countries, both
reciprocal slots, and four deterministic games per cell. It retains every V17
check and additionally requires:

- a deterministic controller test proving transfer-disband removes identifiers
  from both ownership representations before a same-update request and leaves
  the donor completion list empty;
- exact assignment or destruction of every certified launch identifier in all
  18 cells;
- a physically visible `GAWEAP` in at least one eligible Allied cell and a
  physically visible `NAWEAP` in at least one eligible Soviet cell;
- at least one acquired `MTNK` and one acquired `HTNK` in certified activation
  telemetry across their respective strata; and
- physical enemy-building damage in all 18 cells.

No win, loss, draw, score, terminal tick, opponent outcome, or sealed-family
field is inspected or serialized. Failure of any cell invalidates the complete
gate and returns the method to prospective engineering. A pass authorizes only
a fresh open-development outcome comparison.
