# SCITEPRESS submission-candidate manuscript

This directory is the separate, anonymous SCITEPRESS-format candidate for the
frozen Chrono Divide study. It reuses the authoritative section sources,
generated result macros, and bibliography under `../paper/`; it does not fork
the empirical record or authorize new outcome-bearing analysis.

Build from the repository root with:

```bash
make -C paper_scitepress check
```

Before freezing a review submission, put Poppler 25.x's `pdfinfo`, `pdftotext`,
and `pdffonts` on `PATH` and run the deeper candidate check:

```bash
make -C paper_scitepress submission-check
```

That target checks the frozen 11-page and 38,261-non-whitespace-character
identity as well as A4 geometry, empty author/title metadata, encryption,
forms, JavaScript, page rotation, embedded fonts with Unicode maps, the
70--200-word abstract rule, PDF-to-portal title/abstract/keyword agreement,
and SHA-256 binding of the portal metadata to its source files. It requires
Poppler's `pdfinfo`, `pdftotext`, and `pdffonts`; the ordinary reproducibility
build remains available through `make check` without those tools.

The build uses a fixed `SOURCE_DATE_EPOCH` established at the comparator-
justified manuscript freeze `cb891b47c9bb5ad3ac75c2d67b59865d56a7e1d1`.
That value is a reproducibility constant, not the current source identity;
`research/SCITEPRESS_QA.md` records the inspected source commit and PDF hash.
A clean build should produce the same PDF bytes under the pinned TeX Live 2024
toolchain.

`make check` also writes `build/submission_metadata.json`. This is the exact
plain-text title, expanded abstract, keywords, area, and ordered topic list for
the submission form, with source hashes and the abstract word count. Regenerate
it from the reviewed source instead of copying LaTeX commands or improvising a
stronger portal summary.

## Official template provenance

The four unmodified files in `vendor/` came from the official conference
LaTeX archive at
<https://www.scitepress.org/documents/SCITEPRESS_Conference_Latex.zip>,
downloaded on 2026-08-11. The archive SHA-256 was
`ec6cfaa11962e08d5c6a402124f21c3bca3591397521406ab6d1889398a3807a`.
`VENDOR_SHA256SUMS` records the individual file hashes.

The review PDF deliberately contains `Anonymous Author(s)` and no affiliation,
email, acknowledgment, repository URL, or AI-use disclosure. ICAART's current
guidelines require AI disclosure while also requiring acknowledgments to be
removed for double-blind review. Do not submit this candidate until the
secretariat gives written instructions for the disclosure location and the
reviewer-artifact delivery route.
