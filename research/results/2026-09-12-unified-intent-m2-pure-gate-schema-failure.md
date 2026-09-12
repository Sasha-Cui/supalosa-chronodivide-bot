# Unified intent M2 pure-gate schema failure

Date: 2026-09-12

Status: **preserved pregame technical failure**

Current-source pure-gate job `26049202` ran from clean synchronized commit
`f26d300` on `pi_jss233/day`, one CPU, with zero restarts. It completed the
build and focused tests, then exited `1:0` after 17 seconds while constructing
the outcome-blind pure artifact.

The failure was caused by an artifact-schema collision. The pure runner stored
test descriptors as an object keyed by each test path. Adding
`src/test/literalBuildingEliminationEndpoint.test.ts` made the key itself match
the recursive prohibited-field expression for `endpoint`. The check therefore
rejected trusted test provenance even though the path was metadata and no
competitive value was present.

Evidence:

- job: `26049202`
- state/exit: `FAILED`, `1:0`
- account/partition: `pi_jss233/day`
- CPUs/restarts: `1` / `0`
- stdout: empty
- stderr: preserved at
  `research-evidence/unified-intent-arbiter-v1/gate-3/pure-26049202.stderr.log`
- requested output directory: absent
- pure artifact: absent
- M2 manifest, smoke, case, and outcome: none

The prospective repair changes only the provenance container from a
path-keyed object to an array of descriptors with explicit `relativePath`,
`sha256`, and `bytes` fields. The prohibited-field recursion still checks every
schema key and the file paths and bytes remain bound exactly. Test selection,
test counts, source, method, data, seeds, runtime, opponents, maps, outcomes,
and all M2 gates are unchanged.

The replacement pure gate must use a new output root and job ID. No M2
initialization may occur until it passes.
