# Mission-Native Closeout: Amendment 28

Date: 2026-08-14

Status: **completed activation diagnostic and prospective V24 progressive-blocker freeze**

## Completed outcome-free activation diagnostic

Slurm job `22236934` completed under `pi_jss233` from clean tracked `main`
source `4e5b2d92f3a783c82dbc688c9a91912094a65005` with unchanged V23
policy hash `4ae66ad21c91803da0120dbbd3ef7491e380940c582be393c66341b166f90c49`
and pinned external baseline `165b77a71d0cf5ebd27c65b19d0486bcbae78d0f`.

- artifact: `research-evidence/mission-native-closeout/outcome-blind-activation-diagnostic-v1/22236934/activation-diagnostic-v1.json`
- SHA-256: `232195d72b69801d630bd5952914a772d0b87b13a48f2ae713f155dfa85c0e0f`
- scheduler: `COMPLETED`, exit `0:0`, elapsed `00:01:51`, peak RSS 390,828 KiB
- artifact status: `PASS_OUTCOME_FREE_MISSION_NATIVE_CLOSEOUT_ACTIVATION_DIAGNOSTIC_V1`
- four games; both same-seed repeats were exact; no outcome was serialized or inspected

The diagnostic resolved the launch barrier. Americans emitted 80 `blocked` and
one `no_target` schema-12 evaluations; Africans emitted 75 `blocked`
evaluations. Neither faction emitted `building_ready`, `blocker_ready`,
`activated`, or `launch_handoff`.

The American combined-arms reserve did contain a main tank. Across tank-present
evaluations it had three to five compatible staged attackers and 15–16 route
threats. The selected `E1` blocker required only 1.17–2.20 estimated ticks to
remove, within 27.46–65.28 estimated survival ticks, but the controller required
the entire 408.82–753.03-tick route clearance to fit inside that survival
budget. It therefore declined even the individually feasible blocker attack.

The African trace physically produced a tank but its schema-12
`assaultTankCount` remained zero: the tank was not owned by a transfer-certified
mission. Its route was likewise blocked by the all-route certificate. These are
separate technical preconditions for the same liveness mechanism: a
purpose-built combined-arms force must be mission-owned before it can attack one
feasible relevant blocker and re-evaluate the building objective.

## Frozen V24 repair

V24 preserves V23 except for the following linked launch mechanism.

1. A distinct readiness-force mission owns post-freeze, side-correct `MTNK` or
   `HTNK` units as well as its screen infantry. It may receive those newly
   produced units from ordinary attack or defense missions without taking the
   frozen pre-existing vanguard.
2. Shared public state and outcome-blind telemetry report the readiness-owned
   tank and screen counts. Ambient or nontransferable units do not satisfy the
   launch precondition.
3. Direct feasible building attacks retain lexicographic priority.
4. When a route blocker prevents the building attack, V24 may launch if at
   least one readiness-owned main tank and one readiness-owned screen unit are
   present and the selected individual blocker's removal time is no greater
   than the force-survival time. The full-route clearance estimate no longer
   vetoes this one-blocker step.
5. The launched mission commits to that relevant blocker, then re-evaluates the
   building objective after physical blocker progress or removal. It does not
   redirect toward unrelated enemy forces.
6. Emit a schema-18 `progressive_blocker_launch` certificate containing target,
   blocker, readiness-owned force counts, compatible count, individual blocker
   removal time, full-route clearance time, and force-survival time.
7. Add exact V24 fields
   `adaptiveGroundAssaultReadinessForceOwnership: true` and
   `progressiveRouteBlockerLaunch: true`.

Use fresh focused seed base `4_280_000_000`. Require deterministic same-seed
traces, zero resignation attempts, physical factories and tanks on both
factions, readiness-owned tank and screen evidence, valid schema-18 progressive
launches, successful schema-10 handoff partitions, persistent production, and
positive physical enemy-building damage. Only a pass advances to the
all-country seed base `4_290_000_000`.

The focused gate remains outcome-free. Win, loss, draw, score, terminal tick,
and sealed-family data remain forbidden.
