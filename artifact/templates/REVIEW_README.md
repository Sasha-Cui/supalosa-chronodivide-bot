# Chrono Divide scripted-agent configuration: anonymous review artifact

This artifact regenerates every numeric macro, table, and figure fragment used
by the accompanying anonymous manuscript. It contains aggregate evidence only;
it cannot launch Chrono Divide games or retrain the bot.

## Contents

- `paper/`: anonymous LNCS paper and supplement source, bibliography,
  deterministic generator, generated fragments, and unit tests. This is the
  secondary SCAG submission format.
- `paper_scitepress/`: the exact anonymous SCITEPRESS/ICAART candidate source,
  official vendored template files, generated fragments, build checks, and
  format-specific unit tests.
- `research/artifacts/`: eight sanitized frozen JSON inputs used by the paper.
- `artifact_hashes.json`: SHA-256 allowlist for those sanitized inputs.
- `MANIFEST.json`: SHA-256 inventory of every other immutable file in this
  package.
- `verify_manifest.py`: self-contained verifier for `MANIFEST.json`.
- `THIRD_PARTY.md`: precise inclusion, exclusion, and licensing boundary.

The scheduler account and project source commit fields are replaced with
`REDACTED_FOR_DOUBLE_BLIND`. Scientific values, family IDs, job IDs, evidence
commitments, design counts, estimates, confidence intervals, and descriptive
records are unchanged.

## Claim-to-evidence map

The package manifest establishes file integrity; the records below establish
the manuscript values. This map is the fastest path from a reviewer question
to the frozen aggregate that answers it. Field names are listed so a reviewer
can inspect the JSON directly without reverse-engineering the generator.

| Manuscript question | Frozen record | Primary fields |
| --- | --- | --- |
| Which map population was eligible, and how were family-disjoint roles committed? | `research/artifacts/supported_temperate_families_v1.json` and `research/artifacts/family_role_commitments_v1.json` | `targetCount`, `finalSplit`, `roleCounts`, `roleCommitments`, `outcomeBlind` |
| What are the two prespecified confirmatory results and their decision boundaries? | `research/artifacts/method_v2_confirmatory_result_v1.json` | `design`, `prespecifiedImprovement`, `prespecifiedChampionAbsolute`, `claimBoundary` |
| Is the relative result spread across held-out families rather than driven by one family? | `research/artifacts/method_v2_confirmatory_family_diagnostics_v1.json` | `families`, `aggregateChecks` |
| Does the common-seed championship outperform run-local selection on the open diagnostic pool? | `research/artifacts/method_v2_mechanism_ablation_result_v1.json` | `mechanismContrast`, `pairwiseChampionMinusLocal`, `claimBoundary` |
| Which policy-group reverts change the endpoint, and which intervals cross zero? | `research/artifacts/method_v2_component_ablation_result_v1.json` | `primaryComponentContrast`, `pairwiseChampionMinusAblation`, `claimBoundary` |
| What terminal-state patterns accompany the score changes, and what is not identified causally? | `research/artifacts/method_v2_terminal_state_analysis_v1.json` | `confirmatory`, `component`, `interpretationBoundary` |
| Do accepted games, allocations, exclusions, and stage totals reconcile? | `research/artifacts/accepted_compute_accounting_v1.json` | `accounting`, `stageBreakdown`, `checks`, `exclusions` |

The confirmatory result record is the authority for RQ1 and RQ2. The family,
mechanism, component, and terminal-state records are sensitivity or
post-confirmatory diagnostics; they cannot rescue the failed absolute-strength
gate. All eight records are hash-pinned by `artifact_hashes.json`, and the
generator fails rather than silently accepting a changed value.

## Verify and reproduce the manuscript assets

Python 3.10 or newer is sufficient for asset generation and tests:

```bash
python3 verify_manifest.py
python3 paper/scripts/generate_assets.py
python3 -m unittest \
  paper.tests.test_generate_assets \
  paper_scitepress.tests.test_fallback_manuscript -v
python3 verify_manifest.py
```

The commands must leave the hashes in `paper/generated/asset_manifest.json`
unchanged. To compile the PDFs, use a TeX Live distribution with Springer
`llncs`, TikZ/PGFPlots, and BibTeX. Build both submission formats:

```bash
make -C paper main supplement
make -C paper_scitepress check
```

Expected output is an 18-page `paper/build/main.pdf`, a five-page
`paper/build/supplement.pdf`, and an 11-page A4
`paper_scitepress/build/main.pdf`. The LNCS non-reference main-paper content
ends on page 15. PDF byte hashes may vary across TeX distributions; the package
manifest and committed generated-fragment hashes are the portable
reproducibility checks.

## Scope

The artifact supports the reported aggregate study only. It does not establish
that StrongBot reliably beats Supalosa, and it does not support claims about
other opponents, factions, theaters, simulators, RTS games, ladder play, or
humans. See `THIRD_PARTY.md` for omitted software and assets.
