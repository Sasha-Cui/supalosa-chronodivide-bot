# Unified intent arbiter V1 Gate 2 amendment A7

Frozen: 2026-09-09, after job 25684187 failed and before repair.

Parents: Gate 2 and Amendments A1–A6.

Failure record:

research/results/2026-09-09-unified-intent-gate2-manifest-runtime-schema-failure.md

## Failure and repair

Job 25684187 failed before simulator initialization because the runner used
the wrong field names for pinned runtime-freeze asset entries.

The replacement must:

- require exactly frozen.assets.count entries;
- require each entry to have only string name and 64-hex sha256;
- join entry.name to frozen.assets.root;
- require each joined path to be a regular file;
- rehash every asset and match entry.sha256;
- bind this amendment in manifest, trace, and finalizer stages; and
- use fresh root execution-v1-wrapper-a1-runtime-a1.

## Unchanged requirements

Seed/certificate identity, maps, starts, countries, slots, 180 pairs, 360
tasks, arms, zero-update selection, 3,600-update trace, action/snapshot schema,
exact pair gate, no-outcome boundary, resources, file budget, and advancement
rules are unchanged.
