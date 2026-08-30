# Deterministic annotated game-frame protocol V1 amendment 1

Status: **prospectively frozen after schema audit and before case selection or
rendering**

## Reason for the amendment

The immutable Peak replication cells contain normalized trajectory SHA-256
values. The earlier HFO deployed-confirmation cells do not: their frozen schema
records the complete literal endpoint, terminal inventories, scheduler and
runtime provenance, but predates trajectory capture.

This incompatibility was discovered while implementing the already frozen
passive renderer, before executing the deterministic selector, replaying a
registered case, or viewing any campaign-derived frame. The category
populations, hash-based selection rules, frame times, annotations, and
no-replacement rule remain unchanged.

## HFO replay acceptance

For HFO categories 2--4 only, replace the unavailable comparison to an original
trajectory hash with all of the following fail-closed requirements:

1. the selected replay matches the immutable cell's winner, literal status,
   terminal update, building counts, terminal inventory, seed, country, start,
   slot, map, opponent, and resignation audit exactly;
2. a renderer-disabled replay and an independently initialized renderer-enabled
   replay have identical normalized 60-update trajectory hashes and identical
   endpoint fields;
3. the renderer-enabled run produces the same policy action/production audit as
   the disabled run;
4. the current replay source differs from confirmed source
   `f8d5a9961a6e1dd2746cd5c03b6b0793ba73ba02` within
   `packages/chronodivide-bot/src` only through Peak-of-Perfection-gated
   scope support, with no HFO-path change; record the exact Git diff SHA-256;
5. runtime, asset-manifest, map, and pinned Supalosa identities equal the
   immutable HFO evidence; and
6. any mismatch omits the category without retry or replacement.

This establishes deterministic noninterference and exact endpoint reproduction
without inventing an original hash that the campaign did not record.

## Unchanged Peak rule

Peak category 1 still requires both replay trajectory hashes to equal their
respective immutable cell hashes, in addition to renderer-disabled/enabled
equivalence. No Peak acceptance criterion changes.

## Cross-opponent panel

The optional RA2Web Advanced panel is omitted from V1 frame capture because its
earlier cell schema also lacks a normalized trajectory hash and exact replay
requires the separately frozen opponent bundle. It may be added only under a
future prospectively frozen protocol; no substitute limitation case is allowed.

## Scientific boundary

This amendment changes only technical replay verification for an older
immutable schema. It does not alter the quantitative results, select a
different case, use outcome information beyond the registered category
predicate, or weaken any competitive claim.
