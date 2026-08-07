# Research Status

Last reconciled: **2026-08-07**

## Bottom Line

The repository contains a credible research pipeline, but it does not yet
contain a paper result showing that StrongBot reliably beats the independently
loaded Supalosa baseline. The current positive hypothesis is that a learned or
selected generic StrongBot policy improves win probability while retaining
cross-map and worst-group robustness. That hypothesis still requires a frozen
policy interface, prospective splits, and sealed confirmatory games.

## Completed Gates

| Gate | Evidence | Interpretation |
| --- | --- | --- |
| Fresh-process seed replay | Job 21291720: 10/10 same-seed traces matched and the different seed diverged | Deterministic replay endpoint passed; all games were tick-cap draws, so this is not policy evidence |
| Original 127-family compatibility review | Jobs 21606315 and 21606800: 4 pass, 0 review, 7 fail in the 11-family stress set | The available engine assets do not support the full Temperate/Snow/Urban/Desert population |
| Temperate source-population screen | Job 21608050: 67/67 families, 134/134 sessions, 54 pass, 7 review, 6 fail | Outcome-free technical screen only |
| Independent Temperate confirmation | Job 21608882: identical normalized 54/7/6 family evidence, no retries | The compatibility classification reproduced exactly; still no policy outcome |
| Supported population freeze | Commit `be6be43`: exact 54-family intersection, exclusions, source hashes, and commitments | Outcome/role-blind candidate population fixed |
| Private family roles | Commit `c87c9d5`: 22 train, 12 development, 16 test, and 4 reserve families | Test identities remain outside training/development commands |
| Strict research runner | Commits `f3569f4`, `6dfbc9e`, `5db7f4c`, `74f868c`: policy gate, seeded runner, plans, and reducer | Historical parameter trainer is superseded for new evidence |
| End-to-end training smoke | Job 21655228: 2/2 launches accounted, no technical failures, 529 MiB peak RSS | Default policy lost both reciprocal training games; calibration only, not a paper result |

The two Temperate evidence trees are committed by SHA-256 values
`68e51b29b0d96f395d48142f8cdb4a89bab00ddec6d0ab4b235e266d2e8364e3`
and `c8b8e94da46e494258896f934608a53ac7f15e3be8bbc1c2cd92c7795c7f12f4`.
Both bundles are retained under
`/nfs/roberts/project/pi_jss233/zc362/chrono_divide/research-evidence/map-compatibility-temperate-v1/full`.

## What Is Admissible Now

- The deterministic endpoint and exact runtime/source provenance are suitable
  infrastructure evidence.
- The 67-family Temperate compatibility denominator and the reproduced 54/7/6
  classifications may be reported as outcome-free simulator screening.
- The exact intersection of the 54 pass families may be frozen prospectively
  as the candidate source population, with all 13 exclusions disclosed.

## What Is Not Yet Admissible

- Historical results under `benchmark-results/` do not establish a clean
  StrongBot-versus-Supalosa effect. Several used the modified local package as
  both candidate and baseline, tuned starts, incomplete provenance, or
  outcome-informed configuration work.
- A compatibility `pass` is not evidence that either bot plays well, that every
  start is valid, or that a match will terminate.
- No result currently supports “reliably wins over Supalosa,” a general gaming
  paradigm shift, or generalization beyond the supported Temperate subset.
- The frozen family roles exist, but no optimizer run or held-out method
  comparison has completed.

## Next Admissible Sequence

1. Execute the five frozen 936-launch training runs using the successive-
   halving protocol in `OPTIMIZER_PROTOCOL.md`.
2. Fit the global and coordinate-free descriptor-conditioned selectors from the
   same six-policy finalist data in each run.
3. Run the outcome-free development seed/start compatibility gate.
4. Run the fixed pre-confirmatory diagnostic allocation and apply its declared
   signal/variance rules once.
5. Freeze the method and power design, implement the separate sealed evaluator,
   and only then launch confirmatory policy evaluation.

Use [`RESULT_REGISTRY.tsv`](RESULT_REGISTRY.tsv) for job-level provenance,
[`SUPPORTED_SCOPE_DECISION.md`](SUPPORTED_SCOPE_DECISION.md) for the population
decision, and [`METHOD_INTERFACE_GATE.md`](METHOD_INTERFACE_GATE.md) for the
runner contract.
