# SCITEPRESS submission-candidate QA record

Prepared: **2026-08-11**

## Frozen candidate identity

- Candidate introduced at: `e1b10b5e5648a3c4e7c032bbffcf01f098da682f`
- Current reviewed source: `e365e37b52dfcea24c3c26f5130b7ac37a9366ac`
- Scientific-claim freeze: `419a0f72188f957ae144262f62c62bcc11a66ac3`
- Claim-preserving terminology refreeze: `77d93359242756f07afba30d88fb2db8fd97e7b2`
- Citation-source refreeze: `e91674f4eff69c4ceccb3a65e617cfb91d01ec5c`
- Submission-length contract refreeze: `abf5e9460a99ace48aa3a48c33076b8108c4d1df`
- Acceptance-oriented framing refreeze: `bc0e6096ed89c7640bcbab5f3a4e7444e82f3b89`
- Portable-contribution refreeze: `504cc2a7f1844183e2d87d0af09e1f697d3acfca`
- Reviewer-artifact page-contract fix: `853e2ffb3693287ee0572b7b8c659befa5f9763d`
- Portable artifact/build QA: `d53f822144bd0b3fffe3b4d778770091f77900b8`
- Submission metadata exporter: `0f3e690310894e8ab0bf6bb33c9e6f0c4e2bc8d0`
- Build entry point: `paper_scitepress/main.tex`
- Target: ICAART 2027 regular paper, anonymous SCITEPRESS review format
- PDF: 11 A4 pages, 169,331 bytes
- PDF SHA-256: `42f5cdb1b08ea8fff04fdefc4898dd336c8556c6cafb57f07e1d2139ed0daf28`
- Expanded plain-text abstract: 197 words
- Extracted submission length: 39,123 non-whitespace characters
- Portal metadata JSON SHA-256: `6eb561c409fad9bb24b362ec9634d8fb00cc4a9ad7a6983ddb82a0cd7033e498`

The PDF is a build product and is not committed. The hash identifies the exact
file rendered and inspected in this QA pass.

## Source and template controls

The candidate imports all eight authoritative main-paper sections and regenerates
the result macros from the same eight hash-pinned aggregate inputs as the LNCS
paper. Its separate abstract contains no literal headline result values; those
also come from generated macros. The candidate does not include the supplement
and does not create a second empirical record.

The four unmodified vendor files came from the official SCITEPRESS conference
LaTeX archive downloaded on 2026-08-11. The archive SHA-256 and individual file
hashes are recorded under `paper_scitepress/`. Tests fail if a vendor byte,
abstract bound, section import, anonymity token, or headline-macro boundary
changes.

## Automated checks

Under `texlive/20240312-GCC-13.3.0` on Bouchet:

```text
make -C paper_scitepress clean
make -C paper_scitepress check
module load poppler/25.07.0-GCC-13.3.0
make -C paper_scitepress submission-check
```

completed successfully. Twelve candidate-specific tests passed, the shared paper
generator produced no Git drift, BibTeX emitted no warning, LaTeX emitted no
overfull box or undefined citation/reference, and the build checker enforced a
maximum of 12 pages. Commit `297d5b8` adds the fourth post-BibTeX LaTeX pass
needed for clean cross-reference convergence and makes any remaining rerun
warning fail closed. Two independent clean builds were byte-identical at the
PDF hash above. The fixed `SOURCE_DATE_EPOCH` is a stable reproducibility
constant established at the earlier comparator-justified freeze; the current
reviewed source identity is recorded above.

The extracted PDF contains 39,123 non-whitespace characters, within ICAART's
10,000--50,000 review-submission interval. Its 197-word expanded abstract is within the
official 70--200-word interval. The page is A4 and the current 11-page build is
below the 12-page full-paper proceedings limit.

The separate submission check now enforces those values against the built PDF
and portal JSON rather than treating them as prose-only QA. It also fails on
non-A4 geometry, nonempty identity metadata, encryption, forms, JavaScript,
page rotation, missing Unicode maps or embedded fonts, PDF-to-portal
title/abstract/keyword drift, and metadata source-hash drift. Poppler's default
reading order is the frozen character-count method; layout mode has a different
count and is deliberately not mixed with the submitted 39,123-character
identity.

## Independent artifact reproduction

Before the current citation-only refreeze, the repaired anonymous archive
established cross-toolchain portability rather than only the LNCS secondary
format. A fresh Git-free extraction on macOS using
Python 3.12.13, GNU Make 3.81, and TeX Live 2022 verified all 60 immutable files
before and after regeneration, passed the ten shared and twelve
SCITEPRESS-specific tests, and completed `make -C paper_scitepress check`.
The result is an 11-page A4 PDF with SHA-256
`2037e3ed5626360dfd09cda2790547cfdf4fe27c7d8d2052e23c51e881f7e2a4`.
That byte identity is intentionally recorded separately from the Bouchet TeX
Live 2024 identity above; the package manifest and generated-fragment hashes,
not cross-version PDF bytes, are the portable invariant. The independent final
log had no overfull box, unresolved reference/citation, rerun, or
multiply-defined-label warning, all fonts were embedded, and all 11 pages were
inspected. The changed title, threat-to-control table, reflowed transitions,
and final reference page were additionally inspected at full resolution. The
package-local exporter produced the same 197-word portal metadata JSON and
SHA-256 recorded above.

