# Mission-Native Closeout: Amendment 21

Date: 2026-08-14

Status: **completed outcome-free V18 gate and frozen production microdiagnostic**

## Completed V18 evidence

The repaired V18 compatibility gate completed as Slurm job `22234490` under
account `pi_jss233`.

- source commit: `02234cd54d28798504c96fca90ef625e1ef179a2`
- external baseline commit: `165b77a71d0cf5ebd27c65b19d0486bcbae78d0f`
- artifact:
  `research-evidence/mission-native-closeout/outcome-blind-compatibility-v18/22234490/compatibility-v18.json`
- artifact SHA-256:
  `c21b08064c92072643582b7741ebb47639c397dfbe55f4b63f3913f3a38a5d9e`
- scheduler state: `FAILED`, exit code `1:0`, elapsed `00:07:08`
- peak batch RSS: 442,332 KiB
- artifact status:
  `FAIL_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_V18`
- coverage: 9 countries, 2 reciprocal slots, 4 deterministic games per cell,
  72 games
- outcome inspected: no

The scheduler failure is the gate's intentional fail-closed exit after writing
the complete artifact.

## Outcome-free findings

V18 repaired the two mechanisms targeted by Amendments 19 and 20.

- All 191 certified launch identifiers transferred to the closeout; none were
  destroyed or alive outside it at the launch audit.
- Both Allied `GAWEAP` and Soviet `NAWEAP` became physically visible.
- Fourteen of 18 cells activated and ten cells caused physical building damage,
  totaling 1,964.
- The method emitted 427 side-correct production requests across `MTNK` and
  `HTNK`.
- No tank appeared in the pre-launch certified activation counts on either side.
- Four Allied cells never activated; three activated Soviet cells caused no
  building damage. Eight cells therefore failed their local contract, and the
  global acquired-tank requirement also failed.

V18 is rejected as a complete technical policy and authorizes no outcome-bearing
comparison.

## Why a microdiagnostic comes next

The V18 summary establishes that a war factory exists and a tank request is
emitted, but it does not serialize the vehicle queue or distinguish an
unavailable unit, an unstarted request, a paused/blocked queue, an in-progress
unit, and a produced unit subsequently claimed by another mission. Changing
policy priority or prerequisites without that distinction would be speculative.

## Frozen production microdiagnostic

Before any V19 policy change, run one bounded outcome-free production probe.

1. Use the unchanged V18 policy, map bytes, tick horizon, external baseline, and
   source/runtime provenance checks.
2. Use the first enumerated Allied country (`Americans`) and first enumerated
   Soviet country (`Africans`), candidate slot 0, seed base `4_150_000_000`.
3. Run each side twice in fresh games with the identical requested seed: four
   launched games total.
4. The runner must abort if a game terminates before the tick cap and must not
   inspect or serialize win, loss, draw, score, terminal tick, opponent state,
   or sealed-family information.
5. Extend the existing assault-production telemetry with schema 14 state:
   requested unit availability, candidate credits, vehicle-queue status, and
   vehicle-queue item names and quantities. Preserve the existing count and
   request fields.
6. Serialize only candidate self snapshots already collected by the compatibility
   runner, schema-14 assault-production state, assault-infrastructure state,
   deterministic trace digests, quit-attempt counts, and provenance.
7. Require exact same-seed repeat identity and zero resignation attempts. The
   diagnostic succeeds by producing a valid deterministic artifact; tank
   acquisition is a finding, not a pass condition.
8. Preserve the complete artifact and use its queue state to freeze exactly one
   prospective V19 repair. Do not rerun the 72-game all-country gate until the
   implicated mechanism passes a focused deterministic unit/integration test.
