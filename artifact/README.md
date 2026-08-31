# Anonymous final-study review artifact builder

This directory builds an identity-neutral, manuscript-only review artifact for
the final StrongBot study. It does not package bot implementations, maps, MIX
archives, Chrono Divide or RA2Web runtimes, commercial game assets, private raw
execution bundles, or Git history.

The builder uses an explicit allowlist: eight current manuscript sections, the
SCITEPRESS source and official style files, the final evidence generator, one
sanitized evidence JSON, six regenerated TeX assets, and the 15 hash-verified
deterministic frames. Legacy LNCS sources and obsolete negative-study assets
remain in repository history but are excluded from the review package.

Build and test from the repository root:

```bash
python3 -m unittest artifact.tests.test_build_anonymous_artifact -v
python3 artifact/scripts/build_anonymous_artifact.py
python3 artifact/scripts/verify_frozen_archive.py
```

The archive is written under `artifact/dist/` and is intentionally ignored by
Git. Inspect `artifact/THIRD_PARTY.md` before distributing it. The archive is a
peer-review artifact, not a license grant.

The output is a deterministic gzip-compressed POSIX tar archive. Review it in
a new directory so no repository file can satisfy an omitted dependency:

```bash
mkdir reviewer-cleanroom
tar -xzf artifact/dist/chrono-divide-review-artifact.tar.gz -C reviewer-cleanroom
cd reviewer-cleanroom/chrono-divide-review-artifact
python3 verify_manifest.py
```

`FROZEN_IDENTITY.json` records the exact final archive after the clean-room
build is complete. The frozen verifier rebuilds from current source and rejects
both source drift and a stale distribution archive.
