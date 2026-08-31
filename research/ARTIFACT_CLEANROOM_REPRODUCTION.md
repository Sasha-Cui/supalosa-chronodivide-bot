# Final anonymous artifact clean-room reproduction

Completed: **2026-08-30**

## Frozen archive identity

- Reviewed source commit: `4e2ba4eb599ffd37fec5d0f5da620c20dca80fa5`.
- Archive: `chrono-divide-review-artifact.tar.gz`.
- Size: 1,319,395 bytes.
- SHA-256:
  `c72719f869e3d26183b3615398dd4e82412a02aff2c16893083c60dec368e741`.
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
  `4b6a2d17bf20c77c46ab4f6c0f010648edcb226862008dbc386fc69a18b62e9b`.
- Submission metadata SHA-256:
  `cc8f656f8ccca9fab1a614d40a80368e0bec08bcfd6fc5dee07b69edb475d127`.

Both match the production build exactly.

## Boundary

The package reproduces manuscript numbers, tables, plot, metadata, and
deterministic frames. It does not contain or rerun the game, bot
implementations, maps, RA2 archives, external bot bundles, raw match rows, or
private scheduler logs. The clean-room pass therefore establishes artifact
self-consistency and paper reproducibility, not independent gameplay
replication.
