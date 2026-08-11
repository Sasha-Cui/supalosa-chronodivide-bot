# Research status

Last reconciled: **2026-08-11**

## Bottom line

The core empirical program is complete and the submission-candidate paper is
built, visually checked, committed, and ready for external review. The frozen
method-v2 champion substantially improves a prospectively frozen generic
StrongBot reference across 16 sealed Chrono Divide map families against one
pinned, independently loaded Supalosa bot. The relative effect passes its prespecified confirmatory gate; the
separate claim that the champion reliably beats Supalosa does not, and the
frozen joint two-gate criterion therefore fails.

No Chrono Divide simulation job is active. Do not launch more outcome-bearing
games on the opened family population for this paper.

## Main result

| Method | Games | W/D/L | Score |
| --- | ---: | ---: | ---: |
| Frozen generic StrongBot reference | 256 | 1 / 100 / 155 | 0.19922 |
| Frozen method-v2 champion | 256 | 47 / 180 / 29 | 0.53516 |

The equally family-weighted champion-minus-reference estimate is **0.33594** with
family-clustered standard error **0.05695** and two-sided 95% confidence interval
**[0.21456, 0.45732]**. Fourteen family effects are positive and two are zero.

The champion's absolute score margin above 0.5 is 0.03516, but its prespecified
one-sided 95% lower margin is **-0.02117**. Therefore:

- supported: optimization robustly improves the frozen generic StrongBot
  reference against the pinned Supalosa version on the supported test-family
  population;
- unsupported: the champion reliably beats Supalosa, a new general learning
  algorithm, broad game-AI superiority, or a paradigm shift.

The reference is `DEFAULT_RESEARCH_POLICY`, compiled with built-in map profiles
and exact-map tactics disabled. It is not the fork's map-profile-enabled
deployed constructor default. Frozen machine artifacts retain the historical
method label `default`; current prose calls that method `reference`.

See [`METHOD_V2_CONFIRMATORY_RESULT.md`](METHOD_V2_CONFIRMATORY_RESULT.md) for
the immutable confirmatory ledger.

## Completed empirical path

The finalized path contains **8,704** accepted policy games, all run under
Slurm account `pi_jss233`:

| Stage | Job IDs | Games | Status |
| --- | --- | ---: | --- |
| Five successive-halving optimizer runs | `21655584`--`21655588`; `21749720`, `21749724`--`21749727`; controller `21749797`; `21759850`--`21759854` | 4,680 | Complete, zero accepted technical failures |
| Common-seed championship | `21788958`, `21799790` | 2,112 | Complete; champion frozen |
| Fresh method-v2 development | `21920172`, `21920905`, `21922464` | 440 | Complete; single gate passed |
| Sealed confirmatory evaluation | `21925439` | 512 | Complete; relative pass, absolute fail |
| Common-seed optimizer diagnostic | `21928633` | 480 | Complete; suggestive |
| Policy-component diagnostic | `21938403` | 480 | Complete; suggestive |

The component predecessor array `21938264` failed before its first counted
launch and contributed no game. All failed and superseded attempts remain
preserved. The exact finalizer hashes, shard counts, and claim boundary are in
[`EMPIRICAL_COMPLETION_AUDIT.md`](EMPIRICAL_COMPLETION_AUDIT.md).

Exact scheduler accounting for the accepted path records 562 simulation-shard
allocations, each with one CPU core and 6 GiB requested memory, totaling 288.72
core-hours and no GPU allocation. Peak recorded batch-step RSS was 1.63 GiB.
The sanitized aggregate is hash-pinned in the paper generator; the private
allocation- and step-level `sacct` exports remain outside Git. See
[`COMPUTE_ACCOUNTING.md`](COMPUTE_ACCOUNTING.md).

## Diagnostic interpretation

- The champion exceeds the equal average of five independently selected local
  optimizer policies by 0.08250, but the 95% interval
  [-0.02679, 0.19179] includes zero.
- The champion exceeds the equal average of five single-component reverts by
  0.05750, but the 95% interval [-0.00347, 0.11847] includes zero.
- Reverting the joint infantry+rush strategy group gives the largest observed
  decline (0.33125), but its Bonferroni familywise 95% interval
  [-0.00734, 0.66984] also includes zero.
- Champion and the scouting revert are endpoint-identical in all 80 paired
  games.
- In 76 confirmatory pairs that remain draw-to-draw, the champion ends with
  22.71 more relative combatants and 683.82 fewer relative credits. This is
  consistent with converting banked resources into combat power, but the logs
  contain no within-game trajectory.

