# Chrono Divide research layer

This directory is the paper and reproducibility layer for StrongBot. Chrono
Divide is the existing browser Red Alert 2 reconstruction used as the game
simulator; the name does not refer to a chronological data split.

## Current result

The final study is positive but bounded:

- HFO: 633W/24D/63L over 720 balanced games against pinned Supalosa.
- Peak: 134W/14D/32L for the confirmed reciprocal macro policy versus
  92W/16D/72L deployed control on fresh paired cases.
- Replicated mechanisms: Allied west rush+guard, Soviet west rush+guard, and
  bottom progress-gated building retarget, each with exact inactive-cell gates.
- Transfer limit: StrongBot 79W/19D/262L against RA2Web Advanced, worse than
  pinned Supalosa on the same cases.

No simulation is active or required for the current paper.

## Read in this order

1. [`STATUS.md`](STATUS.md) - current empirical and paper state.
2. [`PAPER_PLAN.md`](PAPER_PLAN.md) - research questions, contributions, and
   claim boundary.
3. [`results/2026-08-24-hfo-deployed-confirmatory-v1.md`](results/2026-08-24-hfo-deployed-confirmatory-v1.md)
   and [`results/2026-08-30-peak-profile-scope-replication-v1.md`](results/2026-08-30-peak-profile-scope-replication-v1.md) - primary positive results.
4. [`results/2026-08-24-hfo-ra2web-advanced-crossplay-v1.md`](results/2026-08-24-hfo-ra2web-advanced-crossplay-v1.md) - negative transfer.
5. [`results/2026-08-30-deterministic-game-frame-replay-v1.md`](results/2026-08-30-deterministic-game-frame-replay-v1.md) - screenshot provenance.
6. [`artifacts/final_paper_evidence_v1.json`](artifacts/final_paper_evidence_v1.json)
   and [`scripts/build_final_paper_evidence.py`](scripts/build_final_paper_evidence.py) - compact final evidence chain.
7. [`SCITEPRESS_QA.md`](SCITEPRESS_QA.md) and
   [`ARTIFACT_CLEANROOM_REPRODUCTION.md`](ARTIFACT_CLEANROOM_REPRODUCTION.md)
   - PDF and Git-free artifact QA.
8. [`SUBMISSION_CHECKLIST.md`](SUBMISSION_CHECKLIST.md) - remaining human
   venue, rights, and upload actions.
9. [`RESULT_REGISTRY.tsv`](RESULT_REGISTRY.tsv) - append-only experiment/job
   registry.
10. [`FORENSIC_AUDIT.md`](FORENSIC_AUDIT.md) - original project reconstruction.

## Repository layout

- `research/protocols/`: prospectively frozen protocols and amendments.
- `research/results/`: complete stage result documents, including negative
  programs.
- `research/artifacts/final_paper_evidence_v1.json`: sanitized paper evidence.
- `research/scripts/`: selectors, finalizers, reducers, and validators.
- `research/slurm/`: preserved cluster entry points.
- `paper/`: authoritative sections, final asset generator, and game frames.
- `paper_scitepress/`: exact anonymous venue-format manuscript.
- `artifact/`: deterministic anonymous review-artifact builder and freeze.

## Historical material

Method-v2 family-configuration documents, legacy LNCS sources, and older venue
packets remain for provenance. They are superseded and excluded from the final
review artifact. When a historical document conflicts with `STATUS.md`, the
current final evidence artifact and the dated result documents above govern.

## Release boundary

Author-written protocols, tests, reductions, aggregate metadata, and manuscript
source may be released. The combined StrongBot/Supalosa tree is currently
unlicensed for redistribution, and maps, MIX archives, runtimes, external bot
bundles, and game-derived imagery remain subject to third-party rights. See
`../artifact/THIRD_PARTY.md`.
