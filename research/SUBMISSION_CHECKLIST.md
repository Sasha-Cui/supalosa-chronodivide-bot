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
- [ ] Anonymous supplement and reviewer artifact together fit the official
      10 MB supplementary-material field; every essential detail remains in
      the main paper.
- [ ] Deadline, timezone, page limit, review model, and registration requirement
      reverified from the official call on the upload date.
- [ ] No simultaneous submission to an incompatible archival venue.

## Frozen paper identity

- Title: **Configuring a Scripted RTS Agent: Held-Out Evaluation in Chrono
  Divide**
- Anonymous manuscript source commit:
  `64957e5dce9680a509c1d9101094cca20f795a04`
- Main PDF: 16 pages total; non-reference material ends on page 14.
- Main PDF SHA-256:
  `2fe30264c2cba4772bae6bbc231721c0c8d4cd13302f7d6314a2d756ee600b68`
- Supplement: 5 pages.
- Supplement PDF SHA-256:
  `8e14a20bf05fc0d24b9ece5a00dbc365de0a249c75d64daef24c20274efeebb0`
- Deterministic anonymous artifact SHA-256:
  `ac31dd4c3553c3e6af30e308984912348ec2ea89241759518faa76e4b2377548`

These PDF hashes identify the current inspected build and will change when TeX
metadata or source is rebuilt. After any accepted editorial change, update the
commit and all three hashes together; never mix files from different freezes.

## Scientific consistency

- [ ] Abstract, RQ1, results, and conclusion report champion-minus-default as
      the positive confirmatory claim.
- [ ] Abstract, RQ2, results, and conclusion report the failed absolute gate.
- [ ] Exactly 512 confirmatory games, 16 sealed families, and 256 games per
      method are reported consistently.
- [ ] Improvement is 0.33594; family-clustered 95% CI is [0.21456, 0.45732].
- [ ] Champion score is 0.53516; one-sided lower margin above 0.5 is -0.02117.
- [ ] W/D/L counts are default 1/100/155 and champion 47/180/29.
- [ ] Fourteen family effects are positive, two zero, and none negative.
- [ ] Component and terminal-state evidence is labeled post-confirmatory and
      non-causal.
- [ ] No claim introduces Chrono Divide, a novel optimizer, reliable Supalosa
      superiority, broad game-AI dominance, or a paradigm shift.
- [ ] No new outcome-bearing evidence from the opened family population has
      been added.

## Reproducibility and anonymity

- [ ] `make -C paper check main supplement` passes in a clean committed export.
- [ ] Anonymous artifact manifest verifies all 35 files.
- [ ] A fresh extracted artifact rebuilds the 16-page paper and 5-page
      supplement without warnings.
- [ ] Main and supplement PDFs have been rendered page by page after the last
      edit; no clipping, overlap, invisible text, or illegible plot label.
- [ ] No author name, NetID, institution, scheduler account, private path,
      personal email, or named repository URL appears in review files.
- [ ] PDF metadata, archive member metadata, and submission fields are checked
      separately from visible text.
- [ ] The submitted archive hash matches the retained local archive exactly.

## Rights and release boundary

- [ ] Anonymous artifact contains no StrongBot/Supalosa bot packages, maps, MIX
      archives, Chrono Divide runtime, Red Alert 2 assets, or private raw logs.
- [ ] `THIRD_PARTY.md` accompanies the artifact.
- [ ] Supalosa's written permission/license is retained before any public
      redistribution of the combined bot.
- [ ] Chrono Divide acquisition, version, citation, and permitted redistribution
      language follow the maintainer's written guidance.
- [ ] Public code/data availability statements distinguish aggregate
      reproducibility from full match replay.

## Human review and upload

- [ ] Independent cold reader completed
      [`EXTERNAL_REVIEW_PACKET.md`](EXTERNAL_REVIEW_PACKET.md).
- [ ] Reader correctly identified all four claim boundaries without coaching.
- [ ] A separate visual/caption pass found no misleading standalone element.
- [ ] Author list/order, affiliations, acknowledgements, funding, conflicts,
      keywords, abstract, and corresponding-author details are prepared
      privately and match every submission field.
- [ ] Uploaded files were downloaded from the venue and compared with the local
      hashes/rendering.
- [ ] Submission ID, confirmation email, exact uploaded files, hashes, and chair
      rulings are stored in the private submission record.
