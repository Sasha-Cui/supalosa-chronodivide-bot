# Mission-native closeout amendment 45: V35 smoke failure and R1 branch probe

## Scope

This amendment records the first V35 liveness smoke exactly as run and freezes a
prospective, outcome-free branch-exposure repair. It does not change the V35
policy, inspect a winner or score, authorize a development outcome screen, or
support a competitive claim.

## Preserved V35 smoke failure

The prespecified smoke ran exactly once as Slurm job `22264510` from commit
`9c8adff01533b1ec7c620ef00374a488be861468` under account `pi_jss233`. It
finished all eight traces before failing its coverage validator. The immutable
artifact is:

`research-evidence/mission-native-closeout/outcome-blind-liveness-smoke-v35/22264510/liveness-smoke-v35.json`

Its SHA-256 is
`326d14dc5a6f89033b07a530559ca888ee28c1181de8b4c98a42992a51e5a32e`.
Both rows passed their local exact-disabled, repeat-determinism, resignation, and
telemetry checks. Across the enabled traces the smoke observed 57 certified
physical-progress events, but no progress deadline, predecessor fallback,
overlay suspension, or replan. The German cell did not activate. The Libyan
cell produced 57 progress events through tick 5,388. The smoke therefore failed
for absent branch exposure, not a runtime error or an invalid observed fallback.

No full V35 matrix may launch from this partial result.

## R1 branch-exposure repair

Natural progress and recovery-branch coverage are separate obligations. A
healthy trajectory need not stall merely to exercise a fallback. R1 therefore
uses one deterministic live simulator probe whose cell and seed come from the
already complete, outcome-free V34-R1 artifact rather than from V35 results:

- country: Germans;
- candidate slot: 0;
- engine seed: `4294850006`; and
- maximum ticks: 5,400.

In V34-R1, this exact technical trace had 98 building-strike decisions, zero
blocker-clear decisions, and no building damage until tick 4,740 after its first
engagement decision at tick 3,948. Its maximum gap between certified building
damage opportunities was 792 ticks. This selection uses no winner, score, or
termination label and was fixed before running V35 on that cell and seed.

The R1 probe runs the direct external baseline, disabled V35 adapter, enabled
V35, and an exact enabled repeat. It passes only if:

1. direct and disabled traces are exactly identical and disabled telemetry is
   empty;
2. enabled repetitions are exactly deterministic;
3. an exact 300-tick `building_no_progress` fallback starts with released units;
4. the overlay is suspended during the 180-tick interval;
5. at least one ordinary, unit-owning predecessor attack mission is active;
6. exactly one replan occurs at the frozen boundary; and
7. no participant attempts resignation.

The original failed smoke is not rerun or relabeled. If this fixed probe fails,
V35-R1 fails closed and must be repaired prospectively.

## Population-gate interpretation after a probe pass

Only a passing R1 branch probe may permit the fresh 72-trace all-country gate.
That population gate must still prove physical building and blocker progress,
all countries, reciprocal slots, exact disabled identity, deterministic enabled
traces, allocation and queue invariants, and validity of every naturally
occurring fallback. It need not manufacture a fallback in every faction and
slot: branch execution is established by the fixed probe, while natural traces
are required to avoid invalid or incomplete fallback sequences whenever one is
triggered. This separation prevents a coverage test from treating uninterrupted
physical progress as a liveness failure.
