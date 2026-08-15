# Mission-Native Closeout Amendment 38: V29 All-Country Failure and V30 Repair

Recorded: 2026-08-14 (America/New_York)

Status: **V29 advancement stopped; prospective V30 technical repair frozen
before any V30 gameplay**

## V29 all-country gate reconciliation

The outcome-blind V29 all-country gate ran exactly once as Slurm job
`22243973` under account `pi_jss233` from clean `main` commit
`a359142dfd45a7c11b8e869d7201cb1e8809b042` against the clean external
Supalosa baseline at commit
`165b77a71d0cf5ebd27c65b19d0486bcbae78d0f`.

Scheduler evidence:

- job: `22243973` (`chrono-closeout-all-v29`);
- state: `FAILED`;
- exit code: `1:0`;
- elapsed: `00:15:45`;
- account: `pi_jss233`; and
- maximum resident memory observed for the batch step: `463488K`.

The fail-closed runner completed all 72 predeclared outcome-free traces before
returning failure. It preserved:

- artifact:
  `/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/mission-native-closeout/outcome-blind-all-country-gate-v29/22243973/all-country-gate-v29.json`;
- artifact SHA-256:
  `a1cfe1edc8f004fcb5a4983c0cfcdee8c6a0c2a6b1673b8a5f9d1c2390c647e0`;
- status: `FAIL_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_ALL_COUNTRY_GATE_V29`;
- exact direct/disabled equivalence and repeat-trace commitments for every
  country-slot cell; and
- no winner, score, candidate score, or sealed-family outcome.

The V27/V28/V29 open outcome screen is dormant and must not launch.

## Outcome-free failure evidence

Across the 18 country-slot cells, the gate observed 680 preterminal
composition-blocked evaluations, six certified launches, six exact launch
handoffs, and 4,008 hit points of enemy-building damage. All six conversions
were Allied. The global failure was:

`Soviet rows never converted a composition block into certified building damage`.

The complete matrix also exposed a separate safety failure. Enabled V29 made
deterministic candidate resignation attempts in three Allied slot-0 cells,
while the same-seed direct and disabled Supalosa paths made none:

| Country | Candidate slot | Enabled quit attempts per repeat | Direct/disabled quit attempts |
|---|---:|---:|---:|
| France | 0 | 34 | 0 |
| Germany | 0 | 21 | 0 |
| Great Britain | 0 | 26 | 0 |

These are technical traces, not game outcomes. The three failures were exact
across the enabled repeat.

## Diagnosed mechanisms

The preserved public-interface telemetry supports two prospective technical
repairs.

1. **Missing Soviet screen infrastructure.** V29 requests an `E2` screen but
   its assault-infrastructure mission only constructs the vehicle factory
   (`NAWEAP`). Soviet starts often contained either `NAHAND` or `NAWEAP`, not
   both. Russian and Iraqi cells acquired a physical `HTNK` but retained zero
   mission-owned `E2` screens; other Soviet cells never acquired the vehicle
   factory. The code had no side-correct barracks-construction path.
2. **Destructive prelaunch production reservation.** V29 removes unrelated
   production requests and cancels unrelated queue items as soon as the
   low-building production scope is reached, before a closeout launch is
   certified. This changes ordinary defensive/economic behavior while the
   closeout force is still infeasible and is the leading code-level mechanism
   for the deterministic enabled-only Allied collapse.

The gate does not establish a gameplay-effect claim. It establishes that V29
is technically unsafe and faction-incomplete, which is sufficient to stop it.

## Frozen V30 repair

V30 changes exactly two production mechanisms relative to V29:

1. add side-correct assault-screen infrastructure (`GAPILE` for Allied,
   `NAHAND` for Soviet); and
2. disable the destructive production-reservation path so ordinary Supalosa
   production is not canceled before a closeout is certified.

V30 retains V29's terminal objective, completion-race engagement,
preterminal force certificate, transferred-capability requirement, route
feasibility, exact external Supalosa wrapper, and public-complete-state
information interface.

This repair is frozen before V30 gameplay at fresh engine-seed base
`4_293_500_000`. No V29 country-slot trace may be selectively rerun.

## V30 outcome-blind all-country gate

The next technical gate is a complete new matrix:

- all nine countries;
- both reciprocal candidate slots;
- direct external Supalosa, disabled V30 adapter, enabled V30, and exact
  enabled repeat;
- 72 total traces;
- 5,400 ticks per trace;
- no resignation forwarding;
- no outcome calculation or serialization; and
- Slurm account `pi_jss233` only.

It passes only if:

- direct and disabled traces are exactly identical in all 18 cells;
- enabled repeats are exact in all 18 cells;
- every trace has zero resignation attempts;
- V30 emits zero production-reservation events;
- both faction families evaluate their side-correct screen infrastructure and
  at least one Soviet cell requests missing `NAHAND` infrastructure;
- both faction families and both slots expose preterminal composition blocking;
- both faction families and both slots later convert a composition block into
  a certified handoff and physical enemy-building damage; and
- source, baseline, map, policy, scheduler, and account commitments remain
  exact.

Any failure preserves the complete outcome-free artifact and stops
advancement. Only a complete pass permits a newly frozen open-training screen;
it does not itself support a paper claim.
