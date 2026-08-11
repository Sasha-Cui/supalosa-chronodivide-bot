# Manuscript QA record

Last updated: **2026-08-11**

## Frozen manuscript

- Source commit: `ccc0c101de207a7100fd553e15efc4fa18108a35`
- Manuscript-content refreeze: `504cc2a7f1844183e2d87d0af09e1f697d3acfca`
- Reviewer-artifact page-contract fix: `853e2ffb3693287ee0572b7b8c659befa5f9763d`
- Main source: `paper/main.tex`
- Supplement source: `paper/supplement.tex`
- Target format: Springer LNCS, anonymous submission
- Main PDF: 18 pages total; non-reference content ends on page 15
- Supplement PDF: 5 pages
- Main PDF SHA-256: `efcc9856799493fdb93b29f58ad895abee7b0822d075297433f273507a25aaa3`
- Supplement PDF SHA-256: `7674eb4190f422d66da9b7a9e50d464abc0c33894fbbedf85da6cb7a5d302d56`

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
- 33 citation keys, 33 bibliography entries, no missing keys, and no unused
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

A proposition-level precheck mapped all 33 bibliography keys across 41
key-by-citation placements to primary-source locators. It found one attribution
boundary: the Chrono Divide homepage supports the reconstruction claim but not
the exact offline API or pinned opponent. The refreeze added the package and
repository citations to both environment-description groups and, after a fresh
close-work search, added Mariño et al.'s map-specific program-synthesis
precedent, then added the closest located automatic RTS action-preselection
configuration precedent and its map--opponent-specific boundary. Empirical
claims and the supplement did not change; see
`SUBSTANTIVE_CITATION_AUDIT.md`.

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

At that historical freeze, the final ICAART game-testbed citation and bibliography compaction received a
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
result macro, contains no residual LaTeX, records the exact 193-word abstract,
and has SHA-256
`2581e6ae5e00454919c9ddf6b6cea7721935117234bc675b7d19162a799db834`.

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

A committed submission revision at `504cc2a7f1844183e2d87d0af09e1f697d3acfca`,
the portable-artifact repair at
`d53f822144bd0b3fffe3b4d778770091f77900b8`, and the package-contract fix at
`853e2ffb3693287ee0572b7b8c659befa5f9763d` passed ten paper-generator and
manuscript-invariant tests, twelve SCITEPRESS tests, two artifact-builder tests,
the three frozen family-exporter tests, one author-verification-packet test,
one venue-ruling-template test, one external-review-response-template test,
and one substantive-citation-audit test (31 tests total). They regenerated all paper
fragments without byte drift.

The final repository-wide verification runs all 141 tests: 115 research tests,
11 paper tests, 12 SCITEPRESS tests, and three artifact tests.

The deterministic anonymous review archive has SHA-256
`74c038f20daf4cae2c95c1fc930ebc862304eda52442afda724a2f83f1fa7fb0`
and size 102,615 bytes. Two independent builds produced that same hash. The
archive contains 60 manifested immutable files, normalized `0/0` ownership and
epoch timestamps, no Git tree, no bot packages, and no direct author,
scheduler-account, institution, or private-path token. It now contains both the
LNCS/SCAG sources and the exact SCITEPRESS/ICAART candidate, including the four
official vendored template files. Its reviewer-facing README and third-party
boundary report the exact eight sanitized JSON inputs, and regression tests
enforce that count. A package-local verifier checks every manifested file and
rejects missing, changed, or unexpected immutable files.

The archive denylist now also treats the institutional cluster name as an
identity token. The two copied build READMEs use toolchain-neutral language,
and a regression test scans the full package rather than only manuscript TeX.
This closes a source-artifact anonymity leak without changing either PDF.

