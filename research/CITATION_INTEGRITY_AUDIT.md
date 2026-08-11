# Citation integrity audit

Verified: **2026-08-11**

## Scope and candidate identity

This is a resolution and metadata precheck for the bibliography used by:

- reviewed submission source:
  `ccc0c101de207a7100fd553e15efc4fa18108a35`;
- ICAART PDF SHA-256:
  `98500e11d7ccaa6d1c0f88f2e741b499737124cdac1565190379029bc82c4c07`.

It verifies structural citation coverage, DOI registration, endpoint
availability, and agreement of titles and publication years. It does **not**
verify that the manuscript's propositions follow from the papers, that every
author/page/venue field is perfect, or that a source has been read. Those
remain human-author responsibilities under
`HUMAN_AUTHOR_VERIFICATION_PACKET.md`.

The separate `SUBSTANTIVE_CITATION_AUDIT.md` records the later
proposition-level precheck and the source-placement correction that produced
the current candidate. Neither audit replaces the author's source reading.

## Structural checks

- `paper/references.bib` contains exactly 33 entries with distinct keys.
- The shared manuscript sources cite all 33 keys.
- No cited key is missing from the bibliography.
- No bibliography entry is uncited.
- The generated ICAART paper has a settled reference list and no unresolved
  citation marker.

## DOI-backed sources

Twenty-six entries have registered DOIs. Title and publication year returned by
DOI content negotiation, the Crossref metadata API, or the official publisher
record agree with the BibTeX entry.

