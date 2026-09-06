# Action-burst V1 smoke: unsupported game-mode failure

Date: 2026-09-06

## Disposition

Outcome-blind smoke `25043416` failed before the engine created a game or
executed an update. It wrote one bounded generic `FAILURE.json` and no action
trace or completion record.

No W/D/L, score, endpoint, defeated state, building state, action event, or
policy ranking was generated.

## Cause

The trace runner passed numeric game mode `0`. The pinned game API requires
one of the map's advertised modes, obtained from
`cdapi.getAvailableGameModes(mapName)`. The V2 endpoint runner used the first
advertised mode; the new smoke wrapper accidentally hard-coded zero.

## Frozen attempt

- source:
  `271f8d2c9e5c2a2f5531d4c69b4d2e2046fbc6ae`
- program SHA-256:
  `5c0c9f3c2bcc0ed903d4ca8e1981c047eafaf31c88be62e2c2181b5af308a88f`
- manifest job: `25007453`, `COMPLETED 0:0`
- manifest SHA-256:
  `a07553311e0774c51ef7fde77549b7e9842124f3da29dc70be6e801c0132bd02`
- smoke job: `25043416`, `FAILED 1:0`, `pi_jss233/day`, one CPU,
  zero GPU, zero restarts
- node: `c1102u09n03`
- elapsed: six seconds

The generic failure artifact contains only technical stage, exception class,
message/frame digests, source, and scheduler identity.

## Prospective repair

After `cdapi.init`, require exactly one nonempty first advertised game mode
for the assigned map and pass it to the unchanged settings object. Use a new
source-bound manifest and exclusive
`execution-v1-a4-runtime-a1-certificate-a3` root before another smoke.

No seed, assignment, horizon, action instrumentation, summary, reserve rule,
gate, runtime, or resource changes.