A fresh extraction on an independent macOS machine used Python 3.12.13, GNU
Make 3.81, and TeX Live 2022 rather than Bouchet's Python 3.9 and TeX Live 2024.
The manifest verified both before and after deterministic regeneration, all 22
packaged manuscript tests passed, and the Git-free build produced the expected
18-page Letter LNCS paper, five-page Letter supplement, and 11-page A4
SCITEPRESS candidate. The local-toolchain PDF identities were respectively
`47c379cd3687ac0540fca88029cfe05e6b5fe20f5a73ec08aa91eaf2c3b9a8e4`,
`f78a88d16e217aef0a18f0948d3148055ccb2514ae6935cc00832935ffa75f2e`,
and `2037e3ed5626360dfd09cda2790547cfdf4fe27c7d8d2052e23c51e881f7e2a4`.
PDF bytes legitimately differ across TeX distributions, while all immutable
sources and generated fragments remain manifest-bound. All fonts were embedded;
the final logs contained no overfull box, unresolved reference/citation, rerun,
or multiply-defined-label warning. Contact-sheet inspection covered all 34
pages; the changed title, threat-to-control table, reflowed transitions, and
complete final reference pages were additionally inspected at full resolution.

The production candidate additionally passed the new Poppler-backed
`submission-check`: exactly 11 A4 pages, 39,210 non-whitespace characters under
the documented default reading order, 193 abstract words, empty review
identity metadata, no forms/JavaScript/encryption/rotation, nine embedded fonts
with Unicode maps, exact PDF-to-portal title/abstract/keyword agreement, and
SHA-256 agreement between the metadata JSON and its three source files. The
same deep check passed the independent macOS build. After the citation-source
correction and close-work addition, a fresh 27-page render confirmed clean current ICAART and LNCS
layouts; the five-page supplement retained its byte-identical previously
inspected hash.

A second Git-free extraction reproduced the exact current archive on Bouchet
using Python 3.12.3 and TeX Live 2024. The manifest verified all 60 immutable
files before and after regeneration, all 23 packaged tests passed, and the
three rebuilt PDFs were byte-identical to the production hashes above. The
11-page submission check again passed at 39,210 characters and nine embedded
fonts. All 34 rebuilt pages were rendered and inspected without a layout or
readability defect. The command transcript, environment, identities, and
scope boundary are frozen in `ARTIFACT_CLEANROOM_REPRODUCTION.md`.

The ignored distribution path can retain an archive built from a transient
source state even when tracked files are clean. The fail-closed pre-upload
command `python3 artifact/scripts/verify_frozen_archive.py` now rebuilds the
package from current source, checks it against `artifact/FROZEN_IDENTITY.json`,
and independently rejects a stale `artifact/dist` file. The mismatched archive
that exposed this gap was preserved under a hash-named untracked evidence path;
the canonical distribution file again matches the frozen identity.

The final close-work refreeze at `e91674f` adds the AAAI 2022 learned-sketch
and AAAI 2023 bilevel-synthesis successors, explicitly disclaims synthesis and
optimizer novelty, and keeps exact software provenance behind concise link
labels. The ICAART bibliography retains its 9-point text and removes only the
inter-entry gap; `abf5e94` binds the resulting 36,949-character candidate in
the fail-closed submission check. Fresh contact-sheet inspection covered all
17 LNCS and all 10 ICAART pages at the production hashes; related-work pages
and both complete reference lists were also inspected at full resolution. A
second TeX Live 2022 pass confirmed the same 10-page ICAART fit, including its
related-work and reference pages. No clipping, overlap, broken link label,
margin violation, or unreadable text was found. The five-page supplement is
byte-identical to the previously inspected freeze.

The acceptance-oriented refreeze at `bc0e609` retitled the paper around its
actual leakage-resistant evaluation contribution, aligns both abstracts with
that framing, and adds a full-width threat-to-control map that makes the
prespecified safeguards auditable at reviewer reading speed. It changes no
frozen empirical input, result, estimator, uncertainty interval, or claim
boundary. Two clean production builds reproduced the 18-page LNCS, five-page
supplement, and 11-page ICAART hashes recorded above. A separate TeX Live 2022
artifact build produced the three cross-toolchain identities recorded above.
Contact sheets covered all 34 pages, and the retitled first pages, both
threat-to-control tables, reflowed transitions, and complete final reference
pages were inspected at full resolution. No clipping, overlap, unreadable
label, contrast defect, broken link, or margin violation was found.

