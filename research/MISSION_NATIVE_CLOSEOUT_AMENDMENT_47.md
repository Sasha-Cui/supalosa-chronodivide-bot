# Mission-native closeout amendment 47: complete V35-R1 artifact and R2 revalidation

## Complete V35-R1 population artifact

The fresh all-country gate ran exactly once as Slurm job `22265722` from commit
`329bd68913c390cae342df4fe9beaae37f9d79c2` under account `pi_jss233`.
It completed all 72 outcome-free traces before its validator exited `1:0` after
`00:18:01`. The complete immutable artifact is:

`research-evidence/mission-native-closeout/outcome-blind-all-country-gate-v35-r1/22265722/all-country-gate-v35-r1.json`

Its SHA-256 is
`dc120885b30cf4d82b90cfcbe58fff6ec42c2f247112e53eeaf3c9b7d5409f85`.
No `COMPLETE` marker was written.

The artifact contains all 18 country-slot cells, exact direct/disabled identity
in every cell, exact enabled-repeat identity in every cell, changed enabled
commands in every cell, and zero resignation attempts. It records 7,861 hit
points of building damage, 1,202 objective-race allocations, 243 bounded blocker
allocations, 482 physical-progress events, eight fallback starts, sixteen active
fallback audits, eight active predecessor handoffs, eight overlay suspensions,
and eight exact replans. No destructive production reservation occurred.

The gate failed for two validator reasons:

1. eight cells relaunched once after their valid bounded fallback, while the
   inherited V29 validator rejected any second schema-19 capability launch before
   checking its matching activation and handoff; and
2. all 243 fresh bounded blocker allocations occurred in Soviet cells, while the
   inherited coverage validator required new blocker incidence in both factions.

The first is a validator incompatibility with the frozen V35 recovery design,
not an observed invalid relaunch. The second is an opportunity-incidence failure,
not absence of the mechanism: the unchanged V34-R1 mechanism already recorded
four Allied and 449 Soviet bounded blocker allocations, with exposure in both
reciprocal slots. These statements use telemetry only and do not inspect a
winner, score, or termination label.

## Frozen R2 validator-only correction

R2 does not rerun a game. It extends the shared launch validator behind an
explicit opt-in profile that remains disabled for V29 and earlier gates. Under
that profile, every recovery episode must contain:

- one structurally valid schema-19 capability launch;
- one matching schema-23 feasibility evaluation and one activation at the same
  tick;
- one complete schema-10 handoff after that launch and before the next launch;
- matching progressive or attritional telemetry when applicable; and
- positive physical building damage somewhere in the complete trace.

The V35 gate alone enables repeated launch after recovery. Natural blocker
coverage is required in the complete V35 population, but new cross-faction
incidence is not required because target and allocation logic are unchanged from
the already complete V34-R1 cross-faction proof.

One validator-only Slurm job may read the exact artifact and checksum above. It
must reject winner or score keys recursively, reconcile all 72 traces and 18
cells, rerun the corrected telemetry and coverage validators, preserve the
original trace digests and quit audits, and write a new non-overwriting R2 result
that points to the immutable input. A failure stops the program. No game replay
or outcome screen is authorized by this amendment alone.
