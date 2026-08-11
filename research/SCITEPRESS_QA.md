# SCITEPRESS submission-candidate QA record

Prepared: **2026-08-11**

## Frozen candidate identity

- Candidate introduced at: `e1b10b5e5648a3c4e7c032bbffcf01f098da682f`
- Current reviewed source: `8242720bd603a8ac72ef5f28496b412f573b294e`
- Authoritative shared manuscript source: `8242720bd603a8ac72ef5f28496b412f573b294e`
- Portable artifact/build QA: `d53f822144bd0b3fffe3b4d778770091f77900b8`
- Build entry point: `paper_scitepress/main.tex`
- Target: ICAART 2027 regular paper, anonymous SCITEPRESS review format
- PDF: 10 A4 pages, 164,393 bytes
- PDF SHA-256: `56fdc8e6b1c29f6c29b54cef205bdb75772034a8924bbbebeabf8bd9f6f29408`
- Abstract: 197 words
- Extracted submission length: 36,435 non-whitespace characters

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
```

completed successfully. Seven candidate-specific tests passed, the shared paper
generator produced no Git drift, BibTeX emitted no warning, LaTeX emitted no
overfull box or undefined citation/reference, and the build checker enforced a
maximum of 12 pages. Commit `297d5b8` adds the fourth post-BibTeX LaTeX pass
needed for clean cross-reference convergence and makes any remaining rerun
warning fail closed. Two independent clean builds were byte-identical at the
PDF hash above. The fixed `SOURCE_DATE_EPOCH` is a stable reproducibility
constant established at the earlier comparator-justified freeze; the current
reviewed source identity is recorded above.

The extracted PDF contains 36,435 non-whitespace characters, within ICAART's
10,000--50,000 review-submission interval. Its 197-word abstract is within the
official 70--200-word interval. The page is A4 and the current 10-page build is
below the 12-page full-paper proceedings limit.

## Independent artifact reproduction

The repaired anonymous archive packages this exact SCITEPRESS source rather
than only the LNCS secondary format. A fresh Git-free extraction on macOS using
Python 3.14.2, GNU Make 3.81, and TeX Live 2022 verified all 58 immutable files
before and after regeneration, passed the ten shared and seven
SCITEPRESS-specific tests, and completed `make -C paper_scitepress check`.
The result is a 10-page A4 PDF of 164,234 bytes with SHA-256
`7f6b2e26352290ea689e03671f3e48053f4ac932fe6cddc5812e863ed04ad3d9`.
That byte identity is intentionally recorded separately from the Bouchet TeX
Live 2024 identity above; the package manifest and generated-fragment hashes,
not cross-version PDF bytes, are the portable invariant. The independent final
log had no overfull box, unresolved reference/citation, rerun, or
multiply-defined-label warning, all fonts were embedded, and all ten pages were
inspected at full resolution.

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