See [`METHOD_V2_MECHANISM_ABLATION_RESULT.md`](METHOD_V2_MECHANISM_ABLATION_RESULT.md),
[`METHOD_V2_COMPONENT_ABLATION_RESULT.md`](METHOD_V2_COMPONENT_ABLATION_RESULT.md),
and [`METHOD_V2_TERMINAL_STATE_ANALYSIS.md`](METHOD_V2_TERMINAL_STATE_ANALYSIS.md).

## Manuscript status and remaining work

Commit `92a4c87` is the current reviewed manuscript source. It extends the
earlier `5ed5dad` closest-work freeze with the closest located automatic RTS
action-preselection configuration precedent; the current QA records bind its
originality screen, PDF identities, portal metadata, and anonymous
reviewer-artifact identity.
The manuscript-content refreeze at `504cc2a` builds on the claim-preserving
scientific and citation freeze at `e91674f` and retains the title centered on
leakage-resistant evaluation rather than optimizer novelty,
distinguishes the evaluation protocol from the configuration pipeline in both
abstracts, and adds a threat-to-control map that connects each bias to its
evidence unit. The earlier freeze states two confirmatory research
questions and one explicitly descriptive diagnostic question, removes causal-sounding
mechanism language, and adds primary prior art on hidden-level evaluation and
protocol sensitivity, classifies the search as deterministic mutation-based
finite configuration rather than iterative population-based evolution, and
cites the closest recent SCAG training-mode comparison, reports exact
accepted-path resource use, and derives secondary reported values from frozen
aggregate artifacts without changing any scientific result. It also corrects
the comparator identity from an inaccurate shipped-default description to the
prospectively frozen generic research reference. It now explains that every
candidate shares a coordinate-free policy interface, identifies the deployed
map-profile-enabled constructor as outside that estimand, and states explicitly
that the experiment does not estimate improvement over the deployed default.
It also reports explicitly that the failed absolute gate fails the joint
two-gate criterion, cites the exact pinned game-API package and opponent
revision, cites the recent ICAART MACO game-testbed paper, and uses standard
compact author formatting to avoid an orphan bibliography page. Both LNCS PDFs
remain byte-reproducible. The latest reviewer-entry-point pass also aligns the
LNCS keywords with the game-agent reviewer pool, states the deployed-default
exclusion in the abstract, and makes the large family-consistent avoided-loss
takeaway explicit in the conclusion. Commit `297d5b8` adds the fourth
SCITEPRESS LaTeX pass required for settled cross-references and rejects rerun
warnings prospectively. The latest acceptance-criteria pass also makes the
leakage-resistant evaluation protocol explicit as the contribution, removes
a main-paper dependency on supplement-only label definitions, and positions
the study against map-specific program synthesis. The main PDF is
18 pages with main text ending on page
15 and references continuing
afterward; the supplement is five pages. All reported tables and figures are
generated from hash-pinned aggregate artifacts. The final build has no overfull boxes, undefined
references, missing citations, or BibTeX warnings. All 23 LNCS/supplement pages
and all 11 SCITEPRESS pages have received rendered visual checks. The current PDF SHA-256 values are recorded in
[`MANUSCRIPT_QA.md`](MANUSCRIPT_QA.md).

Commit `77d9335` completes the final machine-assisted prose screen by replacing
undefined one-off acronyms, naming the exact five-family lower-tail ranking
statistic, and expanding the outcome labels. The edit is claim-preserving: all
frozen inputs, estimates, uncertainty, citations, abstract fields, and portal
metadata remain unchanged.

Commit `92a4c87` completes the current proposition-level citation precheck over
all 33 bibliography keys and 41 key-by-citation placements. The source changes cite
the exact game-API package and pinned Supalosa repository alongside the Chrono
Divide project page and add the closest map-specific and later
programmatic-strategy-synthesis precedents, plus the closest located automatic
RTS action-preselection configuration precedent. No empirical result, method,
scope boundary, conclusion, or portal
field changed. Both main-paper formats were re-rendered and
inspected; the supplement remains byte-identical. Human source reading remains
an explicit pre-submission gate.

Commit `0f3e690` adds a deterministic plain-text ICAART portal-metadata export
and tests the same exporter inside the anonymous artifact. It leaves all
manuscript PDF bytes unchanged while replacing the earlier approximate abstract
count with the then-current exact expanded text; the acceptance-oriented
abstract at that freeze had 193 words.