The portable-contribution refreeze at
`504cc2a7f1844183e2d87d0af09e1f697d3acfca` makes the transferable result
explicit in both abstracts and the conclusion: the reusable object is an
evidence contract covering instance lineage, random-stream ownership, start
balance, comparator isolation, and retry semantics. It also changes the
threat-to-control table to ragged-right columns and balances the final
SCITEPRESS reference page. The follow-up package-only fix at
`853e2ffb3693287ee0572b7b8c659befa5f9763d` corrects the reviewer README's
LNCS content-page contract from 14 to 15 and adds a regression assertion. No
frozen input, estimate, interval, gate, diagnostic, citation, or scope boundary
changed.

Two clean TeX Live 2024 production builds were byte-identical at the hashes
above. A Git-free TeX Live 2022 extraction produced local PDF identities
`47c379cd3687ac0540fca88029cfe05e6b5fe20f5a73ec08aa91eaf2c3b9a8e4`,
`f78a88d16e217aef0a18f0948d3148055ccb2514ae6935cc00832935ffa75f2e`,
and `2037e3ed5626360dfd09cda2790547cfdf4fe27c7d8d2052e23c51e881f7e2a4`
for the LNCS paper, supplement, and SCITEPRESS paper respectively. At that
portable-contribution freeze, both toolchains passed the 11-page,
38,760-character, nine-font anonymous-submission check. All 34 production pages were rendered; every changed page and both
complete reference endings were inspected at full resolution with no clipping,
overlap, contrast defect, missing glyph, or margin violation.

The inspected PDFs have empty Author, Title, Subject, and Keywords metadata;
contain no identifying binary strings, JavaScript, forms, or encryption; and
embed every font with a Unicode map. Their 612-by-792-point Letter media size
matches the documentation PDF shipped in Springer's current official LNCS
LaTeX package, so it is not a local geometry override. Archive members use
numeric owner/group `0/0`, blank owner names, epoch timestamps, and fixed file
modes.

The closest-work refreeze at
`5ed5dad47e9b2902385f4ee873da5c3fb9683bbd` adds the IJCAI 2023
opponent-set guidance and IJCAI 2024 semantic-space search papers as explicit
programmatic-synthesis prior art. It preserves the paper's no-synthesis and
no-optimizer-novelty boundary and changes no empirical claim. The associated
`ORIGINALITY_AND_NOVELTY_SCREEN.md` records the searched literature and eight
distinctive exact-phrase queries while explicitly declining to treat a public
web search as a similarity certificate. The current LNCS and ICAART hashes are
bound above; the supplement remains byte-identical. All 34 production pages
were rendered at 120 DPI and inspected as contact sheets. LNCS pages 3--4 and
16--18 and ICAART pages 2--3 and 10--11 were additionally inspected at full
resolution. No clipping, overlap, contrast defect, missing glyph, broken link
label, margin violation, or malformed section transition was found.

The automatic-configuration closest-work refreeze at
`92a4c870b6e697682b51fa41fd0f785c97c6b121` adds Ouessai et al.'s 2022
map--opponent-specific action-preselection configuration study and narrows the
positioning without changing the empirical claim, abstract, results, or
conclusion. At that freeze, the TeX Live 2024 production and Git-free clean-room builds
were byte-identical within that freeze; the five-page supplement
and portal metadata remain byte-identical. The exact 102,179-byte, 60-file
archive has SHA-256
`10f270f49d38d2a3d2175f598795fca8d8e7ca57c5736f0971e2462d2ee42d0c`.
All 34 pages were rendered at 120 DPI and inspected as complete contact sheets;
LNCS pages 3--4 and 16--18 and ICAART pages 2--3 and 10--11 were also inspected
at full resolution. No clipping, overlap, contrast defect, missing glyph,
broken link, margin violation, or malformed reference flow was found. The
ICAART deep check at that freeze passed at 11 A4 pages, 39,102 non-whitespace
characters, nine embedded fonts, and anonymous metadata.