The current rebuilt archive is 102,198 bytes with 60 immutable files and SHA-256
`53e0aed782f6a1c42329c33bac849bc2cad3225982184dc6db7f8ea7d0ca9e3e`.
Its two copied build READMEs no longer name the institutional compute cluster,
the archive denylist rejects that token, and a whole-package regression check
prevents recurrence. That earlier independent build also passed the
Poppler-backed deep submission check with its then-current 11-page,
38,760-character, nine-font result.

A separate same-toolchain clean-room run extracted this exact archive into a
fresh Git-free directory on Bouchet with Python 3.12.3 and TeX Live 2024. It
verified all 60 files before and after regeneration, passed all 22 packaged
tests, and reproduced the production SCITEPRESS PDF byte for byte at the hash
above. Its deep submission check and complete 11-page rendered inspection also
passed. See `ARTIFACT_CLEANROOM_REPRODUCTION.md` for the auditable transcript
and the explicit boundary that this package does not rerun simulations.

A separate frozen-identity verifier now rebuilds the archive from current
source before checking the ignored distribution file. This closes the
operational gap in which a stale `artifact/dist` output could survive beside a
clean source tree; it changes neither manuscript source nor PDF bytes.

## Reviewer-assignment metadata

The title and abstract already identify a scripted RTS agent, the Chrono Divide
environment, the configuration workflow, and the bounded empirical result.
The keyword block now targets the accurate reviewer pool with **Game Artificial
Intelligence**, **Real-time Strategy Games**, **Scripted Agents**, **Algorithm
Configuration**, and **Reproducible Evaluation**. The previous **Distribution
Shift** keyword was removed because it was not the paper's principal framing or
an ICAART 2027 topic. A regression test protects the corrected block. The
submission-system topic selections and rationale are frozen in
`ICAART_REVIEWER_ASSIGNMENT_AUDIT.md`.

## Visual, metadata, and anonymity checks

All 11 current pages were rendered with Poppler and inspected.
The explicit joint-gate wording and pinned-source citation revision received a
further complete ten-page pass.
The final venue-local MACO citation and compact StarCraft II author formatting
received another complete ten-page pass as part of a 31-page cross-format
inspection.
The final keyword-only edit received a fresh ten-page rendered inspection. The
new first-page keyword line is legible and remains inside its minipage; pages
2--10 are pixel-identical to the previously inspected freeze.
The final conclusion edit changed only page 9. That page was rendered at full
resolution and inspected; the conclusion remains adjacent to the limitations,
references begin cleanly below it, and pages 1--8 and 10 are pixel-identical to
the preceding inspected freeze.
The acceptance-criteria edit then tightened the contribution framing and made
the family-effect caption self-contained. A fresh 10-page render found the
revised contribution and caption legible and found no change to the paper's
claim boundary or conclusion.
The terminology refreeze at `77d9335` then replaced one-off acronyms with
descriptive names, stated the exact five-family lower-tail statistic, and
expanded the confirmatory outcome labels. A fresh complete render and a second
macOS artifact build found all ten pages legible with no page-count change.
The substantive citation audit then found one source-attribution boundary:
the project homepage supports the reconstruction claim but not the precise
offline API and pinned-bot statements. The current source refreeze added the
package and repository sources at both environment-description placements and
the closest map-specific program-synthesis precedent without changing any
empirical claim. The final `e91674f` close-work pass then added the learned-
sketch and bilevel-synthesis successors and explicitly disclaimed synthesis or
optimizer novelty. It kept the full pinned software URLs as link targets while
using concise printed labels. All ten pages were re-rendered and inspected,
including the changed related-work page and the complete reference list.
The study-flow diagram was widened to two columns after the first pass; the
final pass found no clipped or overlapping text, invisible content, broken
glyph, unreadable plot label, margin violation, misleading caption, or malformed
section transition. Tables 1--3 use the full page width; all other plots remain
readable in one column. The official template intentionally emits no page
numbers.

The PDF has empty Author, Title, Subject, and Keywords metadata; no JavaScript,
form, encryption, identifying repository URL, private path, author name,
institution, NetID, or scheduler-account token; and all fonts are embedded with
Unicode maps.

