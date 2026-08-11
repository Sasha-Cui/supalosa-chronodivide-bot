# SCITEPRESS submission-candidate QA record

Prepared: **2026-08-11**

## Frozen candidate identity

- Candidate introduced at: `e1b10b5e5648a3c4e7c032bbffcf01f098da682f`
- Current reviewed source: `77d93359242756f07afba30d88fb2db8fd97e7b2`
- Scientific-claim freeze: `419a0f72188f957ae144262f62c62bcc11a66ac3`
- Claim-preserving terminology refreeze: `77d93359242756f07afba30d88fb2db8fd97e7b2`
- Portable artifact/build QA: `d53f822144bd0b3fffe3b4d778770091f77900b8`
- Submission metadata exporter: `0f3e690310894e8ab0bf6bb33c9e6f0c4e2bc8d0`
- Build entry point: `paper_scitepress/main.tex`
- Target: ICAART 2027 regular paper, anonymous SCITEPRESS review format
- PDF: 10 A4 pages, 164,420 bytes
- PDF SHA-256: `3ec1a157b4b09ccbf398f68dd254da8f0abd9f90a7520550bead46246e1b9ff4`
- Expanded plain-text abstract: 195 words
- Extracted submission length: 36,355 non-whitespace characters
- Portal metadata JSON SHA-256: `b6c79cacfc78289ccface7d0793d46c6c6317451e3f9cdc0b0984731fba2ea47`

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

completed successfully. Eleven candidate-specific tests passed, the shared paper
generator produced no Git drift, BibTeX emitted no warning, LaTeX emitted no
overfull box or undefined citation/reference, and the build checker enforced a
maximum of 12 pages. Commit `297d5b8` adds the fourth post-BibTeX LaTeX pass
needed for clean cross-reference convergence and makes any remaining rerun
warning fail closed. Two independent clean builds were byte-identical at the
PDF hash above. The fixed `SOURCE_DATE_EPOCH` is a stable reproducibility
constant established at the earlier comparator-justified freeze; the current
reviewed source identity is recorded above.

The extracted PDF contains 36,355 non-whitespace characters, within ICAART's
10,000--50,000 review-submission interval. Its 195-word expanded abstract is within the
official 70--200-word interval. The page is A4 and the current 10-page build is
below the 12-page full-paper proceedings limit.

The separate submission check now enforces those values against the built PDF
and portal JSON rather than treating them as prose-only QA. It also fails on
non-A4 geometry, nonempty identity metadata, encryption, forms, JavaScript,
page rotation, missing Unicode maps or embedded fonts, PDF-to-portal
title/abstract/keyword drift, and metadata source-hash drift. Poppler's default
reading order is the frozen character-count method; layout mode has a different
count and is deliberately not mixed with the submitted 36,355-character
identity.

## Independent artifact reproduction

The repaired anonymous archive packages this exact SCITEPRESS source rather
than only the LNCS secondary format. A fresh Git-free extraction on macOS using
Python 3.12.13, GNU Make 3.81, and TeX Live 2022 verified all 60 immutable files
before and after regeneration, passed the ten shared and eleven
SCITEPRESS-specific tests, and completed `make -C paper_scitepress check`.
The result is a 10-page A4 PDF of 164,267 bytes with SHA-256
`9531e3fe2266487e173855ef119162b5c8e4b2ecca25c0d49e3b6be6ddd8e8bd`.
That byte identity is intentionally recorded separately from the Bouchet TeX
Live 2024 identity above; the package manifest and generated-fragment hashes,
not cross-version PDF bytes, are the portable invariant. The independent final
log had no overfull box, unresolved reference/citation, rerun, or
multiply-defined-label warning, all fonts were embedded, and all ten pages were
inspected at full resolution. The package-local exporter produced the same
195-word portal metadata JSON and SHA-256 recorded above.

The rebuilt archive is 99,618 bytes with 60 immutable files and SHA-256
`2ad44d30c0fa05d31896f6afaf94ffe2060f9f48d662309a20762cfbaea56fd2`.
Its two copied build READMEs no longer name the institutional compute cluster,
the archive denylist rejects that token, and a whole-package regression check
prevents recurrence. The independent build also passed the Poppler-backed deep
submission check with the same 10-page, 36,355-character, nine-font result.

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

All ten pages were rendered with Poppler and inspected at full resolution.
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

The final submission-verifier and source-artifact anonymity changes do not
touch manuscript TeX, generated empirical fragments, bibliography, or PDF
metadata. The Bouchet PDF remains byte-identical at the frozen SHA-256. All 31
pages across ICAART, LNCS, and supplement were re-rendered; contact-sheet review
covered the complete set and every ICAART page was inspected at full
resolution with no defect.

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
