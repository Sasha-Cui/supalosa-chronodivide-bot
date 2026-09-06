# Action-burst V1 manifest attempt: runtime hash failure

Date: 2026-09-06

## Disposition

Zero-game manifest job `24979178` failed before creating the execution root
or manifest. No game was initialized and no action or competitive field was
generated.

## Cause

The Slurm wrapper invoked the compute-node default Node.js `v22.22.3`
instead of the frozen `v20.13.1` runtime. The manifest program then used
locale collation for a transitive dependency tree whose authoritative audit
hash uses bytewise UTF-8 path order. The dependency bytes, file counts, and
sizes were unchanged; only the path-ordering algorithm disagreed.

The program failed at transitive-dependency validation after seven seconds.
The stdout log is empty. The stderr log preserves the stack trace. No
`execution-v1-a4` directory or partial manifest exists.

## Frozen attempt

- source:
  `cfc10a1e7d15d1c7f64b7f3fac2ab33fc3c3e749`
- program SHA-256:
  `46233269f4e4bab72a1008b5bbd3bc1c5734155531d22a1fd115db1dc05b82f7`
- manifest Slurm SHA-256:
  `fe55044a1ebe3d5ec957e360b7209c36520b54f55dd28472867a39d1361f3291`
- scheduler: `24979178`, `FAILED 1:0`, `pi_jss233/day`, one CPU,
  zero GPU, zero restarts
- node: `c1102u07n01`
- elapsed: seven seconds

The node was involved in an earlier V1 scheduler incident, but this failure is
fully explained by the deterministic runtime/hash mismatch and is not
attributed to node loss.

## Repair

Amendment A5 requires the exact Node.js 20.13.1/ICU/GCC/OpenSSL runtime used by
the endpoint campaign, asserts `process.version`, and computes the two
transitive dependency hashes in bytewise UTF-8 relative-path order. Runtime
trees bound by the historical freeze retain their original locale-order
algorithm.

The replacement uses a new exclusive execution root and reruns only the
zero-game manifest stage. No trace assignment, seed, horizon, measurement,
gate, or file budget changes.
