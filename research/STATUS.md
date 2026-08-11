# Research status

Last reconciled: **2026-08-11**

## Bottom line

The core empirical program is complete and the first full paper draft is built,
visually checked, committed, and pushed. The frozen
method-v2 champion substantially improves the shipped StrongBot default across
16 sealed Chrono Divide map families against one pinned, independently loaded
Supalosa bot. The relative effect passes its prespecified confirmatory gate; the
separate claim that the champion reliably beats Supalosa does not.

No Chrono Divide simulation job is active. Do not launch more outcome-bearing
games on the opened family population for this paper.

## Main result

| Method | Games | W/D/L | Score |
| --- | ---: | ---: | ---: |
| Shipped StrongBot default | 256 | 1 / 100 / 155 | 0.19922 |
| Frozen method-v2 champion | 256 | 47 / 180 / 29 | 0.53516 |

The equally family-weighted champion-minus-default estimate is **0.33594** with
family-clustered standard error **0.05695** and two-sided 95% confidence interval
**[0.21456, 0.45732]**. Fourteen family effects are positive and two are zero.

The champion's absolute score margin above 0.5 is 0.03516, but its prespecified
one-sided 95% lower margin is **-0.02117**. Therefore:

- supported: optimization robustly improves the StrongBot default against the
  pinned Supalosa version on the supported test-family population;
- unsupported: the champion reliably beats Supalosa, a new general learning
  algorithm, broad game-AI superiority, or a paradigm shift.

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

Commit `81e87e2` adds the complete anonymous LNCS manuscript, supplement,
21-entry bibliography, and deterministic paper build. The main PDF is 16 pages
with main text ending on page 14 and references continuing afterward; the
supplement is five pages. All reported tables and figures are generated from
hash-pinned aggregate artifacts. The final build has no overfull boxes,
undefined references, missing citations, or BibTeX warnings, and all 21 pages
have received a rendered visual check.

The remaining blockers are release- and submission-oriented, not additional
training:

1. reproduce the paper assets and tests from a clean clone without private
   absolute paths;
2. create and validate an identity-neutral artifact bundle containing only
   releasable author-owned code, manifests, hashes, metadata, and aggregates;
3. finish the asset-license and acquisition instructions for omitted third-party
   game content;
4. obtain written confirmation that EvoStar permits remote presentation; and
5. complete a reviewer-style claim, accessibility, statistics, and submission
   metadata audit.

The candid submission decision is **go** for a scoped lower-tier game-AI or
evolutionary-computation workshop/special session, and **no-go** for a broad or
methodological flagship claim.

Use [`RESULT_REGISTRY.tsv`](RESULT_REGISTRY.tsv) for job-level provenance and
[`PAPER_PLAN.md`](PAPER_PLAN.md) for the manuscript formulation.
