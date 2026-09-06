# Action-burst V1 manifest certificate-marker parser failure

Date: 2026-09-06

## Disposition

Zero-game manifest job `24999029` failed before creating its execution root
or manifest. No game, action trace, or competitive field was generated.

## Cause

The A6 implementation rehashed the compact certificate successfully, then
parsed its valid SHA-256 sidecar with the regular expression `/\\s+/`.
That expression matches a literal backslash followed by `s`, not whitespace.
The complete marker itself was also valid. The source therefore compared the
entire sidecar line to the expected hash and failed closed.

## Frozen attempt

- source:
  `487ec3c84079f905bbfc9d10d2d0e38ceea68deb`
- program SHA-256:
  `d66c9cb15cb2591907aaf9334660ed38b27639528eea52c6dea4100b624fc69b`
- scheduler: `24999029`, `FAILED 1:0`, `pi_jss233/day`, Node
  `v20.13.1`, one CPU, zero GPU, zero restarts
- elapsed: 13 seconds
- node: `c1104u07n02`

Stdout is empty and stderr preserves the exact fail-closed stack. No execution
file exists.

## Prospective repair

Replace the parser with `/\s+/`, keep the exact certificate and marker
requirements, and use a new exclusive
`execution-v1-a4-runtime-a1-certificate-a2` root. No protocol, population,
seed, runtime, trace, metric, gate, or resource changes.
