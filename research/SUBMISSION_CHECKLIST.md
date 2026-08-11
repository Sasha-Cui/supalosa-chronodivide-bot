# Submission freeze checklist

Prepared: **2026-08-11**

Use a private copy of this checklist for author names, emails, ORCIDs,
conflicts, and submission credentials. Do not commit identifying metadata to
the anonymous branch during review.

## Target and policy rulings

- [ ] Exactly one archival target is selected by 2026-08-25; ICAART is the
      operational primary candidate pending its four written rulings.
- [ ] If SCAG is selected, its chairs confirm the application/evaluation
      contribution is in scope.
- [ ] If ICAART is selected, the secretariat confirms the author qualifies and
      provides the procedure, confirmation timing, and speaker fee class for
      its publicly documented exceptional remote route.
- [ ] If SCAG is selected, its chairs confirm fully remote presentation is
      permitted.
- [ ] If SCAG is selected, its chairs rule on the previously public named
      repository under double-blind
      review.
- [ ] If ICAART is selected, the secretariat rules on the previously public
      named implementation repository and any required visibility change.
- [ ] The selected venue rules on the recorded beyond-copy-editing use of
      OpenAI Codex and specifies any required disclosure and citation.
- [x] Anonymous supplement and reviewer artifact together fit SCAG's official
      10 MB supplementary-material field; every essential detail remains in
      the main paper.
- [ ] Deadline, timezone, page limit, review model, and registration requirement
      reverified from the official call on the upload date.
- [ ] No simultaneous submission to an incompatible archival venue.
- [ ] At the initial upload, archive the submitted identity and activate the
      under-review confidentiality embargo: do not provide the manuscript,
      confidential reviews, or rebuttal text to a public generative-AI service
      until the official selection result.
- [ ] Human author completes the evidence, citation, code, and line-by-line
      verification in `HUMAN_AUTHOR_VERIFICATION_PACKET.md` under the policy in
      `AUTHORSHIP_AND_AI_POLICY.md`; retain a private signed record tied to the
      manuscript commit and PDF hash.

## Frozen paper identity

- Title: **Leakage-Resistant Evaluation of Scripted RTS Agent Configuration in
  Chrono Divide**
- Anonymous manuscript source commit:
  `92a4c870b6e697682b51fa41fd0f785c97c6b121`
- Main PDF: 18 pages total; non-reference material ends on page 15.
- Main PDF SHA-256:
  `c44c0d5739a33ae4155c18f0eba8c480785f4e3e1b9e2250dc03a43733a6d0a1`
- Supplement: 5 pages.
- Supplement PDF SHA-256:
  `7674eb4190f422d66da9b7a9e50d464abc0c33894fbbedf85da6cb7a5d302d56`
- Deterministic anonymous artifact SHA-256:
  `10f270f49d38d2a3d2175f598795fca8d8e7ca57c5736f0971e2462d2ee42d0c`
- Anonymous artifact size: 102,179 bytes; 60 immutable manifested files.

These PDF hashes identify the current inspected build and will change when TeX
metadata or source is rebuilt. After any accepted editorial change, update the
commit and all three hashes together; never mix files from different freezes.

## ICAART primary-candidate identity

- [x] Separate SCITEPRESS source committed at
      `e1b10b5e5648a3c4e7c032bbffcf01f098da682f`; the current reviewed source is
      `92a4c870b6e697682b51fa41fd0f785c97c6b121` and changes no frozen empirical
      artifact.
- [x] PDF is 11 A4 pages, with a 193-word expanded abstract and 39,102 extracted
      non-whitespace characters.
- [x] PDF SHA-256 is
      `7d4c26640a5f4da34783d1a533c8cfeb807d2d7b37a1e52acdc37b8cf6386c07`.
- [x] Two pinned Bouchet builds are byte-identical; all 11 pages, metadata, fonts,
      anonymity tokens, tables, plots, equations, and references were checked.
- [x] ICAART reviewer assignment is frozen to **Agents** with the call topics
      **Agent Models and Architectures**, **Simulation**, and **Task Planning
      and Execution**, if those exact choices are offered in PRIMORIS.
- [x] The PDF keywords are exactly **Game Artificial Intelligence**,
      **Real-time Strategy Games**, **Scripted Agents**, **Algorithm
      Configuration**, and **Reproducible Evaluation**.
- [x] `make -C paper_scitepress metadata` deterministically exports the exact
      plain-text portal title, expanded 193-word abstract, keywords, area, and
      ordered topics with source hashes; no LaTeX macro needs manual expansion.
- [x] Portal metadata JSON SHA-256 is
      `2581e6ae5e00454919c9ddf6b6cea7721935117234bc675b7d19162a799db834`.
- [ ] ICAART confirms author eligibility, request procedure, and fee class for
      the documented exceptional live-online route.
- [ ] ICAART specifies whether the named code repository must be private during
      review and whether prior public visibility affects eligibility.
