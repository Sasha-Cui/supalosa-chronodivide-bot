# SCITEPRESS final-candidate QA record

Prepared: **2026-08-30**

## Frozen candidate

- Title: **StrongBot: Auditable Map-Profiled RTS Agent Development in Chrono Divide**.
- Reviewed source commit: `aebbf4e56c9c31728e5c480d6915bf0bba64d269`.
- Final evidence artifact SHA-256:
  `0670bdeefab47ca68fb5fc584be6a299e777ee0d69f04cd45de7caebf32c31e3`.
- PDF: 12 A4 pages; 1,357,220 bytes.
- PDF SHA-256:
  `345b6bfc2b07f0f5ce18f2f0ae3816d76f58999494db90fbfb61e0c6af25abb4`.
- Portal metadata SHA-256:
  `ec0c2877d3921978e4d460c41ada94fe2a774d60d5a22ad8946eea728bb3fd8d`.
- Expanded abstract: 190 words.
- Poppler 25 extracted length: 35,543 non-whitespace characters.
- Fonts: seven, all embedded with Unicode maps.

The PDF is a deterministic build product and is not tracked in Git. These hashes
identify the exact production and clean-room files inspected for this record.

## Automated checks

Under TeX Live 2024 and Poppler 25.07.0:

```text
python3 -m unittest \
  research.tests.test_final_paper_evidence \
  artifact.tests.test_build_anonymous_artifact \
  paper_scitepress.tests.test_fallback_manuscript -v
make -C paper_scitepress submission-check
```

passed. The checks enforce:

- the immutable final evidence hash and all primary HFO, Peak, mechanism,
  Advanced, and frame values;
- a 70--200-word abstract and exact portal metadata;
- 12 A4 pages and the exact Poppler character count;
- empty identifying PDF metadata, no forms, JavaScript, encryption, or page
  rotation;
- embedded fonts with Unicode maps;
- no overfull box, unresolved citation/reference, or rerun warning;
- exact generated-asset bytes and official template hashes;
- inclusion of every registered frame exactly once; and
- absence of identifying tokens across all current sections, bibliography,
  abstract, main source, and review README.

## Visual QA

All 12 pages were rendered and inspected after the final scientific rewrite.
The final pass checked the enlarged 2-by-3 Peak panel, the combined 3-by-3 HFO
tactics/limitation panel, policy pseudocode, all five tables, the uncertainty
plot, the AI disclosure, conclusion, and complete bibliography. No text or
figure is clipped, invisible, overlapped, or outside the page. The final
anonymity edit changed only the allocation wording and retained the inspected
12-page layout.

## Claim and anonymity boundary

The paper supports reliable superiority over pinned Supalosa on balanced HFO
(633/24/63) and replicated Peak (134/14/32 versus 92/16/72 control). It also
supports three scoped HFO mechanisms and reports the negative RA2Web Advanced
transfer. It does not claim a new environment, optimizer novelty, universal
dominance, or general map/opponent robustness.

The visible review source contains `Anonymous Author(s)`, an identity-neutral
AI-use disclosure, and no affiliation, email, private path, scheduler
allocation, or author-owned repository URL. Venue instructions for the AI
disclosure field and reviewer-artifact upload remain human pre-submission
checks.
