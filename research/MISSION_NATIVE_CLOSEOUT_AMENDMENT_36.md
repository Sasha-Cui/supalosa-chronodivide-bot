# Mission-Native Closeout: Amendment 36

Date: 2026-08-14

Status: **failed V28-R2 focused gate and prospective V29 preterminal force-certification freeze**

## Preserved V28-R2 result

The V28-R2 focused gate ran exactly once as Slurm job `22241967` under account
`pi_jss233`, from clean tracked `main` source
`a985f9d0ede83893eec95d97f3a1475567f5af3d`. The unchanged V28 policy identifier
was `7a831e109153a56f892529a41250c7bf77b5d0a5e8e6ff88684472d4c86d8c73`;
the pinned external Supalosa baseline remained
`165b77a71d0cf5ebd27c65b19d0486bcbae78d0f` with a clean tracked tree.

- artifact: `research-evidence/mission-native-closeout/outcome-blind-focused-gate-v28-r2/22241967/focused-gate-v28-r2.json`
- artifact SHA-256: `4c63e66675c346039da295c31e00523e109e0422221d94e6e1c82e071b3c0537`
- scheduler: `FAILED`, exit `1:0`, elapsed `00:02:18`
- artifact status: `FAIL_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_FOCUSED_GATE_V28_R2`
- four games; both same-seed repeats were exact; no win, loss, draw, score, or other competitive outcome was serialized or inspected

The V28-R2 validator passed the American row. A complete-route-feasible group
of ten infantry launched at tick 2700, transferred all ten expected units, and
serialized 63 points of physical enemy-building damage. The gate nevertheless
failed globally because this seed family did not expose a route-infeasible veto.

More importantly, the African row failed its per-row contract. A direct
building-feasibility certificate launched seventeen infantry at tick 2700 with
predicted building completion in 289.587 ticks and predicted survival of
400.317 ticks. All seventeen expected units transferred exactly, but the row
serialized zero physical building damage. Public self-snapshots showed the
assigned group falling from 17 living units at tick 2700 to 12 at tick 3000,
7 at tick 3300, 1 at tick 3600, and 0 at tick 3900. This is a false-positive
preterminal conversion certificate, not a validator failure.

These are outcome-blind mechanism observations. Job `22241967` remains failed
and its seed is never reused.

## Causal interpretation

V28 repaired the readiness-ownership veto by making the actual transferred set
authoritative, but it also allowed objective feasibility to bypass actual force
composition completely. That permitted early all-infantry preterminal waves.
Across V28-R2, the nominal race model did not reliably certify physical
conversion: the American wave produced only limited damage and the African wave
produced none before complete attrition.

This does not justify a universal tank requirement for the literal final
building. When exactly one building remains, an exposed winning strike still
dominates fighting irrelevant forces. It does justify requiring a more robust
actual transferred force before sacrificing the active vanguard while several
buildings remain.

## Frozen V29 repair

V29 preserves V28 except for one new policy field:

`preterminalObjectiveFeasibilityRequiresTransferredCapability: true`

When more than one enemy building remains, direct-building and complete-route
feasibility may bypass readiness-mission ownership counts but may not bypass the
actual transferred ground-assault certificate. The transfer-certified set must
contain at least one side-appropriate main tank and at least one compatible
screen. Until then, compatible units remain under active Supalosa predecessor
combat while readiness production continues and feasibility is re-evaluated.

When exactly one enemy building remains, the objective-feasibility override is
unchanged: a feasible direct or complete-route strike may launch without the
preterminal composition requirement. Thus a reachable last-building kill still
has lexicographic priority over an arbitrarily large off-route enemy army.

Activation telemetry advances to schema 23 and records whether objective
feasibility is currently allowed to bypass composition. Tests must establish:

1. preterminal direct and complete-route infantry-only forces do not launch;
2. the same preterminal missions launch once the actual transfer-certified set
   contains a main tank and screen, even when readiness-owned counts are zero;
3. an infantry-only direct or complete-route mission may still launch when
   exactly one building remains;
4. blocked preterminal forces retain active predecessor delegation and
   production; and
5. the final-building-versus-100-off-route-tanks rule remains unchanged.

## Frozen V29 focused gate

The outcome-blind V29 focused gate uses unused valid seed base
`4_288_000_000`, repeats the American and African rows exactly, and serializes
no competitive outcome. Every preterminal objective-feasible evaluation with a
composition-incomplete transferred set must remain blocked. Every preterminal
launch must have an actual transferred main tank and screen; terminal launches
may use the literal-objective override. At least one row must expose the new
preterminal block, and at least one row must subsequently launch a certified
force, hand off every expected unit, and cause positive physical building
damage. No resignation is permitted.

The new gate does not require a fresh route-infeasible row: V29 does not change
V28's full-route requirement, while the new intervention is specifically the
composition-incomplete but nominally objective-feasible state. All-nine-country
reciprocal-slot outcome-blind evaluation remains required after the focused
gate. No sealed test-family outcome may be opened before both gates pass.