- [ ] ICAART specifies where the required AI acknowledgment and affected-
      section system citation belong in the double-blind review version.
- [ ] ICAART specifies whether PRIMORIS accepts the identity-neutral aggregate
      artifact as a supplementary file or anonymous link, including any size
      limit; if it does not, reviewer-facing prose does not imply access.
- [ ] If ICAART is selected, apply only the approved disclosure and
      claim-preserving edits, then repeat `SCITEPRESS_QA.md` before upload.

## Scientific consistency

- [x] Abstract, RQ1, results, and conclusion report champion-minus-reference as
      the positive confirmatory claim.
- [x] Abstract, RQ2, results, and conclusion report the failed absolute gate.
- [x] Abstract, introduction, protocol, results, and conclusion explicitly
      report that failure of the absolute gate also fails the frozen joint
      two-gate criterion.
- [x] Exactly 512 confirmatory games, 16 sealed families, and 256 games per
      method are reported consistently.
- [x] Improvement is 0.33594; family-clustered 95% CI is [0.21456, 0.45732].
- [x] Champion score is 0.53516; one-sided lower margin above 0.5 is -0.02117.
- [x] W/D/L counts are reference 1/100/155 and champion 47/180/29.
- [x] Fourteen family effects are positive, two zero, and none negative.
- [x] Component and terminal-state evidence is labeled post-confirmatory and
      non-causal.
- [x] No claim introduces Chrono Divide, a novel optimizer, reliable Supalosa
      superiority, broad game-AI dominance, or a paradigm shift.
- [x] The frozen generic reference is not described as StrongBot's shipped or
      deployed map-profile-enabled default.
- [x] The protocol explains why that deployed default is outside the shared
      coordinate-free interface, and the limitations state that no deployed-
      default improvement is estimated.
- [x] No new outcome-bearing evidence from the opened family population has
      been added.

## Reproducibility and anonymity

- [x] `make -C paper check main supplement` passes in a clean committed export.
- [x] Anonymous artifact self-verifier checks all 60 immutable files and rejects
      missing, changed, or unexpected entries.
- [x] `python3 artifact/scripts/verify_frozen_archive.py` rebuilds the archive
      from current source and rejects both source drift and a stale ignored
      distribution file against `artifact/FROZEN_IDENTITY.json`.
- [x] A fresh Git-free extraction on an independent macOS toolchain passes all
      22 packaged tests and rebuilds the 18-page paper, 5-page supplement, and
      exact 11-page SCITEPRESS candidate without actionable warnings.
- [x] A second fresh Git-free extraction using the production Python and TeX
      toolchain verifies the manifest before and after regeneration and
      reproduces all three production PDF hashes exactly; see
      `ARTIFACT_CLEANROOM_REPRODUCTION.md`.
- [x] Main, supplement, and SCITEPRESS PDFs have been rendered after the last
      edit; no clipping, overlap, invisible text, or illegible plot label.
- [x] No author name, NetID, institution, scheduler account, private path,
      personal email, or named repository URL appears in review files.
- [x] PDF metadata and archive member metadata are checked separately from
      visible text; PDF author/title fields are empty and archive ownership and
      timestamps are normalized.
- [ ] Submission-system fields are checked separately at upload time.
- [ ] Any required generative-AI disclosure is accurate, venue-approved, and
      does not falsely characterize the recorded assistance as copy editing.
- [ ] The submitted archive hash matches the retained local archive exactly.

## Rights and release boundary

- [x] Anonymous artifact contains no StrongBot/Supalosa bot packages, maps, MIX
      archives, Chrono Divide runtime, Red Alert 2 assets, or private raw logs.
- [x] `THIRD_PARTY.md` accompanies the artifact.
- [ ] Supalosa's written permission/license is retained before any public
      redistribution of the combined bot.
- [ ] Chrono Divide acquisition, version, citation, and permitted redistribution
      language follow the maintainer's written guidance.
- [x] Public code/data availability statements distinguish aggregate
      reproducibility from full match replay.

## Human review and upload

- [ ] Independent cold reader completed
      [`EXTERNAL_REVIEW_PACKET.md`](EXTERNAL_REVIEW_PACKET.md).
- [ ] Reader completed and timestamped the unprimed venue-style review before
      receiving the targeted comprehension questions.
- [ ] Reader identified the principal relative claim, failed absolute endpoint,
      and non-novel environment/optimizer framing without coaching; all four
      core boundaries were correct after the separate comprehension audit.
- [x] A separate visual/caption pass found no misleading standalone element.
- [ ] Author list/order, affiliations, acknowledgements, funding, conflicts,
      and corresponding-author details are prepared privately; title, abstract,
      keywords, area, and topics match `ICAART_REVIEWER_ASSIGNMENT_AUDIT.md`
      if ICAART is selected.
- [ ] Uploaded files were downloaded from the venue and compared with the local
      hashes/rendering.
- [ ] Submission ID, confirmation email, exact uploaded files, hashes, and chair
      rulings are stored in the private submission record.
