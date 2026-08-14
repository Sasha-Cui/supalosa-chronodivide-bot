# Mission-Native Closeout: Amendment 30

Date: 2026-08-14

Status: **presimulation V25 launch repair**

Slurm job `22237801` ran under `pi_jss233` from clean tracked `main` source
`2ccb84739562394d1c92497b92f4e51014912fd6`. It failed before the first game
was created because the frozen seed base `4_300_000_000` exceeds the engine's
maximum unsigned 32-bit seed `4_294_967_295`.

- scheduler: `FAILED`, exit `1:0`, elapsed `00:00:38`, peak RSS 139,596 KiB
- stdout: empty
- stderr: `Engine seed must be an integer in [0, 4294967295], got 4300000000`
- artifact: none
- outcome-bearing games launched: zero

This is a launch-configuration defect, not a V25 behavioral result. No seed was
consumed by a game and no outcome, telemetry trace, or policy observation was
produced.

Prospectively replace the invalid bases with previously unused valid ranges:

- focused V25 base: `4_275_000_000`
- all-country V25 base, conditional on a focused pass: `4_285_000_000`

All other V25 policy, gate, and fail-closed criteria remain frozen. Add a unit
test requiring the focused base and every derived focused seed to remain within
the engine's unsigned 32-bit range. Submit one new focused job only after the
repair is committed on clean `main`.
