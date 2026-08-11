# Manuscript QA record

Last updated: **2026-08-11**

## Frozen manuscript

- Source commit: `f8b4feaccf4f1b087787f2931e057d6b4c30e4e2`
- Main source: `paper/main.tex`
- Supplement source: `paper/supplement.tex`
- Target format: Springer LNCS, anonymous submission
- Main PDF: 16 pages total; non-reference content ends on page 14
- Supplement PDF: 5 pages
- Main PDF SHA-256: `b69f3a669456d693c0d351dc142fd0d57fd615c2084039dcd166fd392a02205f`
- Supplement PDF SHA-256: `9b4810f79e0869759f80007bb468ba53095d7819d47f0882e9d38d4facf19e9e`

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
21-page pass. The checks covered title-page anonymity, text and background
contrast, margins, line wrapping, tables, plot labels, captions, page numbers,
bibliography links, and section transitions. The final source contains no
author NetID, institution name, literal Slurm account, personal repository URL,
or private absolute path.

The claim audit confirmed that the paper:

- leads with champion-versus-default improvement, not absolute superiority;
- reports the failed one-sided absolute-strength gate in the abstract,
  introduction, results, and conclusion;
- labels optimizer, component, and terminal analyses post-confirmatory;
- states the one-opponent, one-matchup, Temperate-only, high-draw,
  endpoint-only, and no-standard-configurator limitations; and
- does not claim a new environment, new general optimizer, causal component,
  broad generalization, reliable Supalosa superiority, or paradigm shift.

## Clean export and reviewer artifact

A committed main revision at `f8b4fea` passed five paper-generator tests, two
artifact-builder tests, and the three frozen family-exporter tests. It
regenerated all paper fragments without byte drift.

The deterministic anonymous review archive has SHA-256
`0d57486641d76303ecc96cdb10ce84534b19672c9fe01d52d2bc51cce9bb6315`
and size 62,206 bytes.
Two independent builds produced that same hash. The archive contains 36
manifested files, normalized `0/0` ownership and epoch timestamps, no Git tree,
no bot packages, and no direct author, scheduler-account, institution, or
private-path token. An extracted copy passed its manifest and generator tests
and compiled the expected 16-page paper and five-page supplement with no
undefined references, overflow, or BibTeX warning; its only final-log warning
was the same harmless `amsmath` accent notice.

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