Commit `3c5af39` adds the deterministic anonymous aggregate-artifact builder,
commit `7cdbe0d` hardens its direct-identity denylist, and the current builder
tests enforce the exact eight-input reviewer description. Commit `d53f822`
adds the exact SCITEPRESS candidate, a package-local manifest verifier, and
Git-free build checks. The current 103,324-byte review archive is
byte-deterministic at SHA-256
`39f761b1cb0b9fe587b197be9151e63f0ee1368b883cbf541f2bb86c33ea5437`.
Its 60-file immutable manifest verifies, all artifact tests pass, and an
earlier independent macOS extraction established package portability by passing
22 packaged tests and rebuilding the three manuscript formats without undefined
references, overflow, or BibTeX warnings.

The current artifact received a fresh Git-free reconstruction with Python
3.12.3 and TeX Live 2024. It verified all 60 files before and after regeneration, passed all 23
packaged tests and deep submission check, and reproduced all three production
PDF hashes byte for byte. Its full command and identity record is
[`ARTIFACT_CLEANROOM_REPRODUCTION.md`](ARTIFACT_CLEANROOM_REPRODUCTION.md).
All fonts are embedded and all 34 pages received a rendered layout check.

Commit `bda13e4` adds an evidence-indexed reviewer-response guide covering the
weak-reference boundary, ordinary-tuning objection, one-opponent scope, high
draw rate, post-confirmatory diagnostics, and artifact/release limitations.
It is a preparation aid, not a license to add claims beyond the frozen paper.

The remaining blockers are release- and submission-oriented, not additional
training:

1. obtain permission or a licensing decision from Supalosa before publicly
   redistributing the combined bot, whose upstream package is `UNLICENSED`;
2. obtain ICAART's four written rulings on the exceptional remote procedure,
   prior named repository, blind-review AI disclosure, and reviewer-artifact
   route; retain SCAG only as a topical secondary if its chairs affirm scope,
   remote presentation, repository handling, and AI eligibility;
3. complete the human evidence/citation/code/manuscript verification and apply
   only the selected venue's required disclosure; and
4. obtain a cold read from an independent technical reader, incorporate only
   claim-preserving clarity corrections, and repeat final PDF QA.

The cold-read handoff is operationally complete: `EXTERNAL_REVIEW_PACKET.md`
defines the unprimed/targeted sequence, and
`EXTERNAL_REVIEW_RESPONSE_TEMPLATE.md` is a blank, hash-bound private-copy form
for locking the response, scoring comprehension, and separating feasible
presentation repairs from requests for post-hoc evidence.

ICAART 2027 is now the operational primary candidate: its official guidance
permits disclosed writing and revision assistance and expressly covers
AI-generated code in the disclosure rule, while project-specific implementation
eligibility still needs a written ruling; its presenter page documents live
online talks; and its first regular-paper
deadline is 2026-09-15. Commit `e1b10b5` adds a separate deterministic
SCITEPRESS submission format that reuses the frozen main-paper sections and result
macros. The current candidate is 11 A4 pages with a 193-word expanded abstract and 39,210 extracted
non-whitespace characters; two clean builds match at SHA-256
`98500e11d7ccaa6d1c0f88f2e741b499737124cdac1565190379029bc82c4c07`,
and every page passed visual and anonymity QA. It is not authorized for upload
until ICAART confirms exceptional remote eligibility/procedure and double-blind
AI-disclosure placement. The home page now establishes remote support for
speakers unable to travel; the remaining remote question is procedural. Named
code-repository handling also remains unresolved; see
[`ICAART_POLICY_RECONCILIATION.md`](ICAART_POLICY_RECONCILIATION.md). A
full-text comparison with three nearby accepted ICAART 2025--2026
papers rates the current submission weak accept with meaningful reviewer
variance: the empirical controls exceed that sample, while one-opponent breadth
and contribution positioning remain the scientific risks. See
[`ICAART_ACCEPTED_PAPER_CALIBRATION.md`](ICAART_ACCEPTED_PAPER_CALIBRATION.md).
The ICAART metadata now targets the Agents reviewer pool rather than generic
distribution-shift ML; exact area, topic, and keyword choices are recorded in
[`ICAART_REVIEWER_ASSIGNMENT_AUDIT.md`](ICAART_REVIEWER_ASSIGNMENT_AUDIT.md).
The final conclusion now states the contribution as a provenance-bound,
family-disjoint evaluation workflow while retaining the explicit non-claims
about environment, optimizer, and dominance novelty.
The latest portable-contribution pass makes that workflow an explicit evidence
contract in both abstracts and the conclusion, improves the threat table's
reading flow, and balances the final reference page. Two clean production
builds and one independent Git-free cross-toolchain build passed; all 34 pages
were rendered and the changed pages were inspected at full resolution. The
package-only `853e2ff` fix corrects the LNCS content-page description and
protects it with a regression test. Frozen empirical results and claim
boundaries are unchanged.

