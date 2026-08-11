# Manuscript QA record

Last updated: **2026-08-11**

## Frozen manuscript

- Source commit: `81e87e2291a6a8d2179cbda9c811e0993f758d9e`
- Main source: `paper/main.tex`
- Supplement source: `paper/supplement.tex`
- Target format: Springer LNCS, anonymous submission
- Main PDF: 16 pages total; non-reference content ends on page 14
- Supplement PDF: 5 pages
- Main PDF SHA-256: `c4368889093e4bf173d59963cce43c0bb8e23bbb148530c972f4ef3232e44038`
- Supplement PDF SHA-256: `09a5cc77cc905e8df192c3d5468c7b5bfb71b2cbcd650070574793cca3946b2c`

The PDFs are build products and are not committed. Their hashes identify the
exact artifacts inspected during this QA pass.

## Automated checks

The following completed successfully under
`texlive/20240312-GCC-13.3.0` on Bouchet:

```text
make check main supplement
python3 -m unittest paper.tests.test_generate_assets -v
python3 -m unittest research.tests.test_export_confirmatory_family_diagnostics -v
```

The final logs contain:

- zero overfull boxes;
- zero undefined or multiply defined references;
- zero BibTeX warnings;
- 21 citation keys, 21 bibliography entries, no missing keys, and no unused
  entries; and
- deterministic regenerated paper fragments whose input and output hashes are
  recorded in `paper/generated/asset_manifest.json`.

## Visual and content checks

All 16 main-paper pages and all five supplement pages were rendered with
Poppler and visually inspected. The pass checked title-page anonymity, text and
background contrast, margins, line wrapping, tables, plot labels, captions,
page numbers, bibliography links, and section transitions. The final source
contains no author NetID, institution name, literal Slurm account, personal
repository URL, or private absolute path.

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

A `git archive` export of committed main revision `3c5af39` passed five paper
generator tests, two artifact-builder tests, and the three frozen
family-exporter tests. It regenerated all paper fragments without byte drift.

The deterministic anonymous review archive has SHA-256
`0c8fff25c274abbddbd4ed92ecd04979bfc1c323b346173168bc3116e1bf16c3`.
Two independent builds produced that same hash. The archive contains 35
manifested files, normalized `0/0` ownership and epoch timestamps, no Git tree,
no bot packages, and no direct author, scheduler-account, institution, or
private-path token. An extracted copy passed its manifest and generator tests
and compiled the expected 16-page paper and five-page supplement with no LaTeX
or BibTeX warning.

## Remaining submission gates

1. Resolve permission and licensing for any public release of the combined bot;
   the aggregate reviewer artifact deliberately excludes it.
2. Resolve double-blind exposure from the named public repository before
   submission.
3. Obtain written confirmation that the primary venue permits remote
   presentation.
4. Repeat this QA after the final reviewer edits and before uploading the
   submission PDF.
