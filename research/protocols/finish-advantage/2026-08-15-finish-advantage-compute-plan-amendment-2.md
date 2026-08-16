# Finish-advantage empirical compute plan, amendment 2

Status: **prospective resource correction after binding historical-use review**

Recorded: 2026-08-15 UTC, before V5 confirmatory unblinding

This amendment supersedes only the candidate-family count and associated
resource estimate in
`2026-08-15-finish-advantage-compute-plan-amendment-1.md`. It does not alter an
estimand, policy, seed, state audit, causal screen, or advancement rule, and it
does not authorize a competitive launch.

## Binding correction

The 46-family adjudicated population included 28 families that had previously
appeared in a private capacity dry run whose own frozen record marked them
`finalReuseProhibited`. That prohibition is binding even though the dry run was
outcome blind. Those families cannot be recovered by relabeling or by choosing
different map-file aliases.

The remaining provisional reserve contains 18 families. Its private manifest
SHA-256 is:

`ba49296b094f2c2373652ef9a527bd55a5899994c67e6e408316fd09c8b34b79`

Its population commitment is:

`a68c7e6d333b41d9ff2a63569193568434fb097310913cb338e07ddd0a38b4c5`

The public commitment records 13 snow, three temperate, and two urban family
members. This imbalance and the small cluster count weaken heterogeneity and
cluster-uncertainty claims. The 18 families remain provisional until full
identity, compatibility, live-fidelity, historical-use, and release-rights
gates pass.

## Corrected minimum confirmation scale

With all nine countries and reciprocal candidate slots:

| Frozen arms | Formula | Games at `K=18` | Summed episode hours at 124.3 s/game |
|---|---:|---:|---:|
| External Supalosa, V5, final candidate | `54K` | 972 | 33.6 h |
| External Supalosa, V5, final candidate, prespecified ablation | `72K` | 1,296 | 44.7 h |

At 40 concurrent one-CPU shards, idealized simulation time is approximately
0.84 or 1.12 hours. Reserve 2--5 wall-hours for queueing, startup, large-map
tails, finalization, and filesystem overhead. No GPU is required; all
simulation remains restricted to Slurm account `pi_jss233`.

## Expansion requirement

Before freezing the final confirmation, perform an outcome-blind search for
additional legally public, technically compatible map families. The source
population, eligibility rules, identity exclusions, deterministic selection,
and public commitment must be frozen before any policy outcome is generated on
those maps. No family previously used for policy outcomes or covered by a
binding reuse prohibition may enter the reserve.

If no defensible expansion exists, the final design may use all 18 retained
families but must present the resulting precision and theater coverage
candidly. A nominally larger sample obtained through aliases, mode variants,
or prohibited reuse is not acceptable.
