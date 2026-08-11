# Anonymous artifact clean-room reproduction

Verified: **2026-08-11**

This record tests whether the exact anonymous review archive reconstructs the
submitted manuscripts without a Git checkout, untracked evidence, or files
outside the package. It is a manuscript-reproducibility check, not a new
empirical experiment.

## Frozen identities

- Reviewed manuscript source at the start of the run:
  `e365e37b52dfcea24c3c26f5130b7ac37a9366ac`
- Archive: `chrono-divide-review-artifact.tar.gz`
- Archive format: gzip-compressed POSIX tar
- Archive size: 102,198 bytes
- Archive SHA-256:
  `53e0aed782f6a1c42329c33bac849bc2cad3225982184dc6db7f8ea7d0ca9e3e`
- Extracted root: `chrono-divide-review-artifact/`
- Python: 3.12.3
- TeX: TeX Live 2024 (`texlive/20240312-GCC-13.3.0`)

The archive was extracted into a newly created directory. The extracted tree
contained no Git tree. Only manifested package members were available to the
commands below.

The submission-side machine identity is recorded separately in
`artifact/FROZEN_IDENTITY.json`. Before upload,
`python3 artifact/scripts/verify_frozen_archive.py` rebuilds the archive from
current source and verifies both that build and the ignored distribution file.

## Clean-room procedure

Run from outside a repository checkout, replacing the archive path and fresh
directory as appropriate:

```bash
mkdir reviewer-cleanroom
tar -xzf chrono-divide-review-artifact.tar.gz -C reviewer-cleanroom
cd reviewer-cleanroom/chrono-divide-review-artifact
python3 verify_manifest.py
python3 paper/scripts/generate_assets.py
python3 -m unittest \
  paper.tests.test_generate_assets \
  paper_scitepress.tests.test_fallback_manuscript -v
python3 verify_manifest.py
make -C paper clean
make -C paper main supplement
make -C paper_scitepress clean
make -C paper_scitepress submission-check
```

The manifest was checked before and after regeneration. The SHA-256 of
`paper/generated/asset_manifest.json` did not change.

## Results

- All 60 immutable files verified before regeneration.
- All 22 packaged manuscript tests passed.
- All 60 immutable files verified again after regeneration.
- LNCS paper SHA-256:
  `7303ab1c2c1f8ea0abfb2abe4d4c56b3111d4b3ccd7e55e714836d6c0ce33f92`
- LNCS supplement SHA-256:
  `7674eb4190f422d66da9b7a9e50d464abc0c33894fbbedf85da6cb7a5d302d56`
- SCITEPRESS paper SHA-256:
  `42f5cdb1b08ea8fff04fdefc4898dd336c8556c6cafb57f07e1d2139ed0daf28`
- The SCITEPRESS deep check passed with 11 A4 pages, 39,123 extracted
  non-whitespace characters, nine embedded fonts, and anonymous PDF metadata.
- All 34 rebuilt pages were rendered with Poppler and inspected as complete
  contact sheets. No clipping, overlap, unreadable text, contrast defect,
  missing glyph, or margin violation was observed.

These three PDF hashes are byte-identical to the production builds because the
clean-room run used the same pinned TeX distribution. The earlier independent
TeX Live 2022 run has separately recorded PDF hashes; cross-version PDF bytes
are not the portable invariant. The portable invariant is the verified source
manifest and regenerated aggregate fragments.

## Scope boundary

This archive regenerates tables, figures, portal metadata, and manuscript PDFs
from eight sanitized, frozen aggregate JSON inputs. It does not reproduce
simulations, optimizer selection, bot execution, raw-game aggregation, or the
private unblinding workflow. Those claims remain tied to the committed
protocol records, aggregate hashes, job-level registry, and preserved private
evidence. No additional outcome-bearing game was launched or inspected for
this audit.
