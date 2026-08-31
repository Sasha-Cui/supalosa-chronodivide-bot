# Final anonymous artifact clean-room reproduction

Completed: **2026-08-30**

## Frozen archive identity

- Reviewed source commit: `6388f1a4243801f6b79d780844327c831a4290f4`.
- Archive: `chrono-divide-review-artifact.tar.gz`.
- Size: 1,319,412 bytes.
- SHA-256:
  `acbff70447321a43e753fab57f33858fa9797d4105970d627918aa69f08eb6e3`.
- Immutable files: 60.
- Archive members including directories and manifest: 74.
- Sanitized evidence SHA-256:
  `366a9e9bf5465c8f81d016b08af6621d18fc2c1fc0ec2bf17179759923db4e0a`.

Two independent builds from the same clean committed source produced identical
archives byte for byte.

## Git-free procedure

The frozen archive was extracted under a fresh temporary directory with no Git
tree and no access to repository files through relative paths. The following
sequence completed:

```text
python3 verify_manifest.py
python3 paper/scripts/generate_final_assets.py
python3 -m unittest paper_scitepress.tests.test_fallback_manuscript -v
python3 verify_manifest.py
make -C paper_scitepress submission-check
```

The manifest passed both before and after regeneration. All 14 packaged tests
passed. Asset generation emitted exactly six TeX files from the one sanitized
evidence JSON. The deep PDF check passed at 12 A4 pages, 36,004
non-whitespace characters, 190 abstract words, and seven embedded Unicode
fonts.

## Reproduced outputs

- SCITEPRESS PDF SHA-256:
  `b832744aa64b790044c706f3c64c797f6674b4e5549b48dc88dd49858de0cb77`.
- Submission metadata SHA-256:
  `ec0c2877d3921978e4d460c41ada94fe2a774d60d5a22ad8946eea728bb3fd8d`.

Both match the production build exactly.

## Boundary

The package reproduces manuscript numbers, tables, plot, metadata, and
deterministic frames. It does not contain or rerun the game, bot
implementations, maps, RA2 archives, external bot bundles, raw match rows, or
private scheduler logs. The clean-room pass therefore establishes artifact
self-consistency and paper reproducibility, not independent gameplay
replication.