| BibTeX key | DOI | Metadata result |
| --- | --- | --- |
| `fernandezAres2011optimizing` | [10.1007/978-3-642-21498-1_41](https://doi.org/10.1007/978-3-642-21498-1_41) | registered; title/year match |
| `mora2012noisy` | [10.1007/s11390-012-1281-5](https://doi.org/10.1007/s11390-012-1281-5) | registered; title/year match |
| `young2012goal` | [10.1609/aiide.v8i1.12503](https://doi.org/10.1609/aiide.v8i1.12503) | registered; title/year match |
| `othman2012starcraft` | [10.1109/CIG.2012.6374182](https://doi.org/10.1109/CIG.2012.6374182) | registered; title/year match |
| `liu2016microbehaviors` | [10.1109/TCIAIG.2016.2544844](https://doi.org/10.1109/TCIAIG.2016.2544844) | registered; title/year match |
| `ouessai2022evolving` | [10.1016/j.entcom.2022.100493](https://doi.org/10.1016/j.entcom.2022.100493) | official publisher record; title/authors/year/volume/article number match |
| `fernandezAres2012map` | [10.1109/CIG.2012.6374185](https://doi.org/10.1109/CIG.2012.6374185) | registered; title/year match |
| `marino2021programmatic` | [10.1609/aaai.v35i1.16114](https://doi.org/10.1609/aaai.v35i1.16114) | registered; title/year match |
| `medeiros2022sketches` | [10.1609/aaai.v36i7.20744](https://doi.org/10.1609/aaai.v36i7.20744) | registered; title/year match |
| `aleixo2023bilevel` | [10.1609/aaai.v37i4.25626](https://doi.org/10.1609/aaai.v37i4.25626) | registered; title/year match |
| `moraes2023opponents` | [10.24963/ijcai.2023/539](https://doi.org/10.24963/ijcai.2023/539) | official IJCAI record; title/year/pages match |
| `moraes2024semantic` | [10.24963/ijcai.2024/662](https://doi.org/10.24963/ijcai.2024/662) | official IJCAI record; title/year/pages match |
| `hutter2011smac` | [10.1007/978-3-642-25566-3_40](https://doi.org/10.1007/978-3-642-25566-3_40) | registered; title/year match |
| `lopezIbanez2016irace` | [10.1016/j.orp.2016.09.002](https://doi.org/10.1016/j.orp.2016.09.002) | registered; title/year match |
| `lucas2018ntbea` | [10.1109/CEC.2018.8477869](https://doi.org/10.1109/CEC.2018.8477869) | registered; title/year match |
| `lucas2019model` | [10.48550/arXiv.1901.00723](https://doi.org/10.48550/arXiv.1901.00723) | registered; title/year match |
| `eggensperger2019pitfalls` | [10.1613/jair.1.11420](https://doi.org/10.1613/jair.1.11420) | registered; title/year match |
| `balla2020generalisation` | [10.1109/CoG47356.2020.9231530](https://doi.org/10.1109/CoG47356.2020.9231530) | registered; title/year match |
| `machado2018ale` | [10.1613/jair.5699](https://doi.org/10.1613/jair.5699) | registered; title/year match |
| `henderson2018matters` | [10.1609/aaai.v32i1.11694](https://doi.org/10.1609/aaai.v32i1.11694) | registered; title/year match |
| `ontanon2018microrts` | [10.1609/aimag.v39i1.2777](https://doi.org/10.1609/aimag.v39i1.2777) | registered; title/year match |
| `vinyals2017sc2le` | [10.48550/arXiv.1708.04782](https://doi.org/10.48550/arXiv.1708.04782) | registered; title/year match |
| `samvelyan2019smac` | [10.48550/arXiv.1902.04043](https://doi.org/10.48550/arXiv.1902.04043) | registered; title/year match |
| `schruben2011crn` | [10.1002/9780470400531.eorms0166](https://doi.org/10.1002/9780470400531.eorms0166) | registered; title/year match |
| `castejon2026tales` | [10.1007/978-3-032-23607-4_33](https://doi.org/10.1007/978-3-032-23607-4_33) | official Springer contents confirm title, authors, year, volume, and pages |
| `elimam2026maco` | [10.5220/0014358500004052](https://doi.org/10.5220/0014358500004052) | registered; title/year match |

Transient HTTP 429 responses from the public DOI content-negotiation endpoint
were treated as rate limits, not missing registrations; those entries were
rechecked through Crossref or the publisher rather than marked valid from a
failed request.

## Authoritative non-DOI sources

All seven non-DOI endpoints returned HTTP 200 at the pinned path.

| BibTeX key | Authoritative endpoint | Resolution result |
| --- | --- | --- |
| `li2018hyperband` | [JMLR article](https://www.jmlr.org/papers/v18/16-558.html) | resolves; title/year path matches |
| `cobbe2019coinrun` | [PMLR article](https://proceedings.mlr.press/v97/cobbe19a.html) | resolves; title/year path matches |
| `cobbe2020procgen` | [PMLR article](https://proceedings.mlr.press/v119/cobbe20a.html) | resolves; title/year path matches |
| `agarwal2021precipice` | [NeurIPS proceedings](https://proceedings.neurips.cc/paper/2021/hash/f514cec81cb148559cf475e7426eed5e-Abstract.html) | resolves; title/year path matches |
| `chronodivide2026` | [Chrono Divide](https://chronodivide.com/) | resolves |
| `chronodivideGameApi2026` | [npm version 0.75.0](https://www.npmjs.com/package/@chronodivide/game-api/v/0.75.0) | pinned version path resolves |
| `supalosa2026bot` | [pinned Supalosa revision](https://github.com/Supalosa/supalosa-chronodivide-bot/tree/165b77a71d0cf5ebd27c65b19d0486bcbae78d0f) | pinned commit path resolves |

## Disposition

No broken key, missing citation, uncited entry, unregistered DOI, dead URL, or
title/year mismatch was found. The 2026-08-11 closest-work refresh added the
two IJCAI records and the Entertainment Computing record above; no further
bibliography or manuscript edit is justified by this metadata audit.

Before submission, the human author must still:

1. open and read every cited source;
2. verify the exact proposition, author list, venue, volume, issue, and page
   range against the primary source;
3. record the pages or sections consulted in the private verification packet;
4. correct or remove any citation whose substantive use is not supported; and
5. repeat the structural and rendered-PDF checks after any correction.