Commit `e365e37` closes the remaining reader-entry-point mismatch by naming
the reusable evidence contract in both submission abstracts. The edit is
claim-preserving and leaves every frozen empirical value untouched. A fresh
Git-free TeX Live 2024 extraction verified the 60-file manifest before and
after regeneration, passed all 22 packaged tests and the deep submission
check, and reproduced the production LNCS, supplement, and ICAART PDFs byte for
byte. Complete 34-page contact-sheet inspection and full-resolution inspection
of both reflowed first pages found no visual defect.

Commit `4c2d011` closes the remaining ordinary-tuning ambiguity by defining the
evidence contract as a joint, executable campaign-admission rule while
explicitly denying novelty for its individual controls and proof against
unknown dependencies. It changes no empirical input, estimate, interval,
gate, diagnostic, citation, abstract field, or scope boundary. The current
LNCS, supplement, and ICAART PDF SHA-256 identities are respectively
`0b0a5c55a9cbbc123693524597e520922ce927fcc21001cb5dd79b9004914bf6`,
`7674eb4190f422d66da9b7a9e50d464abc0c33894fbbedf85da6cb7a5d302d56`,
and `5a7450582b7452a9c568a08247e39cc9e9f0f5e0e1afcc9e9986ec9ef8ca5f21`.
Two deterministic 102,706-byte, 60-file artifact builds match at SHA-256
`39356f3a38ac3ffbb789a7298e23a77f51c949d16d207acd74530133882d4117`.
A fresh Git-free reconstruction verified the manifest before and after
regeneration, passed all 23 packaged tests and the 11-page, 39,611-character,
nine-font deep check, and reproduced all three production PDFs byte for byte.
All 34 pages passed rendered contact-sheet QA, and each reflowed page passed
full-resolution inspection.

Commit `24a612e` gives the ICAART abstract a seven-word safety margin below its
portal ceiling and states the joint campaign-admission rule at the first reader
entry point. Commit `ccc0c10` corrects the latent LNCS page-contract mismatch:
the conclusion now ends on page 15 and references start on page 16. Both edits
are claim-preserving. The current LNCS, supplement, and ICAART PDF identities
are respectively
`efcc9856799493fdb93b29f58ad895abee7b0822d075297433f273507a25aaa3`,
`7674eb4190f422d66da9b7a9e50d464abc0c33894fbbedf85da6cb7a5d302d56`,
and `98500e11d7ccaa6d1c0f88f2e741b499737124cdac1565190379029bc82c4c07`.
Two deterministic 102,615-byte, 60-file artifact builds match at SHA-256
`74c038f20daf4cae2c95c1fc930ebc862304eda52442afda724a2f83f1fa7fb0`.
A fresh Git-free reconstruction verified the manifest before and after
regeneration, passed all 23 packaged tests and the 11-page, 39,210-character,
nine-font deep check, and reproduced all three production PDFs byte for byte.
All 34 pages passed rendered contact-sheet QA, and each changed page passed
full-resolution inspection.

Commit `74fc518` adds a claim-to-evidence map to the anonymous reviewer package.
It links all eight aggregate records exactly once, names their authoritative
fields, and labels sensitivity and post-confirmatory records so they cannot be
mistaken for confirmatory support. Two deterministic builds of the updated
103,324-byte, 60-file archive match at SHA-256
`39f761b1cb0b9fe587b197be9151e63f0ee1368b883cbf541f2bb86c33ea5437`.
A fresh Git-free reconstruction verified both manifests, passed all 23
packaged tests and the 11-page deep check, and reproduced all PDF and portal
metadata hashes exactly. No manuscript source or empirical claim changed.

The 2026-08-11 official-policy recheck also closes two operational details.
ICAART requires the `Speaker` registration class for a paper and currently
posts early fees of EUR 620 for members and EUR 680 for nonmembers; the
secretariat still needs to confirm the exception procedure, timing, and that
the same fee applies remotely. The FAQ permits replacements before the paper
deadline but none afterward, so the upload plan now treats September 15 AoE as
an immutable review boundary. The inquiry supplies exact proposed AI-disclosure
wording for approval instead of asking the venue to invent it from scratch.
Decide one venue by 2026-08-25 and do not submit to both archival venues
simultaneously.

The candid submission decision is **go** for a scoped lower-tier agent,
game-AI, or algorithm-configuration conference/workshop, and **no-go** for a
broad or methodological flagship claim.

Use [`RESULT_REGISTRY.tsv`](RESULT_REGISTRY.tsv) for job-level provenance and
[`PAPER_PLAN.md`](PAPER_PLAN.md) for the manuscript formulation.
