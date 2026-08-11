# Anonymous review artifact builder

This directory builds an identity-neutral, manuscript-only review artifact. It does
not package the StrongBot or Supalosa implementation, maps, MIX archives,
Chrono Divide runtime, game assets, private execution bundles, or Git history.

The builder copies both the LNCS/SCAG and exact SCITEPRESS/ICAART manuscript
sources plus their deterministic generator, sanitizes the eight frozen
aggregate JSON inputs used by the manuscripts, replaces their pinned hashes in
the copied generator, regenerates every table and figure fragment, synchronizes
the SCITEPRESS copies, checks for direct author identifiers, installs a
self-contained manifest verifier, writes a file-level SHA-256 manifest, and
creates a metadata-normalized tarball.

Build and test from the repository root:

```bash
python3 -m unittest artifact.tests.test_build_anonymous_artifact -v
python3 artifact/scripts/build_anonymous_artifact.py
```

The archive is written under `artifact/dist/` and is intentionally ignored by
Git. Inspect `artifact/THIRD_PARTY.md` before distributing it. The archive is a
review artifact, not a license grant for upstream bot or game content.
