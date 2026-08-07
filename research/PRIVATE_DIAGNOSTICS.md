# Private map-compatibility diagnostics

These artifacts diagnose outcome-free infrastructure only. They are not paper
results, are not entered in `RESULT_REGISTRY.tsv`, and must not be used to
select a policy, hyperparameter, map role, or reported gameplay result.

## Jobs

- Job 21605200 failed closed before any engine session because the supervisor
  stripped the private diagnostic path from child environments. It produced no
  warning text and no gameplay evidence.
- Job 21605386 completed all 11 passive families under `pi_jss233` at commit
  `9b4e7641bf172cf59dda5d5c6e592a624083ff74`. It wrote 40
  outcome-redacted warning records to a mode-0700 private directory: two
  reciprocal copies of one warning for `mf_isleland`, and two reciprocal copies
  of 19 warnings for `mf_mp20t6`.

Every private record's SHA-256 exactly matches the corresponding hash-only
record in confirmation job 21600745. `mf_isleland` skips one shoreline-sound
action whose waypoint 65 is absent. `mf_mp20t6` skips 19 lake/bird-sound actions
whose referenced waypoints are absent. These are functional map-trigger
incompatibilities, not generic benign warnings. The prior classifier required a
generic warning token in addition to the word `waypoint`, so the engine phrase
"No valid location found" fell through to `other_warning`. Commit `a8a6c57`
repairs that prospective classification and tests the exact observed phrase.

The other five failure hashes were resolved without private text collection by
matching pinned engine error templates: `isosnow.mix` is absent for the Snow
map, `isourb.mix` is absent for three Urban maps, and the Red Valley
representative requests the Yuri's Revenge-only Desert theater while the pinned
contract is Red Alert 2.

Raw diagnostic text remains private under
`research-evidence/private-diagnostics/map-warning-text-v1`. Only the derived,
outcome-free adjudication above belongs in a release.
