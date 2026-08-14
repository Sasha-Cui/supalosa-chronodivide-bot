# Mission-Native Closeout: Amendment 13

Date: 2026-08-14

Status: prospective technical-interface repair after pre-artifact V12 failure

## Preserved failure

The first V12 compatibility attempt ran as Slurm job `22217753` under account
`pi_jss233` from source commit
`1ddd8293e8789599462590ced9c84b9d7507a955`.

- scheduler state: `FAILED`, exit code `1:0`, elapsed `00:00:21`
- evidence directory: `research-evidence/mission-native-closeout/outcome-blind-compatibility-v12/22217753`
- preserved files: `job.stdout.log`, `job.stderr.log`
- output artifact: none
- outcome inspected: no

The candidate reached V12 activation evaluation and raised
`TypeError: missionController.getAssignedMissionName is not a function`. The
injected strategy executes inside the pinned external Supalosa bot, whose
runtime mission-controller class predates the new local read-only method. This
is an interface-compatibility failure, not an empirical gate result.

## Frozen repair

The V12 policy, readiness equation, transfer rules, seeds, coverage, and gate
criteria remain unchanged. The only repair is a read-only compatibility query:

1. Use `getAssignedMissionName(unitId)` when the supplied controller implements
   it.
2. Otherwise enumerate the controller's existing public `getMissions()` view,
   locate missions whose public `getUnitIds()` contains the unit, and return the
   matching public `getUniqueName()`.
3. Return `null` when no mission owns the unit.
4. Fail closed if more than one mission claims the same unit.
5. Add pure tests for the native path, the legacy public-view path, unassigned
   units, and duplicate ownership.

After build and the full unit suite pass, rerun the complete 72-game V12 gate
under a new Slurm job identifier. Do not reuse the failed job directory and do
not run a selected country or slot.
