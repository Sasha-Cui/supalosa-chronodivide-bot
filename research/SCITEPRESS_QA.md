# SCITEPRESS submission-candidate QA record

Prepared: **2026-08-11**

## Frozen candidate identity

- Candidate introduced at: `e1b10b5e5648a3c4e7c032bbffcf01f098da682f`
- Current reviewed source: `bc0e6096ed89c7640bcbab5f3a4e7444e82f3b89`
- Scientific-claim freeze: `419a0f72188f957ae144262f62c62bcc11a66ac3`
- Claim-preserving terminology refreeze: `77d93359242756f07afba30d88fb2db8fd97e7b2`
- Citation-source refreeze: `e91674f4eff69c4ceccb3a65e617cfb91d01ec5c`
- Submission-length contract refreeze: `abf5e9460a99ace48aa3a48c33076b8108c4d1df`
- Acceptance-oriented framing refreeze: `bc0e6096ed89c7640bcbab5f3a4e7444e82f3b89`
- Portable artifact/build QA: `d53f822144bd0b3fffe3b4d778770091f77900b8`
- Submission metadata exporter: `0f3e690310894e8ab0bf6bb33c9e6f0c4e2bc8d0`
- Build entry point: `paper_scitepress/main.tex`
- Target: ICAART 2027 regular paper, anonymous SCITEPRESS review format
- PDF: 11 A4 pages, 168,002 bytes
- PDF SHA-256: `271363cdad2e6128588b34e5a64f7ddb38487cf3669067406516118b80797c71`
- Expanded plain-text abstract: 196 words
- Extracted submission length: 37,970 non-whitespace characters
- Portal metadata JSON SHA-256: `8935329266d8b20e53a718371eb74e86ba15a645d6469106f3cc86b74c6c8e4a`

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

The extracted PDF contains 37,970 non-whitespace characters, within ICAART's
10,000--50,000 review-submission interval. Its 196-word expanded abstract is within the
official 70--200-word interval. The page is A4 and the current 11-page build is
below the 12-page full-paper proceedings limit.

The separate submission check now enforces those values against the built PDF
and portal JSON rather than treating them as prose-only QA. It also fails on
non-A4 geometry, nonempty identity metadata, encryption, forms, JavaScript,
page rotation, missing Unicode maps or embedded fonts, PDF-to-portal
title/abstract/keyword drift, and metadata source-hash drift. Poppler's default
reading order is the frozen character-count method; layout mode has a different
count and is deliberately not mixed with the submitted 37,970-character
identity.

## Independent artifact reproduction

The repaired anonymous archive packages this exact SCITEPRESS source rather
than only the LNCS secondary format. A fresh Git-free extraction on macOS using
Python 3.12.13, GNU Make 3.81, and TeX Live 2022 verified all 60 immutable files
before and after regeneration, passed the ten shared and twelve
SCITEPRESS-specific tests, and completed `make -C paper_scitepress check`.
The result is an 11-page A4 PDF with SHA-256
`0a504938b2c6021fecf7bcec0e9db6e2354af971e72c7555b84f33a0cc647e3c`.
That byte identity is intentionally recorded separately from the Bouchet TeX
Live 2024 identity above; the package manifest and generated-fragment hashes,
not cross-version PDF bytes, are the portable invariant. The independent final
log had no overfull box, unresolved reference/citation, rerun, or
multiply-defined-label warning, all fonts were embedded, and all 11 pages were
inspected. The changed title, threat-to-control table, reflowed transitions,
and final reference page were additionally inspected at full resolution. The
package-local exporter produced the same 196-word portal metadata JSON and
SHA-256 recorded above.

The rebuilt archive is 101,342 bytes with 60 immutable files and SHA-256
`022b5dfdb9c6e58c6c42e4ee13e0e661e1210d5c6b5620b7314d22f31a732bf4`.
Its two copied build READMEs no longer name the institutional compute cluster,
the archive denylist rejects that token, and a whole-package regression check
prevents recurrence. The independent build also passed the Poppler-backed deep
submission check with the same 11-page, 37,970-character, nine-font result.

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

The acceptance-oriented refreeze at `bc0e609` changes the title and both
abstracts to foreground the paper's actual leakage-resistant evaluation
contribution, and adds a full-width threat-to-control map tying each validity
risk to its prespecified safeguard. It changes no empirical input, result,
estimator, uncertainty interval, or claim boundary. The production candidate
is now 11 pages and remains within both official length limits. Contact-sheet
inspection covered the complete 34-page production set across the LNCS paper,
supplement, and ICAART candidate; all changed and final reference pages were
also checked at full resolution. The independent TeX Live 2022 build passed
the same deep submission check and reproduced all immutable generated assets.

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
