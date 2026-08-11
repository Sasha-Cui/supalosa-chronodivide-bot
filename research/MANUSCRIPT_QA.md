# Manuscript QA record

Last updated: **2026-08-11**

## Frozen manuscript

- Source commit: `77d93359242756f07afba30d88fb2db8fd97e7b2`
- Main source: `paper/main.tex`
- Supplement source: `paper/supplement.tex`
- Target format: Springer LNCS, anonymous submission
- Main PDF: 16 pages total; non-reference content ends on page 14
- Supplement PDF: 5 pages
- Main PDF SHA-256: `2434b9a2684025afd2eca8cfb505d1890b6bbeebf97e87ce738538eda5e6401a`
- Supplement PDF SHA-256: `f56e60797d24b08694e9fa2a8676e431f972f253f6c101747052af2303ceea98`

The PDFs are build products and are not committed. Their hashes identify the
exact artifacts inspected during this QA pass.

## Automated checks

The following completed successfully under
`texlive/20240312-GCC-13.3.0` on Bouchet:

```text
make check main supplement
make -C paper_scitepress clean
make -C paper_scitepress check
python3 -m unittest paper.tests.test_generate_assets -v
python3 -m unittest research.tests.test_export_confirmatory_family_diagnostics -v
python3 -m unittest artifact.tests.test_build_anonymous_artifact -v
```

The final LNCS logs contain:

- zero overfull boxes;
- zero undefined or multiply defined references;
- zero BibTeX warnings;
- 27 citation keys, 27 bibliography entries, no missing keys, and no unused
  entries; and
- deterministic regenerated paper fragments whose input and output hashes are
  recorded in `paper/generated/asset_manifest.json` for all eight frozen
  aggregate inputs.

The only final LNCS-log warning is the template/toolchain-level `amsmath` notice
that it cannot redefine the `\\vec` accent; it does not affect output.

A bibliographic metadata audit rechecked every Crossref-registered DOI against
its returned title and year, confirmed the closest 2026 paper on its Springer
chapter page, verified game API 0.75.0 against the committed npm lock and
installed package metadata, and resolved the full Supalosa opponent hash from
the public upstream remote. The API and opponent citations now point to those
exact pinned versions rather than only to moving project landing pages.
The final venue-local addition was checked against the official ICAART 2026
MACO paper and DOI `10.5220/0014358500004052`; the 25-author StarCraft II
reference uses standard `et al.` formatting while retaining its identifier and
DOI.

## Visual and content checks

All 16 main-paper pages and all five supplement pages were rendered with
Poppler and visually inspected. After the final title, research-question,
diagnostic-wording, and prior-art-positioning edits, all 16 main-paper pages
and all five supplement pages were rendered and inspected again. The final
method-classification edit received another complete 21-page pass. The final
closest-work citation and page-fit edit received a further complete 21-page
pass. The final resource-accounting addition received another complete
21-page pass. The artifact-derived claim refactor received a final complete
21-page pass. The comparator-identity correction received another complete
layout pass, including fresh renders of every changed supplement page. The
final coordinate-free comparator rationale and explicit deployed-default
limitation received a further complete 16-page main-paper pass. The explicit
failed-joint-criterion language and pinned-source citation correction then
received a fresh complete 21-page LNCS and supplement pass. Two clean builds of
each PDF were byte-identical after the LNCS build adopted the fixed source
epoch already used by the SCITEPRESS build. The checks covered title-page anonymity,
text and background
contrast, margins, line wrapping, tables, plot labels, captions, page numbers,
bibliography links, and section transitions. The final source contains no
author NetID, institution name, literal Slurm account, personal repository URL,
or private absolute path.

The final ICAART game-testbed citation and bibliography compaction received a
fresh complete 31-page pass over the 16-page LNCS paper, five-page supplement,
and 10-page SCITEPRESS candidate. The conclusion remains on LNCS page 14,
references begin on page 15, and no orphan bibliography page remains.
The final significance edit changed only LNCS page 14 and SCITEPRESS page 9;
both were rendered at full resolution and inspected for line wrapping, margins,
section transitions, and reference flow. Every other main-paper page is
pixel-identical to the preceding inspected freeze, and the supplement remains
byte-identical.

The reviewer-entry-point refreeze at `8242720` aligned the LNCS keywords with
the game-agent reviewer pool, made the deployed-default exclusion explicit in
the abstract, and stated the large family-consistent avoided-loss result more
directly in the conclusion. LNCS pages 1, 2, and 14 and SCITEPRESS page 9 were
rendered at full resolution and inspected; every other page is pixel-identical
to the preceding inspected freeze. The conclusion remains wholly on page 14,
references begin on page 15, and the supplement is byte-identical. Commit
`297d5b8` also added a fourth SCITEPRESS LaTeX pass and a fail-closed regression
test for unsettled cross-references.

The acceptance-criteria refreeze at `419a0f7` tightens the forensic motivation,
states the leakage-resistant evaluation protocol as the principal technical
contribution, and removes the main paper's dependency on a supplement for
interpreting family labels. Two clean Bouchet builds reproduced the PDF hashes
above. Fresh Poppler renders covered all 16 main-paper pages, all five
supplement pages, and all 10 SCITEPRESS pages; the changed contribution and
family-effect pages were also inspected at full resolution.

