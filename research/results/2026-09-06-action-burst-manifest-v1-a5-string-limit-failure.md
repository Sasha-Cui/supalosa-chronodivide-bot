# Action-burst V1 manifest A5 attempt: audit string-limit failure

Date: 2026-09-06

## Disposition

Replacement zero-game manifest job `24982190` failed before creating its
execution root or manifest. No game, action trace, or competitive field was
generated.

## Cause

The A2 seed audit is 537,547,172 bytes. Node.js 20.13.1 correctly passed the
runtime and transitive dependency checks, then failed while converting the
entire audit buffer into one JavaScript string. V8's maximum string length is
below the complete audit size even with a larger heap.

The audit bytes and JSON are valid; Python verification previously parsed the
same artifact successfully. The failure is an ingestion implementation error,
not evidence drift.

## Frozen attempt

- source:
  `094cbd98693f8f7ade9557c638c749a0fdefc26f`
- program SHA-256:
  `423b6b5b77b0c263a09d54e4a72c1388431980cb1cfae021dc056d18def39ffb`
- scheduler: `24982190`, `FAILED 1:0`, `pi_jss233/day`, Node
  `v20.13.1`, one CPU, zero GPU, zero restarts
- elapsed: 38 seconds
- node: `c1104u09n03`

Stdout is empty. Stderr preserves `ERR_STRING_TOO_LONG`. No execution file
was written.

## Repair

Amendment A6 adds a separate Python-validated compact seed-selection
certificate. The certificate rehashes and parses the complete A2 audit,
validates every frozen selection invariant, and serializes only its technical
identity, ordered candidate decisions, coverage counts, and selected range.
Node manifest code rehashes the full audit bytes but parses only this compact
certificate.

The next manifest uses a new exclusive execution root. No population, seed,
trace, horizon, measurement, gate, or file budget changes.
