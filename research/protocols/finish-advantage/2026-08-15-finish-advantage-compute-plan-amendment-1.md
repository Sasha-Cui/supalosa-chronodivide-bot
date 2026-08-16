# Finish-advantage empirical compute plan, amendment 1

Status: **prospective resource update after outcome-blind family adjudication**

Recorded: 2026-08-15 UTC, before V5 confirmatory unblinding

This amendment updates only the candidate-family count and corresponding
sealed-confirmation resource estimate in
`2026-08-15-finish-advantage-compute-plan-v1.md`. It does not authorize a
competitive launch or alter the state audit, causal screen, estimand, or
advancement rule.

## Adjudicated reserve

The initial 63 catalog rows contained five aliases of the consumed `mf_heck`
family and twelve within-population mode variants. The prospectively
adjudicated reserve therefore contains 46 provisionally independent families.
Excluded variants cannot be reintroduced to enlarge the nominal sample.

The exact private 46-family population commitment is:

`74152ae93b2d1a9c49a30ef78d36c8129a4a0a9647881b8d02720ffd5b4cca5f`

It remains ineligible for confirmation until historical-use refresh,
high-similarity identity review, full two-bot compatibility, live fidelity,
and source-rights metadata gates finish.

## Revised confirmation scale

With all nine countries and reciprocal candidate slots:

| Frozen arms | Formula | Games at `K=46` | Summed episode hours at 124.3 s/game |
|---|---:|---:|---:|
| External Supalosa, V5, final candidate | `54K` | 2,484 | 85.8 h |
| External Supalosa, V5, final candidate, prespecified ablation | `72K` | 3,312 | 114.4 h |

At 40 concurrent one-CPU shards, idealized simulation time is approximately
2.2 or 2.9 hours respectively. Reserve 4--8 wall-hours for queueing, startup,
large-map tails, finalization, and filesystem overhead. Expected preserved JSON
and logs are approximately 125--205 MiB before optional replays or screenshots.

Three arms are the default confirmation design because they directly establish
the final policy against exact Supalosa and against the frozen V5 predecessor;
mechanism ablations belong in the complete open causal screen. A fourth sealed
arm is justified only if it is frozen before launch and materially resolves a
claim that the open screen cannot support.

No GPU is required. Every simulator job remains restricted to Slurm account
`pi_jss233`.
