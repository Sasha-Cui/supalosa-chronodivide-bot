# Action-burst V1 duplicate-seed preimplementation failure

Date: 2026-09-05

## Disposition

A deterministic-repeat inconsistency was found by source-design review after
the seed-range audit passed and before manifest generation or game
initialization.

The parent protocol called 25 traces exact deterministic duplicates but also
added `replicateOrdinal` to their engine seed. The paired runs would therefore
have different random seeds and could not provide an exact same-seed
determinism test.

No manifest, trace, update, action event, or competitive outcome was produced.

## Scope

The selected collision-free interval remains valid. The defect affects only
the within-block seed formula and duplicate metadata. It does not change the
maps, opponents, countries, starts, slots, 1,717-trace count, 3,600-update
horizon, instrumentation, summaries, reserve rule, gates, storage, or Slurm
resources.

## Repair

Amendment A3 distinguishes execution replication from seed identity. Each
duplicate reuses its base trace's exact engine seed and carries a separate
execution-replicate ordinal. Reciprocal slots continue to share seeds by
design.

The manifest must contain 846 distinct engine seeds: 821 occur in two
reciprocal-slot base traces and 25 occur in those two base traces plus one
same-slot deterministic duplicate. Any other multiplicity fails closed.
