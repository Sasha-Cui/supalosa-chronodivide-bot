# Research status

Last reconciled: **2026-08-30**

## Bottom line

The empirical program is complete and the current paper is a positive, bounded
submission candidate. Frozen StrongBot reliably beats pinned Supalosa on Heck
Freezes Over and Peak of Perfection under literal all-building elimination.
The same policy fails to transfer to RA2Web Advanced; that negative result is a
main limitation. No Chrono Divide simulation job is active or needed for this
submission.

## Final results

| Study | Games | StrongBot or candidate W/D/L | Comparator | Decision |
| --- | ---: | ---: | --- | --- |
| HFO confirmation | 720 | 633/24/63 | pinned Supalosa | pass; Wilson lower 85.78%, country-start lower 84.49% |
| Peak replication | 180 paired cases per policy | 134/14/32 | deployed control 92/16/72 | pass; paired lower +0.167 |
| Advanced transfer | 360 paired cases per first policy | 79/19/262 | Supalosa 178/30/152 vs same opponent | negative transfer |
| Allied west rush+guard | 50 paired cases | 47/2/1 | 1/11/38 control | pass; paired lower +0.764 |
| Soviet west rush+guard | 120 paired cases | 98/9/13 | 47/43/30 control | pass; paired lower +0.211 |
| Bottom progress retarget | 270 paired cases | 198/23/49 | 123/98/49 control | pass; paired lower +0.115 |

Every scoped mechanism also passed its outcome-free activation/isolation gate.
The HFO confirmation has only four tick-cap draws. Peak is positive in every
country, start, faction side, and participant slot.

## Current paper and artifact

- Manuscript title: **StrongBot: Auditable Map-Profiled RTS Agent Development
  in Chrono Divide**.
- Final paper evidence: `research/artifacts/final_paper_evidence_v1.json`,
  SHA-256 `0670bdeefab47ca68fb5fc584be6a299e777ee0d69f04cd45de7caebf32c31e3`.
- SCITEPRESS candidate: 12 A4 pages, 190-word abstract, 35,543
  non-whitespace characters.
- PDF SHA-256:
  `345b6bfc2b07f0f5ce18f2f0ae3816d76f58999494db90fbfb61e0c6af25abb4`.
- Anonymous artifact: 60 immutable files, 1,320,744 bytes, SHA-256
  `90961b36d0d6e839f6d0c0b45b22fe76a1751b54f05454e2435810cff16f7756`.
- Git-free artifact build reproduces the PDF and metadata exactly.

## Claim boundary

Supported: reliable superiority over pinned Supalosa on balanced HFO and
replicated Peak; replicated scoped HFO mechanisms; deterministic full-game
evidence; explicit Advanced transfer failure.

Unsupported: a new Chrono Divide environment, a novel general optimizer,
superiority to all opponents, full map generalization, or a paradigm shift in
game AI.

## Remaining work

Only human submission actions remain: venue-stage/deadline verification,
remote-presentation and AI-disclosure rulings, double-blind handling of the
public repository, author metadata, and rights-holder contact. See
`SUBMISSION_CHECKLIST.md`.

## Historical note

Older method-v2 family-configuration documents and PDFs remain in Git as
preserved pilot history. They are superseded by the final HFO/Peak program and
are excluded from the anonymous review artifact. Do not use their negative
claim or old title as the current paper state.
