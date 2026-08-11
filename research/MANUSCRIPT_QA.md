# Manuscript QA record

Last updated: **2026-08-11**

## Frozen manuscript

- Source commit: `d545418104b2fb4953e25a5f2654cdc5fe2985e8`
- Main source: `paper/main.tex`
- Supplement source: `paper/supplement.tex`
- Target format: Springer LNCS, anonymous submission
- Main PDF: 16 pages total; non-reference content ends on page 14
- Supplement PDF: 5 pages
- Main PDF SHA-256: `789aa1cede3e3c9eb41dbb64bf1ddb0010a64f64621c1e0d6920eabb2d0479ee`
- Supplement PDF SHA-256: `49753e464cbd11e422fbd067886be316ef72a874a814f53d825dd6a3ef3ac13c`

The PDFs are build products and are not committed. Their hashes identify the
exact artifacts inspected during this QA pass.

## Automated checks

The following completed successfully under
`texlive/20240312-GCC-13.3.0` on Bouchet:

```text
make check main supplement
python3 -m unittest paper.tests.test_generate_assets -v
python3 -m unittest research.tests.test_export_confirmatory_family_diagnostics -v
python3 -m unittest artifact.tests.test_build_anonymous_artifact -v
```

The final logs contain:

- zero overfull boxes;
- zero undefined or multiply defined references;
- zero BibTeX warnings;
- 25 citation keys, 25 bibliography entries, no missing keys, and no unused
  entries; and
- deterministic regenerated paper fragments whose input and output hashes are
  recorded in `paper/generated/asset_manifest.json` for all eight frozen
  aggregate inputs.

The only final-log warning is the template/toolchain-level `amsmath` notice
that it cannot redefine the `\\vec` accent; it does not affect output.

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
checks covered title-page anonymity, text and background
contrast, margins, line wrapping, tables, plot labels, captions, page numbers,
bibliography links, and section transitions. The final source contains no
author NetID, institution name, literal Slurm account, personal repository URL,
or private absolute path.

The claim audit confirmed that the paper:

- leads with champion-versus-frozen-reference improvement, not absolute
  superiority or a comparison with the deployed StrongBot default;
- reports the failed one-sided absolute-strength gate in the abstract,
  introduction, results, and conclusion;
- labels optimizer, component, and terminal analyses post-confirmatory;
- states the one-opponent, one-matchup, Temperate-only, high-draw,
  endpoint-only, and no-standard-configurator limitations; and
- does not claim a new environment, new general optimizer, causal component,
  broad generalization, reliable Supalosa superiority, or paradigm shift.

## Clean export and reviewer artifact

A committed main revision at `d545418` passed nine paper-generator and
manuscript-invariant tests, two
artifact-builder tests, and the three frozen family-exporter tests. It
regenerated all paper fragments without byte drift.

The deterministic anonymous review archive has SHA-256
`f2e8b44e8eba0ffc96c2854307c037b17631a0cf4e2036bd15a3a026b9831d86`
and size 64,986 bytes.
Two independent builds produced that same hash. The archive contains 36
manifested files, normalized `0/0` ownership and epoch timestamps, no Git tree,
no bot packages, and no direct author, scheduler-account, institution, or
private-path token. An extracted copy passed its manifest and generator tests
and compiled the expected 16-page paper and five-page supplement with no
undefined references, overflow, or BibTeX warning; its only final-log warning
was the same harmless `amsmath` accent notice.

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
5. Repeat this QA after the final reviewer edits and before uploading the
   submission PDF.
