# Fixed-policy championship protocol (method v2)

Status: **frozen before method-v2 gameplay; outcome-blind for every v2
development and sealed-test family**.

This protocol replaces, rather than rescues, the failed map-conditioned method
v1. Method v1 remains preserved and reportable as a negative development result.
No method-v1 development family may be used to tune or validate method v2, and
no sealed-test identity or outcome may be accessed while method v2 is developed.

## Motivation fixed before v2 outcomes

The scheduled method-v1 development analysis estimated a family-macro
conditioned-minus-global score difference of -0.025 and did not authorize
confirmatory evaluation. A training-only leave-one-family-out audit also found
no reliable gain from the three-feature response-surface selector: its estimated
gain was approximately zero or negative over the frozen ridge and switch-margin
grid, even though its in-sample switched assignments appeared favorable.

Method v2 therefore removes map-conditioned selection. It addresses a different,
training-only weakness: optimizer runs used different engine seeds, so their
finalists were never compared in one common-seed tournament by the actual game
score endpoint.

## Frozen candidate population

The candidate population is the union of the six finalized policies from each
of optimizer runs 0 through 4 under optimizer source commit
`bbe7616fddcff970ab2767ad1212fd4faed06c9e`. It must contain exactly 30 unique
canonical policy hashes. Candidate policies cannot be added, removed, mutated,
or regenerated after championship outcomes exist.

The five immutable optimizer artifact commitments are:

| Run | Artifact filename | SHA-256 |
| --- | --- | --- |
| 0 | `run-0-optimizer-artifact.json` | `4981febcb99503564a6850f47c161fecd1f9a6159defae881f13e0744f1dae28` |
| 1 | `run-1-optimizer-artifact.json` | `4d7fd4baba96cf579ae3193baa83f08f87b39d8e8d6fddb82e38c253ed9533f4` |
| 2 | `run-2-optimizer-artifact.json` | `1e24851265f30cf5df05da821d99203a4b41434468a76e590a59f16d58163908` |
| 3 | `run-3-optimizer-artifact.json` | `666570957161e4382d31fe617996bf2fdf675b13ddeab62a2089b11d9b5a4f41` |
| 4 | `run-4-optimizer-artifact.json` | `b82d6c3423ed99b94c1fb2be2514ad98624f916463c49f3d8d5ae01f0d79b896` |

All championship games use only the 22 frozen training families, the independently
loaded Supalosa baseline, Iraq for both participants, reciprocal candidate slots,
the 18,000-tick cap, deterministic bot randomness, and Slurm account `pi_jss233`.

## Common-seed championship

The endpoint is candidate score: win = 1, completed/tick-cap draw = 0.5, and loss
= 0. Terminal material is diagnostic only and cannot affect selection.

The engine-seed base is exactly `40,000,000`. Stage A uses seed-block indexes
`0..21`, one per family in ascending family-ID order. Stage B uses indexes
`1,000..1,065`, three per family in the same family order. The candidate and
baseline receive participant-specific deterministic bot seeds derived from the
shared engine seed. These namespaces are disjoint from optimizer v1 and
development v1.

### Stage A

- Evaluate all 30 policies on all 22 training families.
- Use one new engine-seed block shared by every policy within each family.
- Run both reciprocal candidate slots.
- Use 22 shards, one per family and 60 games per shard.
- Total launched component games: 30 x 22 x 1 x 2 = 1,320.
- Advance exactly six policies.

### Stage B

- Evaluate the six stage-A survivors on the same 22 training families.
- Use three new shared engine-seed blocks disjoint from stage A and all earlier
  optimizer or development seeds.
- Run both reciprocal candidate slots.
- Use 22 shards, one per family and 36 games per shard.
- Total launched component games: 6 x 22 x 3 x 2 = 792.

### Frozen ranking

For each policy and family, average score over every scheduled championship
seed and reciprocal start. Rank policies lexicographically by:

1. equally family-weighted mean score, descending;
2. discrete lower-20% family CVaR, descending, defined as the mean of the
   `ceil(0.20 * family_count)` lowest family scores;
3. worst-family score, descending; and
4. canonical policy SHA-256, ascending.

Stage A ranks from its one seed block. Final ranking pools stage A and B, giving
four equal seed blocks per family. The top final policy is the single fixed
method-v2 champion. There is no best-development-map, best-run, or subgroup
selection after this point.

Each stage is indivisible evidence. The reducer must reconcile every plan,
launch event, completion event, policy/family/seed/slot identity, source and
runtime commitment, authoritative scheduler account, and exact game count.
Stage B cannot be generated until all 1,320 stage-A games pass. The champion
cannot be finalized until all 792 stage-B games pass and the pooled 2,112-game
schedule is complete.

There is no in-run game retry. An exact shard may be resubmitted at most twice
only when the failed attempt is proven to have ended before its first
`launch_counted` event, such as a scheduler-wrapper failure. Any technical
failure after a game launch permanently fails that campaign rather than
selectively rerunning or replacing outcome-bearing games. All attempts, Slurm
job IDs, logs, and output directories remain in the evidence ledger.

## Fresh development pool

The v2 development pool is constructed before championship outcomes are read:

- all four original reserve families, which have no prior gameplay outcomes;
- the seven outcome-free TEMPERATE fidelity-screen families whose only prior
  disposition was `review`, never `fail`; and
- no method-v1 development family, training family, or sealed-test family.

The seven reviewed families may enter the pool only after a committed technical
adjudication confirms that their warning categories are nonfatal for game
creation, reciprocal starts, required resources, and deterministic execution.
A committed SHA-256 rank selects ten primaries and one ordered substitute.
More than one incompatible primary family stops v2 development.

## Development compatibility and signal screen

After an outcome-blind repeatability/compatibility gate, compare exactly two
fixed methods on the ten primary families:

- the method-v2 championship policy; and
- the frozen default StrongBot policy.

Use eight new engine-seed blocks and reciprocal starts for both methods. The
primary estimand is the equally family-weighted champion-minus-default score
difference. A supporting estimand is champion score minus 0.5 against Supalosa.
Both use reciprocal-start-averaged blocks and a finite-family cluster sandwich
with Student-t critical values and nine degrees of freedom.

Proceed only if every technical gate passes and both one-sided 80% lower bounds
are above zero. This is one scheduled development unblinding and a permissive
futility screen, not confirmatory evidence. Failure retires method v2; it cannot
be rescued by a subgroup, point-estimate threshold, additional seed, or another
unblinding on the same families.

## Confirmatory boundary

Sealed-test identities remain unopened unless the v2 development screen passes.
Before opening them, freeze the exact champion, source/runtime commitments,
analysis implementation, eight new seed blocks, and attempt budget.

The planned confirmatory comparison uses all 16 currently sealed test families,
the champion and default methods, eight reciprocal-start seed blocks, and 512
component games. Success requires:

- the two-sided family-clustered 95% interval for champion-minus-default score
  to lie entirely above zero; and
- the one-sided family-clustered 95% lower bound for champion score against
  Supalosa to exceed 0.5.

All results are reported regardless of direction once any sealed-test outcome is
opened. A fixed Supalosa opponent supports claims about this opponent and runtime,
not an unrestricted population of RTS agents.
