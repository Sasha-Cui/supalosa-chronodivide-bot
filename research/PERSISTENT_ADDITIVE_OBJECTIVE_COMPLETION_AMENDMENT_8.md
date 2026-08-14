# Persistent additive objective completion: prospective amendment 8

Status: **frozen before policy-v7 compatibility and before any outcome-bearing launch**  
Frozen: 2026-08-14 UTC

## Complete outcome-free compatibility-v8 evidence

Compatibility-v8 job `22196136` completed all 72 fixed-tick runs under
`pi_jss233` on clean main commit
`a19fb350f805302f0506bb62a5e47f432f1dd548`. It returned exit `1:0` after
preserving the complete outcome-free artifact with SHA-256
`9f87a042c2813427659ecdac4b79dc071d23c057d33b31c9337071011a9e0e9d`.
No winner, score, endpoint, terminal aggregate, or policy-performance outcome
was recorded or inspected.

Both time-aware race branches and every numeric certificate passed. Ten of 18
country-slot cells physically damaged buildings, for 1,918 total building hit
points. Eight cells failed. The target pattern was structural: every successful
Allied cell committed to `GAPILE`, while failed Allied cells committed to
`GAPOWR`; successful Soviet cells committed to `NAPOWR`, while failed Soviet
cells committed to `NAHAND`. Four failed Soviet cells never issued a building
order within the fixed horizon.

The time-aware policy still accumulated 2,855 blocker decisions and 9,910
blocker hit points. The current target selector ranks Euclidean approach and raw
building damage before the interception calculation. It can therefore commit
to a nominally cheap building behind many early-arriving threats and then
correctly—but unproductively—spend the horizon clearing that route. This is a
complete-mission ranking defect.

## Prospective policy-v7 correction

Policy v7 changes only the initial building ranking when more than one enemy
building remains:

1. For each reachable building, form the exact deterministic initial detachment
   that the live selector could issue: apply compatibility, mission ownership,
   locked-offense caps, home protection, the ordinary reserve, the assault
   fraction, and the existing eight-unit cap.
2. Reuse the schema-v10 time-aware interception race for that provisional
   detachment and building.
3. Starting from the existing threat-priority order, remove only as many
   early-arriving threats as are needed to make predicted detachment survival
   at least as long as building completion. Define complete mission cost as
   estimated building-completion ticks plus those necessary removal ticks. A
   force that arrives before completion but cannot prevent the building kill
   contributes zero removal cost.
4. Rank finite complete mission cost first, then fewer relevant threats, then
   the existing construction-yard/factory and deterministic ID tie-breakers.
5. Preserve commitment to the selected building until destruction, a certified
   fallback deadline, or loss of all compatible reachability.

At exactly one enemy building, the terminal lexicographic rule is unchanged.
The time-aware building-versus-blocker race, detachment sizing, mission caps,
reserves, home protection, progress deadlines, lease duration, and exact
external Supalosa core are unchanged.

Policy v7 requires a distinct exact schema and canonical hash.
Compatibility-v9 must use fresh valid seeds and an exclusive root, preserve all
prior checks, prove in a deterministic test that a lower complete-mission-cost
building beats an equally distant blocked building, exercise more than one
target type across the complete live population, and require physical
enemy-building damage in all 18 country-slot cells. No outcome-bearing screen
is authorized unless compatibility-v9 passes.
