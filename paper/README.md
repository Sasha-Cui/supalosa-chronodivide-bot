# Paper source

This directory contains the double-blind Springer LNCS manuscript retained for
the EvoApplications 2027 Soft Computing Applied to Games secondary route. The
separate `paper_scitepress/` tree is the exact ICAART candidate. The empirical
program is frozen; no manuscript edit authorizes new outcome-bearing games.

## Build

With TeX Live 2024 available on `PATH`:

```bash
cd paper
make check
make all
```

The PDFs are written to `paper/build/main.pdf` and
`paper/build/supplement.pdf`. Generated TeX fragments are committed under
`paper/generated/` and must be rebuilt with `make assets`; their manifest binds
every input and output SHA-256. `make check-generated` fails when the committed
fragments do not match the frozen artifacts.

The submission version is anonymous. Author names, affiliations,
acknowledgements, non-anonymous artifact URLs, and funding details should be
added only to the camera-ready source. The current paper must fit the 14-page
main-text limit excluding references and acknowledgements.
