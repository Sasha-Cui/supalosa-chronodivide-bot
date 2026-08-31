# Final anonymous artifact clean-room reproduction

Completed: **2026-08-30**

## Frozen archive identity

- Reviewed source commit: `f7b64f35cca53a5cf5e304b2dc77d1c5a435cd28`.
- Archive: `chrono-divide-review-artifact.tar.gz`.
- Size: 1,320,516 bytes.
- SHA-256:
  `9cf9509eb24871578d3b25ebb11667b83f1a809ddda72aa84bb7cf4df9520c34`.
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

The manifest passed both before and after regeneration. All 13 packaged tests
passed. Asset generation emitted exactly six TeX files from the one sanitized
evidence JSON. The deep PDF check passed at 12 A4 pages, 35,465
non-whitespace characters, 190 abstract words, and seven embedded Unicode
fonts.

## Reproduced outputs

- SCITEPRESS PDF SHA-256:
  `bb4bb1127a19a7e8e1c2dec934b8c2a076de907f9570e1c635edaab8e7154b4d`.
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
