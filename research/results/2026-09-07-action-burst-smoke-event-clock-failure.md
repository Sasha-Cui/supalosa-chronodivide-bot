# Action-burst V1 smoke: event-clock boundary failure

Date: 2026-09-07

## Disposition

Outcome-blind smoke `25189533` completed the 3,600-update loop, then failed
the in-memory event validator before writing a trace. It preserved one bounded
generic `FAILURE.json` and no partial event stream or completion record.

No action value, W/D/L, score, endpoint, defeated state, building state, or
policy ranking was serialized or inspected.

## Cause

The collector records `game.getCurrentTick()`. Calls made during the final
engine update can therefore carry update label `3600`. The validator and
temporal summary admitted only labels below `3600`.

All other rejected event conditions are already enforced at collection time;
the failure occurred only after the complete loop inside the independent
summary check. This is an event-clock boundary mismatch, not a gameplay result.

## Frozen attempt

- source:
  `b5c04cf01da2f9122fad14c019a14acb94688fa9`
- program SHA-256:
  `208198b93591795f624da2966f48b34ee1cf5dcc1a034255cb77ae5460e1a02b`
- manifest job: `25167651`, `COMPLETED 0:0`
- manifest SHA-256:
  `109735f849666a2034e46a9a16f26b1275e913895309be1c2a9db7890137cc05`
- smoke job: `25189533`, `FAILED 1:0`, `pi_jss233/day`, one CPU,
  zero GPU, zero restarts
- node: `c1102u07n02`
- elapsed: 32 seconds

## Repair

Amendment A7 defines initialization label zero separately from the 3,600 live
update labels. Live calls use labels 1 through 3,600 inclusive, four exact
quarters, and rolling windows. Initialization calls remain reported but cannot
set the protected live-update reserve.

The replacement requires a new source-bound manifest and exclusive
`execution-v1-a4-runtime-a1-certificate-a6` root. No action or competitive
observation from the failed smoke is available.