The final submission-verifier and source-artifact anonymity changes did not
touch manuscript TeX, generated empirical fragments, bibliography, or PDF
metadata. The final close-work and bibliography-fit edits changed no empirical
input, result, estimator, abstract, or conclusion. All 27 current main-paper
pages across ICAART and LNCS were re-rendered;
contact-sheet review covered the complete set and the changed pages and both
reference lists were inspected at full resolution with no defect. The
five-page supplement remained byte-identical to its previously inspected
freeze. The fresh TeX Live 2022 artifact build also retained the 10-page fit;
its related-work and reference pages were inspected at full resolution.

The acceptance-oriented refreeze at `bc0e609` changed the title and both
abstracts to foreground the paper's actual leakage-resistant evaluation
contribution, and adds a full-width threat-to-control map tying each validity
risk to its prespecified safeguard. It changes no empirical input, result,
estimator, uncertainty interval, or claim boundary. The production candidate
is now 11 pages and remains within both official length limits. Contact-sheet
inspection covered the complete 34-page production set across the LNCS paper,
supplement, and ICAART candidate; all changed and final reference pages were
also checked at full resolution. The independent TeX Live 2022 build passed
the same deep submission check and reproduced all immutable generated assets.

The portable-contribution refreeze at `504cc2a` adds a concise, bounded
statement of the reusable evidence contract to the abstract and conclusion,
uses ragged-right columns in the threat-to-control table, and balances the
two-column reference ending. It does not claim a new optimizer, environment,
or reliable opponent superiority. The SCITEPRESS candidate is now 11 pages,
38,760 non-whitespace characters, and 193 abstract words. Two clean TeX Live
2024 builds reproduced the PDF and metadata hashes above; the TeX Live 2022
artifact build reproduced its separately recorded cross-toolchain identity.
All 11 production pages and the changed pages at full resolution passed the
visual, anonymity, font, metadata, and overflow checks.

The closest-work refreeze at `5ed5dad` adds two recent IJCAI synthesis
precedents and freezes the submission check at 38,760 extracted non-whitespace
characters. The candidate remains 11 A4 pages. A complete 11-page contact-sheet
pass and full-resolution inspection of pages 2--3 and 10--11 found no clipping,
overlap, unreadable text, broken reference flow, contrast defect, or margin
violation. The scientific result, abstract, conclusion, and 193-word portal
abstract are unchanged.

The automatic-configuration closest-work refreeze at `92a4c87` adds Ouessai
et al.'s 2022 action-preselection configuration study and explicitly preserves
the distinction between its map--opponent-specific setup and this paper's
family-disjoint held-out estimand. At that freeze, the candidate remained 11 A4 pages
and contained 39,102 non-whitespace characters. Two deterministic archive
builds match at 102,179 bytes and SHA-256
`10f270f49d38d2a3d2175f598795fca8d8e7ca57c5736f0971e2462d2ee42d0c`;
a fresh TeX Live 2024 Git-free extraction passed all 22 packaged tests, both
manifest checks, and the deep submission check, and reproduced the production
PDF byte for byte. Complete 34-page contact-sheet inspection and full-resolution
inspection of the reflowed related-work and reference pages found no clipping,
overlap, unreadable text, broken reference flow, contrast defect, or margin
violation.

The reader-entry-point refreeze at `e365e37` names the control bundle as an
evidence contract in the expanded abstract without changing any estimate,
gate, diagnostic, citation, or scope boundary. The current candidate remains
11 A4 pages, has a 197-word abstract and 39,123 non-whitespace characters, and
has SHA-256
`42f5cdb1b08ea8fff04fdefc4898dd336c8556c6cafb57f07e1d2139ed0daf28`.
The portal metadata has SHA-256
`6eb561c409fad9bb24b362ec9634d8fb00cc4a9ad7a6983ddb82a0cd7033e498`.
Two deterministic 102,198-byte artifact builds match at SHA-256
`53e0aed782f6a1c42329c33bac849bc2cad3225982184dc6db7f8ea7d0ca9e3e`;
a fresh Git-free TeX Live 2024 extraction verified the 60-file manifest before
and after regeneration, passed all 22 packaged tests and the deep submission
check, and reproduced all three production PDFs byte for byte. All 34 pages
were inspected as contact sheets, and both abstract-driven first-page reflows
were checked at full resolution without a visual defect.

## Unresolved submission gates

This validated PDF is not yet authorized for upload. Written ICAART guidance is
still required on:

1. whether the author's no-travel requirement qualifies for the documented
   exceptional remote route and, if so, its procedure, timing, and fee class;
2. how the previously public named implementation repository must be handled
   during double-blind review; and
3. where the required AI-use acknowledgment and affected-section citation
   belong in a double-blind review submission that must omit acknowledgments;
   and
4. whether the identity-neutral aggregate artifact may accompany review as a
   PRIMORIS attachment or anonymous link, including the accepted archive type
   and size limit.

After those rulings, add exactly the required disclosure, align availability
language with the permitted artifact route, complete the human verification in
`AUTHORSHIP_AND_AI_POLICY.md`, and repeat this full QA. Do not silently upload
the current no-disclosure PDF.