The reader-entry-point refreeze at
`e365e37b52dfcea24c3c26f5130b7ac37a9366ac` names the reusable controls as an
evidence contract in both submission abstracts. It changes no empirical input,
estimate, interval, gate, diagnostic, citation, or scope boundary. The current
TeX Live 2024 production and fresh Git-free clean-room builds are byte-identical
at LNCS SHA-256
`7303ab1c2c1f8ea0abfb2abe4d4c56b3111d4b3ccd7e55e714836d6c0ce33f92`,
supplement SHA-256
`7674eb4190f422d66da9b7a9e50d464abc0c33894fbbedf85da6cb7a5d302d56`,
and ICAART SHA-256
`42f5cdb1b08ea8fff04fdefc4898dd336c8556c6cafb57f07e1d2139ed0daf28`.
The 197-word portal metadata has SHA-256
`6eb561c409fad9bb24b362ec9634d8fb00cc4a9ad7a6983ddb82a0cd7033e498`.
Two deterministic artifact builds match at 102,198 bytes and SHA-256
`53e0aed782f6a1c42329c33bac849bc2cad3225982184dc6db7f8ea7d0ca9e3e`.
The fresh extraction verified all 60 files before and after regeneration,
passed all 22 packaged tests, rebuilt all three PDFs, and passed the 11-page,
39,123-character deep check. Contact-sheet inspection covered all 34 pages;
both reflowed first-page transitions were inspected at full resolution with no
clipping, overlap, contrast, glyph, or margin defect.

The joint-admission-rule refreeze at
`4c2d011cacb4a3c98bf203153dd300e2075f142c` defines the evidence contract as
the executable conjunction of the already established controls and states
that a contract violation invalidates a campaign rather than licensing
post-hoc exclusion. It claims neither that any component is new nor that the
contract proves the absence of unknown dependencies. No empirical input,
estimate, interval, gate, diagnostic, citation, abstract field, or scope
boundary changed. The current TeX Live 2024 production and fresh Git-free
clean-room builds are byte-identical at LNCS SHA-256
`0b0a5c55a9cbbc123693524597e520922ce927fcc21001cb5dd79b9004914bf6`,
supplement SHA-256
`7674eb4190f422d66da9b7a9e50d464abc0c33894fbbedf85da6cb7a5d302d56`,
and ICAART SHA-256
`5a7450582b7452a9c568a08247e39cc9e9f0f5e0e1afcc9e9986ec9ef8ca5f21`.
The unchanged 197-word portal metadata has SHA-256
`6eb561c409fad9bb24b362ec9634d8fb00cc4a9ad7a6983ddb82a0cd7033e498`.
Two deterministic 102,706-byte artifact builds match at SHA-256
`39356f3a38ac3ffbb789a7298e23a77f51c949d16d207acd74530133882d4117`.
The fresh extraction verified all 60 files before and after regeneration,
passed all 23 packaged tests, rebuilt all three PDFs, and passed the 11-page,
39,611-character deep check. Contact-sheet inspection covered all 34 pages,
with full-resolution inspection of every reflowed page; no clipping, overlap,
contrast, glyph, table, margin, or reference-flow defect was found.

The acceptance-oriented source pass at `24a612e` states the joint admission
rule directly in the ICAART abstract, leaves seven words of margin below its
200-word ceiling, and sharpens the final relative-gain/non-dominance takeaway.
The page-contract repair at
`ccc0c101de207a7100fd553e15efc4fa18108a35` removes duplicated future-work
prose and makes the documented LNCS boundary true: non-reference content ends
on page 15 and references begin on page 16. Neither commit changes an empirical
input, estimate, interval, gate, diagnostic, citation, or supported population.
The current TeX Live 2024 production and fresh Git-free clean-room builds are
byte-identical at LNCS SHA-256
`efcc9856799493fdb93b29f58ad895abee7b0822d075297433f273507a25aaa3`,
supplement SHA-256
`7674eb4190f422d66da9b7a9e50d464abc0c33894fbbedf85da6cb7a5d302d56`,
and ICAART SHA-256
`98500e11d7ccaa6d1c0f88f2e741b499737124cdac1565190379029bc82c4c07`.
The 193-word portal metadata has SHA-256
`285af4e101ea36d6e5190a3c0ceb5d4a52ded5e56f96210b1295360bb077e4ca`.
Two deterministic 102,615-byte artifact builds match at SHA-256
`74c038f20daf4cae2c95c1fc930ebc862304eda52442afda724a2f83f1fa7fb0`.
The fresh extraction verified all 60 files before and after regeneration,
passed all 23 packaged tests, reproduced all three production PDFs, and passed
the 11-page, 39,210-character, nine-font deep check. Contact-sheet inspection
covered all 34 pages, and all changed pages passed full-resolution inspection.

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
