# Outcome-blind timestamped action-burst diagnostic V1 amendment A3

Frozen: 2026-09-05, after the A2 seed audit passed and before manifest
generation or any game initialization

Parents:

- `2026-09-05-outcome-blind-action-burst-diagnostic-v1.md`;
- Amendments A1 and A2.

Failure record:

`../../results/2026-09-05-action-burst-v1-duplicate-seed-preimplementation-failure.md`

## Reason

The parent text requires the 25 duplicate traces to be byte-identical
same-seed determinism checks, but its within-block formula added
`replicateOrdinal` to the engine seed. That would change the random stream.
The inconsistency was identified before any trace or manifest existed.

## Corrected seed derivation

Let (B) be the lower bound selected by the passed A2 audit. Replace the
within-block seed formula with:

[
mathrm{seed} = mathrm{blockBase}
+ 100,mathrm{countryOrdinal}
+ 10,mathrm{candidateStartOrdinal}.
]

Do not add an execution-replicate ordinal to the engine seed.

Every base trace has `executionReplicateOrdinal=0`. Each of the 25
deterministic duplicates has `executionReplicateOrdinal=1` and repeats the
exact opponent, map, country, candidate start, opponent start, participant
slot, settings, policy runtimes, and requested engine seed of its paired base
trace.

## Frozen multiplicity

The complete 1,717-trace manifest must have:

- 846 distinct requested engine seeds;
- 821 seed values used by exactly two reciprocal-slot base traces;
- 25 seed values used by exactly three traces: two reciprocal-slot bases plus
  the prescribed same-slot deterministic duplicate; and
- no other multiplicity.

The assignment tuple including `executionReplicateOrdinal` remains unique.
The seed is intentionally not unique across reciprocal slots or deterministic
duplicates.

## Unchanged requirements

The passed A2 reservation and selected interval remain authoritative. All
maps, opponents, countries, starts, slots, opponent-start assignments,
duplicate identities, trace count, horizon, action boundary, prohibited
fields, temporal summaries, reserve rule, gates, storage, and Slurm resources
remain unchanged.
