# ICAART short-paper reduction plan

Prepared: **2026-08-11**

Status: **contingency only; do not apply before an acceptance decision**.

## Trigger and frozen source

ICAART reviews a regular submission without assigning a review-version page
limit, subject to the official 10,000--50,000 non-whitespace-character band.
A qualifying regular paper may later be classified as a full paper with a
12-page proceedings limit or a short paper with an 8-page limit. This plan is
triggered only if the accepted paper must be delivered within eight pages.
The controlling public source is the
[ICAART 2027 submission guideline](https://icaart.scitevents.org/Guidelines.aspx?y=2027);
recheck it and the acceptance notice before editing.

The source candidate for any reduction is:

- reviewed submission source:
  `77d93359242756f07afba30d88fb2db8fd97e7b2`;
- ten-page PDF SHA-256:
  `3ec1a157b4b09ccbf398f68dd254da8f0abd9f90a7520550bead46246e1b9ff4`;
- expanded abstract: 195 lexical words;
- extracted non-whitespace characters: 36,355.

Do not compress the review version preemptively. A shorter review paper would
remove evidence that directly answers ICAART's technical-quality and critical-
discussion prompts without improving the underlying significance limitation.

## Scientific invariants

An eight-page version is acceptable only if a reader can still recover every
item below from the main paper:

1. Chrono Divide is an existing environment, and successive halving and common
   random numbers are established methods.
2. The principal contribution is a leakage-resistant, provenance-bound
   configuration and held-out evaluation workflow for a scripted agent.
3. The positive endpoint is champion minus the prospectively frozen generic
   coordinate-free StrongBot reference: 0.33594 with family-clustered 95%
   interval [0.21456, 0.45732].
4. The champion's absolute score margin over 0.5 has one-sided 95% lower bound
   -0.02117; the absolute and frozen joint gates fail.
5. The reference is not the fork's deployed map-profile-enabled default, and
   no product-level improvement is estimated.
6. Method v1 was retired on development evidence; method v2 used a disjoint
   fresh development pool before one sealed test opening.
7. Map families are the inferential units. Individual games and W/D/L counts
   are descriptive, not independent replicates.
8. The scope is one pinned Supalosa opponent, one Iraq mirror matchup, one
   simulator revision, and the supported Temperate family population.
9. The high draw rate, fixed tick cap, heuristic family construction,
   aggregate-only reviewer artifact, and no-standard-configurator comparison
   remain explicit limitations.
10. Post-confirmatory component and terminal analyses, if mentioned, remain
    non-causal diagnostics and cannot rescue the failed gate.

The abstract, Table 3, results, limitations, and conclusion must continue to
state the relative-versus-absolute distinction. No cut may turn a bounded
configuration result into a bot-superiority, environment, optimizer, or
mechanism claim.

## Current page budget

The reviewed candidate is ten A4 pages. Main text and figures occupy page 1
through roughly the first third of page 9; references occupy the remainder of
page 9 and all of page 10, approximately 1.6 pages. An eight-page version
therefore needs to reduce the body by about two pages while preserving a
readable reference list.

Current shared-section source sizes are:

| Section | Words | Short-version role |
| --- | ---: | --- |
| Introduction | 761 | retain and tighten |
| Related work | 585 | compress substantially |
| Environment and controls | 806 | retain core controls |
| Protocol | 958 | retain confirmatory design |
| Results | 557 | retain Table 3 and Figures 2--3 |
| Post-confirmatory diagnostics | 499 | remove as a section |
| Reproducibility and limitations | 552 | retain, tighten |
| Conclusion | 85 | retain |

## Ordered reduction

Apply cuts in this order and stop as soon as a clean build fits eight pages.
Page savings are layout estimates and must be verified by rendering.

### 1. Remove the diagnostic paper-within-a-paper

Expected saving: **0.9--1.1 pages**.

- Delete RQ3 and the diagnostic clause in contribution item 3.
- Remove Section 6 and Figure 4.
- Replace them with at most one bounded result sentence after Section 5.3:
  post-confirmatory reverts and terminal summaries were compatible with a
  strategy shift but did not isolate a multiplicity-controlled component or a
  causal mechanism.
- Retain the diagnostic aggregate artifacts in the release, but do not make the
  short main paper depend on them.
- Remove diagnostic-only prose from the abstract and conclusion only if the
  failed absolute gate and primary avoided-loss interpretation remain clear.

The diagnostics are the correct first cut because they are explicitly
post-confirmatory and non-causal. The relative and absolute confirmatory
results are not candidates for deletion.

### 2. Compress related work and its reference footprint

Expected saving: **0.5--0.7 pages**, including shorter references.

- Reduce the three related-work paragraphs from 585 to approximately
  280--330 words.
- Keep one compact line on scripted-RTS configuration, one on algorithm
  configuration/multi-fidelity allocation, and one on held-out game
  evaluation and clustered uncertainty.
- Retain the closest recent game-agent paper, at least one classic scripted-RTS
  configuration source, SMAC or irace, Hyperband, one game-generalization
  source, Agarwal et al. for uncertainty, and Schruben for common random
  numbers.
- Remove citations only when the associated proposition is also removed.
  Re-run the citation-verification packet rather than retaining uncited
  bibliography entries or orphaning claims.

This cut must still make it obvious that neither the optimizer components nor
Chrono Divide itself are introduced by the paper.

### 3. Convert Tables 1 and 2 to compact prose

Expected saving: **0.3--0.4 pages**.

- Replace Table 1 with one sentence giving the three stage schedules:
  32/12/6 policies, 6/12/22 families, two reciprocal slots, and
  384/288/264 games per run, totaling 936 per run and 4,680 overall.
- Replace Table 2 with one sentence listing the six operative policy
  differences. Preserve the note that forced-attack minimum is inactive
  because forced attack is disabled.
- Keep Table 3 unchanged. It is the shortest complete statement of both
  confirmatory endpoints and their decisions.

### 4. Tighten provenance and implementation prose

Expected saving: **0.25--0.4 pages**.

- Remove repeated scheduler mechanics after their first complete statement.
- Compress the initial exploratory-history paragraph without erasing why those
  results are inadmissible.
- State the seed-isolation invariants once, while retaining participant-specific
  streams, reciprocal starts, and no rejected-start loop.
- Shorten artifact packaging details while preserving the distinction between
  aggregate reproduction and full match replay.

Do not cut the method-v1/method-v2 adaptation, family-disjoint roles, single
unblinding, no-retry rule, or comparator boundary.

### 5. Last-resort layout-neutral reductions

Expected saving: **up to 0.25 pages**.

- Move the exact training tie-utility equation to release documentation and
  describe it in prose; evaluation still uses game score only.
- Combine short adjacent paragraphs without changing the template's font,
  margins, leading, column gap, or bibliography size.
- Shorten figure captions only after confirming each figure remains
  independently interpretable.

Do not shrink text, alter SCITEPRESS geometry, rasterize text, or pay for extra
pages merely to avoid an editorial decision. If the paper still cannot fit
cleanly, obtain the venue's extra-page terms in writing and compare that option
with one more content-preserving cut.

## Elements that remain

The short paper should retain:

- Figure 1, because the family roles, transparent adaptation, and one-time test
  opening are difficult to recover from prose alone;
- Figure 2, because it shows all 16 family effects and prevents the mean from
  hiding heterogeneity;
- Figure 3, because it makes the high-draw and avoided-loss interpretation
  auditable;
- Table 3 and the score/uncertainty equations;
- the complete limitations subsection, with compression only;
- the deterministic aggregate-reproduction and third-party-content boundary.

If one more visual must be removed, Figure 3 may be summarized by its full
3-by-3 transition counts in prose. Figure 1, Figure 2, and Table 3 have higher
priority.

## Implementation and verification

1. Start from the exact accepted source revision; do not edit the frozen
   review PDF in place.
2. Apply one reduction class at a time and record its character and page
   effect.
3. Regenerate every imported table, metric, and figure from the immutable
   artifacts; never copy numbers into a short-only source.
4. Require exactly eight or fewer A4 pages including references, the
   venue-approved AI disclosure, and any required acknowledgments.
5. Re-run all paper, SCITEPRESS, artifact, citation-coverage, anonymity, and
   claim-boundary tests.
6. Extract text and verify the abstract word count, 10,000--50,000-character
   band, every headline number, all citation keys, and the absence of dangling
   references to removed sections or figures.
7. Render every page at normal scale and full resolution; reject clipping,
   crowded floats, unreadable captions, broken URLs, or reference spillover.
8. Build twice from a clean export and require byte-identical PDFs before
   updating hashes and portal metadata.
9. Have the human author repeat the line-by-line, citation, and claim review on
   the reduced paper. The original verification does not automatically cover
   new wording or removed context.

## Acceptance test

The reduction succeeds only if an unprimed reader can still answer:

- What exactly improved, and against which reference?
- Which prespecified gate failed?
- Why is this not evidence that StrongBot reliably beats Supalosa?
- What is original if the environment and optimizer components already exist?
- How were test leakage, starts, randomness, retries, and correlated maps
  controlled?
- What population and matchup does the estimate cover?

If any answer becomes less accurate after compression, restore the necessary
text even if that requires a different cut elsewhere.
