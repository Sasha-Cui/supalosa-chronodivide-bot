# Mission-Native Closeout: Amendment 27

Date: 2026-08-14

Status: **failed focused V23 gate and prospective outcome-blind activation diagnostic freeze**

## Completed outcome-free focused V23 gate

Slurm job `22236740` completed under `pi_jss233` from clean tracked `main`
source `b978caf254bc04a418463c05b8a1fafecea01e62` and pinned external
baseline `165b77a71d0cf5ebd27c65b19d0486bcbae78d0f`.

- artifact: `research-evidence/mission-native-closeout/outcome-blind-focused-gate-v23/22236740/focused-gate-v23.json`
- SHA-256: `4ec4472c602a2d4d0ae2fca93263ea32b15826e808a52515d018788fa266e0c2`
- scheduler: `FAILED`, exit `1:0`, elapsed `00:02:05`, peak RSS 389,776 KiB
- artifact status: `FAIL_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_FOCUSED_GATE_V23`
- four games; both same-seed repeats were exact; no outcome was serialized or inspected

V23 established its intended production mechanism on both factions. Each side
physically built its side-correct war factory, requested screen infantry before
its first main tank, grew a readiness-owned screen after the request, acquired a
physical main tank, continued production telemetry, and emitted only valid
schema-16 local-defense events.

The Americans first exposed `GAWEAP` and requested `E1` at tick 3,432. The
readiness-owned screen reached three before the first `MTNK` at tick 3,876 and
four at tick 4,032. The factory disappeared at tick 4,008 and the tank by tick
4,116. It caused zero enemy-building damage and made 26 intercepted resignation
attempts in each repeat.

The Africans first exposed `NAWEAP` and requested `E2` at tick 3,264. The screen
first reached four at tick 3,528, but had been eliminated before the first
`HTNK` at tick 4,296. It regrew to four at tick 4,500; the factory disappeared
at tick 4,524 and the tank survived until after tick 5,100. It caused zero
enemy-building damage and made no resignation attempt.

These observations establish production, assignment, and local-defense
exposure. They do not establish why neither combined-arms state became a
building-damage mission. In particular, the V23 artifact did not retain the
full schema-12 activation evaluations or schema-10 launch handoffs. Inferring a
route, compatibility, survival-certificate, or handoff defect from aggregate
counts would therefore exceed the evidence.

## Frozen activation diagnostic

Run the unchanged exact V23 policy once on fresh focused seed base
`4_260_000_000`, with Americans and Africans in candidate slot zero and one
same-seed fresh-process repeat per faction. Preserve all four launches.

The diagnostic may serialize only outcome-free public-state traces already
available to the candidate:

1. full schema-12 `activation_evaluation` events;
2. schema-2 `activation_blocked` events;
3. schema-6 `readiness_reserve` events;
4. schema-10 `launch_handoff` and schema-1 `activated` events, if any;
5. schema-3 engagement decisions, schema-14 production, schema-17 screen
   production, and candidate self snapshots; and
6. intercepted resignation-attempt counts.

The diagnostic must validate exact source, external baseline, scheduler account,
policy hash, fresh seeds, schema coherence, and same-seed normalized trace
identity. It must not inspect or serialize game outcome, score, terminal tick,
winner, loser, draw, or any sealed-family field. No V24 behavior may be frozen
until this diagnostic distinguishes among:

- no compatible or reachable building target;
- a direct-building certificate;
- an infeasible route/interceptor-clearance certificate;
- a feasible blocker-clearance certificate that did not launch; and
- a post-activation mission handoff failure.

The next policy change must address the observed class prospectively. A failed
or ambiguous diagnostic is preserved and stops automatic advancement; it is
not rerun on the same games.
