# Fresh dual-endpoint compressed-canary A2 audit

Date: 2026-09-03

Status: **PASS (technical, outcome-blind)**

The compressed-output repair required by amendment A2 completed across all four
prespecified canary configurations. All eight gzip traces were independently
stream-decompressed and validated, and every reference/dual pair matched at
the public-world, action, decompressed-stream, and gzip-byte levels. This is
the first valid technical authorization to prepare the complete competitive
stage.

## Immutable provenance

- A2 protocol commit: `9bcfe4c`
- Trace implementation commit: `80207ab`
- A2 execution commit: `f5317fb`
- A2 manifest SHA-256:
  `0aedc3165fcb9434ba9f7f2fe5865cd4e8dddfbd4010ad67230285f49a5715ee`
- A2 aggregate SHA-256:
  `e4796e2e8d1fec4038473dfa444bf9728b27a58d3fcdb3c187198cbba7ec4186`
- Parent world/action canary aggregate:
  `a4e9d38a91dfb9840e30041be52b83b65b564fd3d91ba06292346ad0b8107a52`
- Original policy/runtime freeze:
  `be47027c8526daa961500a1ca2acc3c04dd1a487460d4dec78361faa03ece649`
- Independent audit implementation: `76ab6b3`

The A2 manifest binds the amended protocol, runner, trace writer/verifier,
scheduler script, and parent aggregate. The policy-input validator separately
rechecks the original imported StrongBot and Supalosa trees, engine identity,
RA2Web Advanced bundle, endpoint definitions, selection, seed audit, 335
runtime assets, and all 15 maps.

## Scheduler reconciliation

- Paired array: `24731908`
- Fail-closed finalizer: `24731909`
- Account and partition: `pi_jss233`, CPU `day`
- Accounting records: five
- Workers: four, with two sequential technical games per worker
- State: every record `COMPLETED 0:0`
- Restarts: zero
- CPUs: one per record
- Accounted CPU time: 2,880 CPU-seconds

Exact raw task IDs and elapsed times are retained in
`2026-09-03-fresh-dual-compressed-canary-a2-audit/scheduler.csv`.

## Complete technical evidence

| Configuration | Map | Records/game | Plain bytes/game | Gzip bytes/game | World | Actions | Plain | Gzip |
|---|---|---:|---:|---:|---|---|---|---|
| deployed / Supalosa | HFO LE | 6,003 | 821,060 | 262,431 | exact | exact | exact | exact |
| strategy_both / Supalosa | Peak | 6,003 | 821,047 | 262,408 | exact | exact | exact | exact |
| deployed / RA2Web Advanced | HFO LE | 6,003 | 821,087 | 262,417 | exact | exact | exact | exact |
| external Supalosa / RA2Web Advanced | HFO LE | 6,003 | 821,088 | 262,419 | exact | exact | exact | exact |

Across the eight traces:

- 48,000 simulation updates completed;
- 48,008 normalized public-world observations were recorded;
- 48,024 compressed JSONL records were verified;
- 6,568,564 decompressed bytes and 2,099,350 gzip bytes were checked;
- all four reference/dual public-world hashes reproduced the parent gate;
- all four reference/dual public-action hashes, counts, method counts, and
  bounded corpse-target summaries reproduced the parent gate;
- all four decompressed trace hashes and gzip hashes matched exactly;
- every header, context, record index, update, newline, byte count, record
  count, and final technical summary passed;
- all requested maps, starts, slots, countries, seeds, policies, opponents, and
  runtime identities matched the manifests; and
- no quit request occurred, no resignation was forwarded, and no
  outcome-shaped field appeared at any depth.

Pair-level hashes and sizes are in
`2026-09-03-fresh-dual-compressed-canary-a2-audit/pairs.csv`. The complete
machine-readable result is
`2026-09-03-fresh-dual-compressed-canary-a2-audit/validation.json`.

## Interpretation and advancement boundary

This pass closes the compressed-output omission in the first canary stage. It
supports the narrow technical claim that the passive dual observer and its
streaming evidence path leave the recorded public world and policy actions
unchanged in all four prescribed 6,000-update configurations.

It remains outcome-blind. It says nothing about W/D/L, StrongBot superiority,
map generalization, or Advanced performance. It also does not prove equality
of inaccessible private engine state. The competitive study is now authorized
for implementation and launch preparation, but may not launch until its exact
2,700 assignments, new source/program hashes, streaming endpoint replay,
storage limits, Slurm accounting, and complete-cohort finalizer are themselves
implemented, tested, and frozen.
