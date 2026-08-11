# Method-v2 fresh-development protocol

Status: **frozen before any method-v2 development gameplay**.

This protocol begins only after the common-seed championship has finalized one
fixed training-only policy. It does not reopen method-v1 development evidence,
does not authorize sealed-test access, and cannot turn the championship result
itself into a held-out claim.

## Frozen method pair

The two methods are:

- `champion`: the exact policy in `method-v2-champion.json`, whose artifact
  SHA-256 is
  `40a53c142fa30725ea5d22032d4b6dfcda4f358e15e1b8d36ac6a102b76e9ee1`;
- `default`: the canonical `DEFAULT_RESEARCH_POLICY` compiled by the same clean
  source revision used to generate the development campaign.

The champion policy ID is
`ab0071009cbd5f1fc9e2f1a76a562455a0ebeacf77dac1cd9c13b9fc6374203f`.
The two policies must be distinct. Both play Iraq against the same independently
loaded Supalosa baseline, with an 18,000-tick cap, deterministic participant
randomness, reciprocal candidate slots, and no outcome shaping.

## Fresh family pool

The private pool contains exactly eleven outcome-free families:

- the four original reserve families; and
- all seven families with disposition `review` in the complete TEMPERATE
  fidelity screen, Slurm job `21608882`.

The review families are admissible only because the frozen technical
adjudicator verifies all of the following without policy outcomes:

- both forward and reverse probes loaded and reached tick 250;
- all observed starts were declared, distinct, and physically reciprocal;
- there was no error, failure category, warning truncation, or missing progress;
- warnings were limited to `invalid_object`, `invalid_terrain`, and
  `other_warning`; and
- the gate used account `pi_jss233` and exact committed representative hashes.

The adjudicator also reads every original private role manifest in-process to
prove that the seven review families overlap no original role. It never emits
sealed-test identities. It proves that all 54 original-role families were
fidelity `pass`, while the new review set was outside that population.

Rank the eleven families by ascending
`SHA-256("chrono-divide-method-v2-development-v1\0" + family_id)`. The first ten
are primaries and the last is the sole ordered substitute. This assignment is
committed before development gameplay. Method-v1 development and training
families are ineligible.

## Frozen schedule

The engine-seed base is exactly `50,000,000`. Every shard is one complete
four-game block: two methods by two reciprocal candidate slots.

| Phase | Purpose | Allocation | Launches | Outcome access |
| --- | --- | ---: | ---: | --- |
| 1 | Fresh-process determinism and manifest QC | 4 hash-ranked primaries x 1 seed x 2 process repeats x 4 games | 32 | Sealed |
| 2 | Full-pool compatibility | 11 families x 2 new seeds x 4 games | 88 | Sealed |
| 3 | Development signal | 10 active primaries x 8 new seeds x 4 games | 320 | One scheduled unblinding |
| **Total** |  |  | **440** |  |

Seed-block indexes are fixed as follows:

- phase 1: `100 + primary_rank` for the four selected primaries;
- phase 2: `1,000 + 2 * pool_rank + seed_ordinal`; and
- phase 3: `2,000 + 8 * active_family_rank + seed_ordinal`.

Here, ranks are zero-based in the committed private role order. Phase 1 uses
the four primaries with the smallest independent
`SHA-256("chrono-divide-method-v2-phase1-v1\0" + family_id)` values. Phase 3
uses all ten primaries unless phase 2 finds exactly one primary technically
incompatible, in which case that family is replaced by the sole substitute.

## Technical gates and failure policy

Every phase must reconcile plan bytes, source/runtime commitments, private-role
commitments, map hashes, requested and participant seeds, method/policy labels,
reciprocal slots, launch events, completion events, sealed summaries, exact job
IDs, and authoritative account `pi_jss233`.

Phase 1 additionally requires byte-identical normalized results across its two
fresh-process repeats after removing only episode ID and wall-clock duration.
Phase 2 may authorize phase 3 only after evaluating technical fields without
reading winner or score fields. The substitute can replace exactly one primary
only for a prespecified technical incompatibility. More than one incompatible
primary, an incompatible needed substitute, a method imbalance, or any
unclassified failure stops method v2.

There is no in-run retry. A shard may be resubmitted at most twice only when
the failed attempt is proven to have ended before its first `launch_counted`
event. Any technical failure after a launch permanently fails that campaign;
outcome-bearing games are never selectively rerun or replaced. All attempts,
logs, job IDs, and outputs remain preserved.

## Single development analysis

For family (f), seed block (b), and reciprocal slot (s), define

$$
d_{fbs}=Y_{\mathrm{champion},fbs}-Y_{\mathrm{default},fbs},
\qquad
D_{fb}=\frac{d_{fb0}+d_{fb1}}{2},
$$

where a candidate win, draw, and loss score 1, 0.5, and 0. The family and
equally family-weighted estimates are

$$
\delta_f=\frac{1}{8}\sum_{b=1}^{8}D_{fb},
\qquad
\Delta=\frac{1}{10}\sum_{f=1}^{10}\delta_f.
$$

Let (e_{fb}=D_{fb}-\Delta), (N=80), and (G=10). The frozen family-cluster
sandwich variance is

$$
\widehat V_\Delta=
\frac{G}{G-1}\frac{\sum_f(\sum_b e_{fb})^2}{N^2}.
$$

For the champion's absolute score, let (C_{fb}) be its reciprocal-start mean,

$$
\mu=\frac{1}{10}\sum_f\frac{1}{8}\sum_b C_{fb},
$$

and use the identical family-cluster formula on residuals (C_{fb}-\mu).
The one-sided 80% lower bounds use Student's (t) with nine degrees of freedom
and critical value `0.883403859685`.

The development gate passes only if both variances are finite and positive and

$$
\Delta-0.883403859685\sqrt{\widehat V_\Delta}>0
$$

and

$$
(\mu-0.5)-0.883403859685\sqrt{\widehat V_\mu}>0.
$$

The unblinder runs exactly once after the phase-3 technical gate and writes the
primary results and prespecified diagnostics in one immutable artifact. A
failure retires method v2. There is no extra seed, subgroup rescue, map removal,
alternative variance estimator, or second development unblinding.

## Confirmatory boundary

A passing development gate is a permissive futility screen, not a paper claim.
Before any sealed-test identity is opened, freeze the champion, default,
analysis implementation, source/runtime commitments, eight new test seed
blocks, and exact attempt budget. Confirmatory evaluation remains governed by
`research/METHOD_V2_PROTOCOL.md` and must report every result once opened.
