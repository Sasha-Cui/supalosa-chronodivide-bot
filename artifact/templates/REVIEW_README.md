# StrongBot in Chrono Divide: anonymous review artifact

This artifact regenerates every numeric macro, table, and plot used by the
accompanying anonymous manuscript and includes all 15 protocol-selected game
frames. It contains aggregate evidence only; it cannot launch Chrono Divide
games, retrain the bot, or reproduce proprietary runtime assets.

## Contents

- `paper/sections/`: the eight authoritative current manuscript sections.
- `paper/figures/game_frames/`: 15 immutable deterministic PNGs.
- `paper/scripts/generate_final_assets.py`: the hash-pinned asset generator.
- `paper/generated/`: the six regenerated TeX assets plus their manifest.
- `paper_scitepress/`: the exact anonymous SCITEPRESS candidate, official
  vendored style files, metadata exporter, and build checks.
- `research/artifacts/`: one sanitized frozen JSON input for all reported
  results and frame identities.
- `artifact_hashes.json`: the sanitized evidence SHA-256.
- `MANIFEST.json` and `verify_manifest.py`: package-wide integrity controls.
- `THIRD_PARTY.md`: inclusion, exclusion, and licensing boundary.

Source revision fields are replaced with `REDACTED_FOR_DOUBLE_BLIND`.
Scientific values, opponent and runtime hashes, seed populations, design
counts, exact job IDs, estimates, uncertainty bounds, and screenshot hashes
are otherwise unchanged.

## Claim-to-evidence map

| Manuscript question | Frozen record | Primary fields |
| --- | --- | --- |
| What supports HFO 633/24/63 and its pooled and clustered lower bounds? | `research/artifacts/final_paper_evidence_v1.json` | `hfoConfirmation.overall`, `hfoConfirmation.clustered`, `hfoConfirmation.byCountry`, `hfoConfirmation.byStart`, `hfoConfirmation.byFaction`, `hfoConfirmation.bySlot` |
| Which HFO interventions replicated and remained inactive elsewhere? | same record | `mechanisms.*.replication`, `mechanisms.*.isolation` |
| What selected and confirmed the Peak 134/14/32 policy over 92/16/72 control? | same record | `peakStudy.development`, `peakStudy.replication` |
| What bounds cross-opponent transfer? | same record | `advancedTransfer.candidate`, `advancedTransfer.supalosa`, `advancedTransfer.paired` |
| How were screenshots selected and hash-bound? | same record | `frameEvidence.frames`, `frameEvidence.forceClearance`, `frameEvidence.peakDivergenceUpdate` |
| Which claims are supported or explicitly unsupported? | same record | `claimBoundary` |

The record is a compact reduction of eleven immutable completed aggregates.
It contains no raw game rows or private cluster paths. Its input hash is
pinned in the copied generator, which fails instead of accepting drift.

## Verify and reproduce

Python 3.10 or newer is sufficient for verification and asset regeneration:

```bash
python3 verify_manifest.py
python3 paper/scripts/generate_final_assets.py
python3 -m unittest paper_scitepress.tests.test_fallback_manuscript -v
python3 verify_manifest.py
```

With TeX Live 2024, compile and validate the exact review manuscript:

```bash
make -C paper_scitepress check
```

With Poppler 25.x also available, run the deep PDF check:

```bash
make -C paper_scitepress submission-check
```

Expected output is a 12-page A4 `paper_scitepress/build/main.pdf` with a
190-word expanded abstract. PDF bytes may vary across TeX distributions; the
package manifest and generated-asset hashes are the portable invariants.

## Scope

The artifact supports reliable superiority over pinned Supalosa on balanced
Heck Freezes Over (633/24/63) and replicated Peak of Perfection
(134/14/32 versus 92/16/72 deployed control), the three scoped HFO mechanism
replications, and the negative RA2Web Advanced transfer. It does not introduce
Chrono Divide, establish superiority to all opponents, provide a generally
robust map policy, or support a novel general-purpose optimizer claim.
