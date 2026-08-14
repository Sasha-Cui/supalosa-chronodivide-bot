# Mission-Native Closeout: Amendment 20

Date: 2026-08-14

Status: **V18 zero-game launch failure and prospective interface repair freeze**

## Preserved failed launch

The first V18 submission was Slurm job `22234189` under account `pi_jss233`.

- source commit: `eb1a539b5dbde68790ec8ff365ef3d11b07aa8d2`
- scheduler state: `FAILED`, exit code `1:0`, elapsed `00:00:19`
- peak batch RSS: 353,892 KiB
- evidence directory:
  `research-evidence/mission-native-closeout/outcome-blind-compatibility-v18/22234189`
- complete compatibility artifact: absent
- completed games: zero
- outcome inspected: no
- failure:
  `TypeError: missionController.disbandMissionForTransfer is not a function`

The job failed on the first candidate strategy update, before a trace or outcome
was produced. It is a technical launch failure and supplies no empirical policy
evidence.

## Interface diagnosis

The candidate deliberately injects the local closeout strategy around the pinned
external Supalosa bot. Consequently, the mission-controller object passed into
the local factory is instantiated from the pinned external package. That class
exposes the historical `disbandMission` interface but cannot expose the new local
`disbandMissionForTransfer` method without modifying the pinned baseline.

The external controller rebuilds its unit-ownership map from every mission's
public unit list at the beginning of the next controller update. Closeout
activation occurs after the current controller update, so an interface adapter
can provide equivalent transfer semantics without touching the pinned package:
empty the selected donor's public unit list immediately, then call its existing
ordinary disband method. On the next update the rebuilt ownership map omits those
identifiers, the donor callback receives an empty list, and the already-created
closeout can request the units.

## Frozen compatibility repair

V18 policy, seed base, gate horizon, countries, reciprocal slots, and all tactical
rules remain unchanged. The sole prospective repair is:

1. Add a building-elimination transfer-disband adapter.
2. If the supplied controller implements the native transfer method, delegate to
   it unchanged.
3. Otherwise, locate only the explicitly named donor through `getMissions()`,
   remove a copied list of its identifiers through the mission's public
   `removeUnit` operation, and call the controller's existing `disbandMission`.
4. Do not read or mutate the external controller's private ownership map, do not
   modify the pinned baseline package, and do not release unrelated missions.
5. Add deterministic tests for both native delegation and the legacy external
   fallback, including an empty donor completion list.

Because job `22234189` completed zero games and produced no compatibility
artifact, one replacement V18 submission may reuse the frozen V18 seed base.
The failed evidence directory and scheduler record must remain intact, and the
replacement receives its own Slurm job identifier and evidence directory.
