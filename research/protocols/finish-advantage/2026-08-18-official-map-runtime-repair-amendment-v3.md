# Official-map live compatibility runtime repair, amendment 3

Status: **prospectively frozen before replacement execution**

Recorded: 2026-08-18 UTC

## Failed launch and evidence boundary

Official-map array `22594030` planned 738 tasks and 1,476 short outcome-free
probes. After 157 tasks failed with one identical error, the remaining array and
dependent controller `22594031` were cancelled. Exactly 193 task roots had been
created, but the launch produced zero cell artifacts, zero private diagnostics,
zero completion markers, and zero nonempty stdout logs.

Every nonempty stderr log failed before map alias materialization and simulator
creation. The map attestor observed that the canonical game API resolved
`file-system-access` from the repository root while its static attestation import
still resolved a byte-identical driver-local pnpm copy. JavaScript class and
module interception are physical-path sensitive, so the attestor correctly
refused to claim that it had intercepted the implementation used by the engine.

Launch `22594030` is permanently inadmissible for map certification, policy
selection, or paper evidence. No task, map decision, or seed from that root is
reused.

## Canonical transitive runtime

The repaired environment has exactly one physical runtime for each identity-
sensitive dependency:

- `@chronodivide/game-api`;
- `@supalosa/chronodivide-bot` workspace package;
- `file-system-access`; and
- `fetch-blob`.

The driver's dependency links resolve to the canonical repository-root
packages. The original byte, version, implementation-tree, marker, and module-
resolution commitments in `mapLoadAttestation.ts` remain unchanged; this repair
does not loosen any accepted hash or path relationship.

## Replacement campaign

The replacement is campaign schema 2 with status
`FROZEN_OFFICIAL_MAP_LIVE_COMPATIBILITY_V2_RUNTIME_REPAIR`. It uses fresh engine
seed base `4,226,100,000` and a new exclusive evidence root. It retains exactly
the 41-family identity population, all nine countries, reciprocal slots, two
determinism replicates, 120-tick horizon, warning rule, V5 candidate, and 1,476
planned games.

The campaign binds both the original live-compatibility amendment 2 and this
repair amendment. No family is added, removed, substituted, or re-ranked.

## Mandatory preflight

Before the 738-task array is submitted, one Slurm job under account
`pi_jss233` must:

1. validate all game-API, file-system-access, fetch-blob, package-tree, marker,
   and transitive module-resolution commitments;
2. prove that the statically imported adapter and File implementation are the
   same physical modules reached from the exact game API;
3. instantiate exact Supalosa agents for all nine countries and prove the one
   physical `Bot` identity;
4. verify the replacement campaign, clean pushed `main`, source/runtime hashes,
   external baseline identity, map population commitments, and Slurm account;
5. write only an outcome-free immutable technical artifact and marker.

A failed preflight launches zero map probes. After a passing preflight, all 738
replacement tasks execute exactly once or the replacement fails closed. No
selective retry is permitted.

This amendment changes only runtime identity, preflight coverage, campaign
version, and seed block. It does not modify the candidate policy, external
Supalosa, map bytes, warning classification, outcome definition, or any
competitive claim.
