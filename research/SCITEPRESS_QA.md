# SCITEPRESS fallback QA record

Prepared: **2026-08-11**

## Frozen fallback identity

- Fallback source commit: `e1b10b5e5648a3c4e7c032bbffcf01f098da682f`
- Authoritative shared manuscript source: `cb891b47c9bb5ad3ac75c2d67b59865d56a7e1d1`
- Build entry point: `paper_scitepress/main.tex`
- Target: ICAART 2027 regular paper, anonymous SCITEPRESS review format
- PDF: 10 A4 pages, 163,436 bytes
- PDF SHA-256: `38758d72d1a517ad0c41134c2e649c20e661fe4a54c3eb48f903910064d38c51`
- Abstract: 196 words
- Extracted submission length: 36,325 non-whitespace characters

The PDF is a build product and is not committed. The hash identifies the exact
file rendered and inspected in this QA pass.

## Source and template controls

The fallback imports all eight authoritative main-paper sections and regenerates
the result macros from the same eight hash-pinned aggregate inputs as the LNCS
paper. Its separate abstract contains no literal headline result values; those
also come from generated macros. The fallback does not include the supplement
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

completed successfully. Five fallback-specific tests passed, the shared paper
generator produced no Git drift, BibTeX emitted no warning, LaTeX emitted no
overfull box or undefined citation/reference, and the build checker enforced a
maximum of 12 pages. Two independent clean builds were byte-identical at the
PDF hash above. The fixed `SOURCE_DATE_EPOCH` is the authoritative manuscript
source commit time.

The extracted PDF contains 36,325 non-whitespace characters, within ICAART's
10,000--50,000 review-submission interval. Its 196-word abstract is within the
official 70--200-word interval. The page is A4 and the current 10-page build is
below the 12-page full-paper proceedings limit.

## Visual, metadata, and anonymity checks

All ten pages were rendered with Poppler and inspected at full resolution.
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

1. whether an accepted regular-paper author may elect the documented live Zoom
   route without physical attendance; and
2. where the required AI-use acknowledgment and affected-section citation
   belong in a double-blind review submission that must omit acknowledgments.

After that ruling, add exactly the required disclosure, complete the human
verification in `AUTHORSHIP_AND_AI_POLICY.md`, and repeat this full QA. Do not
silently upload the current no-disclosure PDF.
