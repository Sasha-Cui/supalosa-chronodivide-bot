# Mission-native closeout amendment 46: V35-R1 probe pass and population gate

## Complete branch-probe evidence

The frozen V35-R1 liveness probe ran exactly once as Slurm job `22264739`
from commit `177abbc32b386309c0911c86e94e0c79461d9512` under account
`pi_jss233`. It completed with exit `0:0` in `00:03:37`, used one CPU, and
reached maximum resident memory `395784K`. The immutable artifact is:

`research-evidence/mission-native-closeout/outcome-blind-liveness-probe-v35-r1/22264739/liveness-probe-v35-r1.json`

Its SHA-256 is
`55fac9bc4d6190cbf1f00e078d6f377eeb2a33e1a4408da6154215e529f5504e`,
and the job wrote `PASS_MISSION_NATIVE_CLOSEOUT_LIVENESS_PROBE_V35_R1` to
`COMPLETE`.

The direct external and disabled V35 traces had the same digest, and the two
enabled traces had the same digest. The enabled trace recorded 29 certified
physical-progress events, one building no-progress fallback start, two active
fallback audits, one active unit-owning predecessor mission audit, one overlay
suspension audit, and one exact replan. No validation error occurred. These are
technical branch facts only; the artifact contains no inspected winner or score.

## Frozen R1 population validator

The fresh 72-trace all-country gate retains every V34-R1 compatibility,
allocation, production, queue, country, reciprocal-slot, determinism,
resignation, and provenance obligation. It also requires certified physical
building and blocker progress.

For every naturally occurring V35 fallback, the validator requires:

1. the frozen 300-tick building or 240-tick blocker deadline;
2. nonempty released unit identifiers;
3. an active audit strictly inside the 180-tick interval;
4. at least one active unit-owning predecessor attack mission;
5. at least one suspended closeout-overlay mission; and
6. exactly one replan at the frozen boundary when that boundary lies within the
   trace horizon.

The population validator does not require every faction or reciprocal slot to
stall. The fixed R1 probe supplies live recovery-branch coverage; the population
gate measures natural compatibility and fails every invalid fallback that does
occur. This validator was fixed before the fresh V35-R1 population run.

One complete V35-R1 all-country run is now authorized on fresh seed base
`4294900000`. Failure preserves the complete outcome-free artifact and stops the
program before any outcome screen.
