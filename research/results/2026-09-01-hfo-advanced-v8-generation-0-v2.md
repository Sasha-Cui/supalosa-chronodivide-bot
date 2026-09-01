# HFO Advanced V8 Generation 0 V2

## Status

`PASS_HFO_ADVANCED_V8_GENERATION_0` means that the frozen first search
generation completed and advanced exactly the prespecified number of hashes.
It is a procedural pass, **not** evidence that the synthesized policies are
strong. The complete result is strongly negative at this generation.

No cell or partial aggregate was inspected. This document was written only
after all 1,836 cells and the fail-closed finalizer completed with exit `0:0`.

## Immutable identity

- Array job: `24384202`, exactly 1,836 unique tasks on `pi_jss233`.
- Afterok finalizer: `24384203`, completed `0:0`.
- Source commit: `7c97c9f1a0d5e0a6d314ce9d8f534adcfd3435a0`.
- Cell/finalizer program SHA-256:
  `47ac9d56bebd7871d41a861a3aed52a15495ae909126b69031095adc13a80c0b`.
- Protocol SHA-256:
  `186ede4a712c68d2c0324dc350de4de8428f3b52cb55d344224b50934c447f88`.
- Selection SHA-256:
  `9730745e171ecc73531369ddfd8308700eec44a7586491852713806fb097f713`.
- Asset-manifest SHA-256:
  `d942117f24363818977d573dbc87006a9b320c6861bddf939d5fc80db2217e67`.
- Pinned Supalosa commit: `165b77a71d0cf5ebd27c65b19d0486bcbae78d0f`.
- Pinned RA2Web client commit: `218fb800614295119e25040986b175fee4c3670f`.
- Advanced bundle SHA-256:
  `81d8797b6dd1371ba2dcbd79e25df8b42254290c820159e121a82650fd97a143`.
- Aggregate SHA-256:
  `f3eb995c15d2f947bad6afcc1c24653aa18391e40c2026661cc4fd25eafa5a0f`.

The aggregate contains exactly 1,836 scheduler task IDs, all 34 arms and 18
cases in each of three runs, and no forwarded candidate or opponent
resignation. Its source, program, protocol, runtime, selection, baseline, and
opponent identities match the frozen inputs.

## Complete Generation-0 evidence

Across the 96 synthesized policy arms (1,728 games), the result was only
`1W/28D/1699L`. No policy won more than one of its 18 games. Only one policy
had a positive paired point difference versus its same-case deployed control,
and no policy had a positive one-sided 90% paired lower bound.

The controls across the three disjoint 18-case run populations were:

| Control | W/D/L | Score observations |
|---|---:|---|
| Deployed StrongBot | 12/2/40 | 4 wins in every run; score rates 0.25, 0.25, and 0.2222 |
| Pinned external Supalosa | 0/0/54 | Lost every west-start case to Advanced |

The best ranked survivors were:

| Run | Rank-0 hash prefix | W/D/L | Paired mean | One-sided 90% lower |
|---:|---|---:|---:|---:|
| 0 | `0a75a213a073` | 0/4/14 | -0.1389 | -0.2570 |
| 1 | `72510bf9d739` | 0/1/17 | -0.2222 | -0.3454 |
| 2 | `242068698b81` | 0/6/12 | -0.0556 | -0.2163 |

Run 2 also contained `6dd36c1c7dbf`, the only policy with a literal win:
`1W/7D/10L`, paired mean `+0.0278`, one-sided 90% lower `-0.0727`, and median
win time 38,734 updates. It ranked second because its minimum faction/slot
score was zero, below the rank-0 policy's 0.1111. This is the frozen
lexicographic ranking, not a post-hoc choice.

## Advancement

The protocol does not impose a performance gate at Generation 0. It retains
the top eight per run, then deterministically produces Generation 1 as four
elites, eight one-edit mutations, and four crossovers. The finalizer produced
exactly 16 policies per run and all 48 hashes are globally unique.

Generation 1 therefore proceeds unchanged on its 36 fresh cases per run, but
the prior probability of reaching the final Advanced gate is now low. The
search is allowed to test whether local mutation/crossover can recover from
the weak initial population; this result does not support any claim of
improvement over deployed StrongBot or of reliably beating Advanced.

Generation 2, championship, replication, routing, and every multi-map claim
remain sealed behind their original gates.