The claim-preserving terminology refreeze at `77d9335` removes undefined
one-off acronyms, names the championship lower-tail rank as the exact mean of
the five lowest family scores, and expands the confirmatory outcome labels.
It changes no frozen input, result, estimator, citation, abstract, or portal
field. Two clean Bouchet builds were byte-identical. Contact-sheet inspection
covered all 31 pages, and every page affected by reflow was inspected at full
resolution; the 10-page ICAART, 16-page LNCS, and five-page supplement layouts
remain clean.

Commit `0f3e690` adds a deterministic plain-text ICAART metadata exporter and
does not change manuscript content or PDF bytes. Its output expands every
result macro, contains no residual LaTeX, records the exact 195-word abstract,
and has SHA-256
`b6c79cacfc78289ccface7d0793d46c6c6317451e3f9cdc0b0984731fba2ea47`.

The claim audit confirmed that the paper:

- leads with champion-versus-frozen-reference improvement, not absolute
  superiority or a comparison with the deployed StrongBot default, and
  explains why the map-profile-enabled default is outside the prespecified
  coordinate-free comparison;
- reports the failed one-sided absolute-strength gate in the abstract,
  introduction, results, and conclusion, and explicitly reports failure of the
  joint two-gate criterion at each reader entry point;
- labels optimizer, component, and terminal analyses post-confirmatory;
- states the one-opponent, one-matchup, Temperate-only, high-draw,
  endpoint-only, and no-standard-configurator limitations; and
- does not claim a new environment, new general optimizer, causal component,
  broad generalization, reliable Supalosa superiority, or paradigm shift.

## Clean export and reviewer artifact

A committed submission revision at `77d93359242756f07afba30d88fb2db8fd97e7b2`
and the portable-artifact repair at
`d53f822144bd0b3fffe3b4d778770091f77900b8` passed ten paper-generator and
manuscript-invariant tests, nine SCITEPRESS tests, two artifact-builder tests,
the three frozen family-exporter tests, one author-verification-packet test,
one venue-ruling-template test, and one external-review-response-template test
(27 tests total). They regenerated all paper
fragments without byte drift.

The deterministic anonymous review archive has SHA-256
`7d385367857dd0486fb66696783331296c1eb59099f541f89a4cbcfd81f99eb3`
and size 95,193 bytes. Two independent builds produced that same hash. The
archive contains 59 manifested immutable files, normalized `0/0` ownership and
epoch timestamps, no Git tree, no bot packages, and no direct author,
scheduler-account, institution, or private-path token. It now contains both the
LNCS/SCAG sources and the exact SCITEPRESS/ICAART candidate, including the four
official vendored template files. Its reviewer-facing README and third-party
boundary report the exact eight sanitized JSON inputs, and regression tests
enforce that count. A package-local verifier checks every manifested file and
rejects missing, changed, or unexpected immutable files.

A fresh extraction on an independent macOS machine used Python 3.12.13, GNU
Make 3.81, and TeX Live 2022 rather than Bouchet's Python 3.9 and TeX Live 2024.
The manifest verified both before and after deterministic regeneration, all 19
packaged manuscript tests passed, and the Git-free build produced the expected
16-page Letter LNCS paper, five-page Letter supplement, and 10-page A4
SCITEPRESS candidate. The local-toolchain PDF identities were respectively
`777b1d05447ac00a63633e3be1e8ff12be5b80d632bd4befd5262ce8469def9c`,
`82e54a6266bdc211530d6cde92443c6707f78e975dbdd77cc1a4c6b2db8cc20b`,
and `9531e3fe2266487e173855ef119162b5c8e4b2ecca25c0d49e3b6be6ddd8e8bd`.
PDF bytes legitimately differ across TeX distributions, while all immutable
sources and generated fragments remain manifest-bound. All fonts were embedded;
the final logs contained no overfull box, unresolved reference/citation, rerun,
or multiply-defined-label warning. Contact-sheet inspection covered all 31
pages, and every SCITEPRESS page was additionally inspected at full resolution.

The inspected PDFs have empty Author, Title, Subject, and Keywords metadata;
contain no identifying binary strings, JavaScript, forms, or encryption; and
embed every font with a Unicode map. Their 612-by-792-point Letter media size
matches the documentation PDF shipped in Springer's current official LNCS
LaTeX package, so it is not a local geometry override. Archive members use
numeric owner/group `0/0`, blank owner names, epoch timestamps, and fixed file
modes.

## Remaining submission gates

1. Resolve permission and licensing for any public release of the combined bot;
   the aggregate reviewer artifact deliberately excludes it.
2. Resolve double-blind exposure from the named public repository before
   submission.
3. Obtain written confirmation that the primary venue permits remote
   presentation.
4. Obtain a written venue ruling on the documented beyond-copy-editing AI use,
   and complete the human evidence, citation, code, and line-by-line manuscript
   verification recorded in `AUTHORSHIP_AND_AI_POLICY.md`.
5. If ICAART is selected, obtain its exact review-artifact attachment or
   anonymous-link instruction; do not assume SCAG's 10 MB supplementary field
   exists in PRIMORIS.
6. Repeat this QA after the final reviewer edits and before uploading the
   submission PDF.
