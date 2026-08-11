# Submission freeze checklist

Prepared: **2026-08-11**

Use a private copy of this checklist for author names, emails, ORCIDs,
conflicts, and submission credentials. Do not commit identifying metadata to
the anonymous branch during review.

## Target and policy rulings

- [ ] Exactly one archival target is selected by 2026-09-01.
- [ ] If SCAG is selected, its chairs confirm the application/evaluation
      contribution is in scope.
- [ ] The selected venue confirms fully remote presentation is permitted.
- [ ] If SCAG is selected, its chairs rule on the previously public named
      repository under double-blind
      review.
- [ ] The selected venue rules on the recorded beyond-copy-editing use of
      OpenAI Codex and specifies any required disclosure and citation.
- [x] Anonymous supplement and reviewer artifact together fit the official
      10 MB supplementary-material field; every essential detail remains in
      the main paper.
- [ ] Deadline, timezone, page limit, review model, and registration requirement
      reverified from the official call on the upload date.
- [ ] No simultaneous submission to an incompatible archival venue.
- [ ] Human author completes the evidence, citation, code, and line-by-line
      verification in `AUTHORSHIP_AND_AI_POLICY.md`; retain a private signed
      record tied to the manuscript commit and PDF hash.

## Frozen paper identity

- Title: **Configuring a Scripted RTS Agent: Held-Out Evaluation in Chrono
  Divide**
- Anonymous manuscript source commit:
  `297d8b3f02acb76f2335869ebd2bfb4bf5f06f5a`
- Main PDF: 16 pages total; non-reference material ends on page 14.
- Main PDF SHA-256:
  `e37b536750b337533273425a67c8d1a0a330dfef6d992d17a0a2556a30b3984c`
- Supplement: 5 pages.
- Supplement PDF SHA-256:
  `f56e60797d24b08694e9fa2a8676e431f972f253f6c101747052af2303ceea98`
- Deterministic anonymous artifact SHA-256:
  `fc1960a02216be892e2d9aca7f1b041571a7bef5c5cd6a8fe809f43875c52c0d`

These PDF hashes identify the current inspected build and will change when TeX
metadata or source is rebuilt. After any accepted editorial change, update the
commit and all three hashes together; never mix files from different freezes.

## ICAART fallback identity

- [x] Separate SCITEPRESS source committed at
      `e1b10b5e5648a3c4e7c032bbffcf01f098da682f`; the current reviewed source is
      `297d8b3f02acb76f2335869ebd2bfb4bf5f06f5a` and changes no frozen empirical
      artifact.
- [x] PDF is 10 A4 pages, with a 197-word abstract and 36,427 extracted
      non-whitespace characters.
- [x] PDF SHA-256 is
      `7cb677ae5d4ef03b51445fe42c3992bcddbb7a9aea8e22447a1809b100313239`.
- [x] Two clean builds are byte-identical; all ten pages, metadata, fonts,
      anonymity tokens, tables, plots, equations, and references were checked.
- [ ] ICAART confirms that the presenting author may elect the documented live
      online route without physical attendance.
- [ ] ICAART specifies where the required AI acknowledgment and affected-
      section system citation belong in the double-blind review version.
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
- [x] Anonymous artifact manifest verifies all 36 files.
- [x] A fresh extracted artifact rebuilds the 16-page paper and 5-page
      supplement without actionable warnings (the known template-level
      `amsmath` accent notice is acceptable).
- [x] Main and supplement PDFs have been rendered page by page after the last
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
- [ ] Reader correctly identified all four claim boundaries without coaching.
- [x] A separate visual/caption pass found no misleading standalone element.
- [ ] Author list/order, affiliations, acknowledgements, funding, conflicts,
      keywords, abstract, and corresponding-author details are prepared
      privately and match every submission field.
- [ ] Uploaded files were downloaded from the venue and compared with the local
      hashes/rendering.
- [ ] Submission ID, confirmation email, exact uploaded files, hashes, and chair
      rulings are stored in the private submission record.
