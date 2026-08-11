# Chrono Divide scripted-agent configuration: anonymous artifact

This artifact regenerates every numeric macro, table, and figure fragment used
by the accompanying anonymous manuscript. It contains aggregate evidence only;
it cannot launch Chrono Divide games or retrain the bot.

## Contents

- `paper/`: anonymous LNCS paper and supplement source, bibliography,
  deterministic generator, generated fragments, and unit tests.
- `research/artifacts/`: eight sanitized frozen JSON inputs used by the paper.
- `artifact_hashes.json`: SHA-256 allowlist for those sanitized inputs.
- `MANIFEST.json`: SHA-256 inventory of every other file in this package.
- `THIRD_PARTY.md`: precise inclusion, exclusion, and licensing boundary.

The scheduler account and project source commit fields are replaced with
`REDACTED_FOR_DOUBLE_BLIND`. Scientific values, family IDs, job IDs, evidence
commitments, design counts, estimates, confidence intervals, and descriptive
records are unchanged.

## Reproduce the paper assets

Python 3.10 or newer is sufficient for asset generation and tests:

```bash
python3 paper/scripts/generate_assets.py
python3 -m unittest paper.tests.test_generate_assets -v
```

The commands must leave the hashes in `paper/generated/asset_manifest.json`
unchanged. To compile the PDFs, use a TeX Live distribution with Springer
`llncs`, TikZ/PGFPlots, and BibTeX:

```bash
make -C paper main supplement
```

Expected output is a 16-page `paper/build/main.pdf` and a five-page
`paper/build/supplement.pdf`. The non-reference main-paper content ends on page
14. PDF byte hashes may vary with TeX distribution metadata; the committed TeX
fragment hashes are the reproducibility check.

## Scope

The artifact supports the reported aggregate study only. It does not establish
that StrongBot reliably beats Supalosa, and it does not support claims about
other opponents, factions, theaters, simulators, RTS games, ladder play, or
humans. See `THIRD_PARTY.md` for omitted software and assets.
