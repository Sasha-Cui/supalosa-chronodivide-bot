# Mission-Native Closeout: Amendment 3

Date: 2026-08-14

Status: completed outcome-free v3 gate and prospective v4 freeze

## Completed v3 evidence

Mission-native compatibility-v3 completed as Slurm job `22199131` under
account `pi_jss233`.

- source commit: `001c5fc8c5d744549eef48021e8c22d00e04793b`
- artifact: `research-evidence/mission-native-closeout/outcome-blind-compatibility-v3/22199131/compatibility.json`
- artifact SHA-256: `864e110e3c24d4336940f33ddba7cadf7d861775baeb9c3f232af95e25d9f133`
- scheduler state: `FAILED`, exit code `1:0`, elapsed `00:08:21`
- artifact status: `FAIL_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_COMPATIBILITY_V3`
- coverage: 9 countries, 2 reciprocal slots, 4 deterministic games per cell,
  72 games
- global validation errors: none
- outcome inspected: no

The scheduler failure is the gate's intentional fail-closed exit after writing
a complete artifact.

## Outcome-free findings

- cells passing the complete technical contract: 10/18
- cells with physical building damage: 10/18
- aggregate building damage: 2,136 across 46 progress events
- bounded split allocations: 433
- pure building allocations: 453
- blocker-clear decisions: 1,916
- building-strike decisions: 619
- no resignation attempts in any enabled cell

Bounded screening fixed both American cells and removed the v2 resignation
failure. It also increased damage in several passing Allied cells. The eight
failing cells were Alliance slot 1, French slot 1, British slots 0 and 1,
Africans slot 1, Arabs slot 1, Confederation slot 1, and Russians slot 1.
Every failing cell committed only to a refinery (`GAREFN` or `NAREFN`) and
recorded no physical damage. Passing cells committed to GAPILE, GAWEAP,
NAPOWR, or NAWEAP and did record damage.

The v3 gate therefore isolates stale target commitment: the force can own the
mission, preserve building-directed allocation, and avoid resignation while
still spending the entire remaining horizon on one non-progressing building.
The v3 gate does not authorize an outcome-bearing screen.

## Frozen v4 mechanism

V4 preserves v3 exactly and adds only progress-certified retargeting:

1. The mission retains its frozen 600-tick no-damage stall certificate.
2. A committed building remains fixed while it is taking physical damage or
   has not yet reached the stall interval.
3. Once the committed building is certified stalled, the commitment is
   released prospectively.
4. Certified-stalled buildings are placed behind all compatible non-stalled
   buildings in the deterministic target ranking.
5. The next compatible non-stalled building becomes the new commitment.
6. A building that later takes physical damage loses its stalled state under
   the existing progress tracker and can again be selected.
7. If every surviving compatible building is stalled, deterministic ranking
   remains available rather than suppressing all attacks.

No target type, country, slot, coordinate, or outcome-specific exception is
introduced.

## V4 gate

The fresh v4 gate retains disabled equivalence, repeat determinism, all nine
countries, reciprocal slots, four games per cell, bounded allocation
certificates, no-resignation checks, and physical building damage in every
cell. It additionally requires that stalled-target exposure and a subsequent
change of target identity occur somewhere globally. No outcome is inspected
or serialized.

## Decision rule

- Pass all 18 cells: authorize the two-arm opened-development screen.
- Fail any cell: do not inspect outcomes; diagnose the complete v4 telemetry
  and revise or reject the mechanism prospectively.

No cell-specific exception, selective rerun, or paper claim is permitted.
