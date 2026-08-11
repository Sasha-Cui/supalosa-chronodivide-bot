# Submission freeze checklist

Prepared: **2026-08-11**

Use a private copy of this checklist for author names, emails, ORCIDs,
conflicts, and submission credentials. Do not commit identifying metadata to
the anonymous branch during review.

## Target and policy rulings

- [ ] Target confirmed: EvoApplications 2027, SCAG special session.
- [ ] Chair confirms the application/evaluation contribution is in scope.
- [ ] Chair confirms fully remote presentation is permitted.
- [ ] Chair rules on the previously public named repository under double-blind
      review.
- [ ] Chair rules on the recorded beyond-copy-editing use of OpenAI Codex and
      specifies any required disclosure.
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
  `d545418104b2fb4953e25a5f2654cdc5fe2985e8`
- Main PDF: 16 pages total; non-reference material ends on page 14.
- Main PDF SHA-256:
  `789aa1cede3e3c9eb41dbb64bf1ddb0010a64f64621c1e0d6920eabb2d0479ee`
- Supplement: 5 pages.
- Supplement PDF SHA-256:
  `49753e464cbd11e422fbd067886be316ef72a874a814f53d825dd6a3ef3ac13c`
- Deterministic anonymous artifact SHA-256:
  `f2e8b44e8eba0ffc96c2854307c037b17631a0cf4e2036bd15a3a026b9831d86`

These PDF hashes identify the current inspected build and will change when TeX
metadata or source is rebuilt. After any accepted editorial change, update the
commit and all three hashes together; never mix files from different freezes.

## Scientific consistency

- [x] Abstract, RQ1, results, and conclusion report champion-minus-reference as
      the positive confirmatory claim.
- [x] Abstract, RQ2, results, and conclusion report the failed absolute gate.
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
