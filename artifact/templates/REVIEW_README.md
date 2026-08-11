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

Expected output is a 17-page `paper/build/main.pdf`, a five-page
`paper/build/supplement.pdf`, and a 10-page A4
`paper_scitepress/build/main.pdf`. The LNCS non-reference main-paper content
ends on page 14. PDF byte hashes may vary across TeX distributions; the package
manifest and committed generated-fragment hashes are the portable
reproducibility checks.

## Scope

The artifact supports the reported aggregate study only. It does not establish
that StrongBot reliably beats Supalosa, and it does not support claims about
other opponents, factions, theaters, simulators, RTS games, ladder play, or
humans. See `THIRD_PARTY.md` for omitted software and assets.
