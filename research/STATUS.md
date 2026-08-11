# Research status

Last reconciled: **2026-08-11**

## Bottom line

The core empirical program is complete and the submission-candidate paper is
built, visually checked, committed, and ready for external review. The frozen
method-v2 champion substantially improves a prospectively frozen generic
StrongBot reference across 16 sealed Chrono Divide map families against one
pinned, independently loaded Supalosa bot. The relative effect passes its prespecified confirmatory gate; the
separate claim that the champion reliably beats Supalosa does not.

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

Commit `b08b75e` is the current anonymous LNCS manuscript source revision. It
sharpens the held-out-evaluation title, states two confirmatory research
questions and one explicitly descriptive diagnostic question, removes causal-sounding
mechanism language, and adds primary prior art on hidden-level evaluation and
protocol sensitivity, classifies the search as deterministic mutation-based
finite configuration rather than iterative population-based evolution, and
cites the closest recent SCAG training-mode comparison, reports exact
accepted-path resource use, and derives secondary reported values from frozen
aggregate artifacts without changing any scientific result. The main
PDF is 16 pages with main text ending on page 14 and references continuing
afterward; the supplement is five pages. All reported tables and figures are
generated from hash-pinned aggregate artifacts. The final build has no overfull boxes, undefined
references, missing citations, or BibTeX warnings, and all 21 pages have
received rendered visual checks. The current PDF SHA-256 values are recorded in
[`MANUSCRIPT_QA.md`](MANUSCRIPT_QA.md).

Commit `3c5af39` adds the deterministic anonymous aggregate-artifact builder,
and commit `7cdbe0d` hardens its direct-identity denylist. The current 65 KB
review archive is byte-deterministic at SHA-256
`7feb00236f8f7f6d944399b395b9b94160802aa0cea29f360805c0fd225ea7f6`.
Its 36-file manifest verifies, all artifact tests pass, and an extracted
reviewer copy rebuilds the 16-page paper and five-page supplement without
undefined references, overflow, or BibTeX warnings.

The remaining blockers are release- and submission-oriented, not additional
training:

1. obtain permission or a licensing decision from Supalosa before publicly
   redistributing the combined bot, whose upstream package is `UNLICENSED`;
2. obtain written confirmation that EvoStar accepts the paper's application and
   evaluation emphasis, permits remote presentation, and permits the proposed
   handling of the prior named public repository;
3. obtain a written EvoStar ruling on the recorded beyond-copy-editing use of
   OpenAI Codex, complete the human evidence/citation/code/manuscript verification,
   and make any required disclosure; and
4. obtain a cold read from an independent technical reader, incorporate only
   claim-preserving clarity corrections, and repeat final PDF QA.

ICAART 2027 is now the verified policy-compatible fallback: its official
guidance permits disclosed AI-assisted writing, revision, and code; its
presenter page documents live online talks; and its first regular-paper
deadline is 2026-09-15. If EvoStar has not supplied affirmative written rulings
by 2026-08-20, begin the 12-page SCITEPRESS conversion and decide the venue by
2026-09-01. Do not submit to both archival venues simultaneously.

The candid submission decision is **go** for a scoped lower-tier game-AI or
algorithm-configuration workshop/special session, and **no-go** for a broad or
methodological flagship claim.

Use [`RESULT_REGISTRY.tsv`](RESULT_REGISTRY.tsv) for job-level provenance and
[`PAPER_PLAN.md`](PAPER_PLAN.md) for the manuscript formulation.
