# ICAART accepted-paper calibration

Reviewed: **2026-08-11**

## Purpose and evidence boundary

This note calibrates the Chrono Divide submission against three recent papers
in the official ICAART proceedings that are close in contribution type. It is
not an estimate of ICAART's acceptance probability: accepted papers reveal a
credible floor and the range of contributions the venue has published, but not
the rejected-paper distribution, reviewer assignment, or the 2027 program.
The comparison uses the published papers, not titles or abstracts alone.

Official sources:

- Elimam and Montoliu, “MACO: A Strategic Board Game Environment for Advanced
  AI Research,” ICAART 2026, 12 pages
  ([paper](https://www.scitepress.org/Papers/2026/143585/143585.pdf)).
- Noe, Nguyen, Zin, and Satoh, “An Empirical Study of Architectural Trade-Offs
  in Vision-Based Traffic Sign Interpretation Systems,” ICAART 2026, 8 pages
  ([paper](https://www.scitepress.org/Papers/2026/144489/144489.pdf)).
- Radtke and Frost, “Simulative Analysis of Multi-Agent Systems in Energy
  Systems: Impact of Communication Networks,” ICAART 2025, 8 pages
  ([paper](https://www.scitepress.org/Papers/2025/132414/132414.pdf)).

These were selected prospectively for three relevant archetypes: a new game
environment with agent experiments, a controlled empirical comparison, and a
simulation/evaluation position paper. They do not establish that all ICAART
tracks or reviewers apply the same standard.

## What the accepted sample contains

### A new game environment and one-game tournament

The MACO paper introduces a configurable connect-style multi-action board game
and evaluates seven agents. It tunes four computationally intensive agents
against one-step look-ahead, then runs a 2,100-game round robin with 100 games
per pairing and a board-size sensitivity check. The paper reports win rates,
standard deviations, pairwise two-proportion tests, and 95% intervals in a
figure. It explicitly applies no multiple-comparison correction and does not
reserve a held-out game distribution after tuning. Its principal strength is
the concrete new environment plus a broad within-environment baseline suite.

### A compact controlled empirical study

The traffic-sign paper compares four GPT-5 system architectures on 90 sampled
images with three runs per architecture (360 evaluated instances). It keeps the
base model fixed, reports means, standard deviations, 95% intervals, pairwise
tests, effect sizes, and failure rates, and analyzes image categories. Its
scope is one model family, one judge family, and one task construction. The
paper draws mechanism-oriented interpretations from response patterns while
acknowledging that it evaluates only one multi-agent configuration and lacks
human validation.

### A literature-grounded simulation-analysis guide

The energy-systems paper is explicitly a position paper. It synthesizes prior
work into a morphological framework for choosing objectives, requirements,
threats, communication models, metrics, baselines, and study designs. It does
not contribute a new simulation or empirical result. Its acceptance shows that
ICAART publishes scoped analytical/evaluation frameworks when their domain
motivation and design guidance are clear; it does not imply that a regular
empirical submission can omit validation.

## Comparison with the Chrono Divide manuscript

| Dimension | Relative position | Evidence and consequence |
| --- | --- | --- |
| Venue/topic fit | Comparable | The manuscript concerns agents, simulation-based configuration, game AI, and empirical evaluation, all represented in ICAART's scope and accepted proceedings. |
| Empirical scale | Stronger than this sample | The accepted path contains 8,704 games, including a frozen 512-game paired confirmatory evaluation over 16 sealed map families. Raw count is not itself the contribution, but it is not a weakness here. |
| Holdout and leakage control | Stronger | Revision-aware family roles, outcome-free compatibility screening, a fresh development gate, and one-time sealed test opening address a failure mode not controlled in the closest game-environment paper. |
| Uncertainty and negative endpoints | Stronger | The paper uses family-clustered inference, sensitivity checks, and reports both a passed relative gate and the failed prespecified absolute/joint criterion. |
| Baseline breadth | Weaker than MACO; comparable to the compact empirical paper | There is one independently authored opponent and one matchup. The paper compares a frozen generic reference and component reverts, not a broad league of independent agents. |
| Method novelty | Weaker than a new algorithm paper | Deterministic finite policy generation, successive halving, and common random numbers are established. The paper correctly claims an integrated evaluation/configuration workflow rather than a new optimizer. |
| Environment novelty | Weaker than MACO by design | Chrono Divide already exists. The manuscript states this on page 1 and claims an auditable research use of the environment, not its creation. |
| Mechanism evidence | More conservative | The component and terminal analyses are labeled post-confirmatory and do not establish the proposed infantry-rush mechanism. |
| Reproducibility | Stronger | Every reported aggregate is hash-bound; the anonymous artifact regenerates all tables and figures and rebuilds both paper formats. Full match replication retains an explicit third-party asset boundary. |
| Presentation readiness | Comparable or stronger | The 11-page SCITEPRESS version satisfies the posted character and abstract limits, is byte-reproducible, foregrounds its evaluation contribution with a threat-to-control map, and has passed rendered page and anonymity checks. |

## Acceptance assessment

The manuscript is **at or above the empirical soundness and presentation level
visible in this accepted sample**. In particular, ICAART acceptance cannot
reasonably be ruled out because the work uses one game or because the optimizer
is composed of established methods: recent proceedings include a one-game
study with weaker holdout controls, a 360-instance single-model-family study,
and a non-empirical position paper.

The project is nevertheless not “above the venue” in contribution strength.
Its central vulnerability is whether reviewers consider a rigorous workflow
and bounded relative result sufficiently consequential when the absolute gate
fails and only one independent opponent is studied. The appropriate internal
rating is **weak accept for an ICAART regular-paper submission, with meaningful
reviewer variance**. That is somewhat safer on topical and AI-policy grounds
than SCAG, but it remains conditional on remote-presentation and anonymous
AI-disclosure instructions.

## Likely ICAART objections and responses

1. **“Chrono Divide is not introduced by this paper.”** Agree immediately.
   Lead with the provenance-bound evaluation/configuration workflow and bounded
   case study; never title or describe the work as a new environment.
2. **“The optimizer is routine.”** Agree. The novelty is the integrated design
   for map-family leakage, reciprocal starts, isolated randomness, sealed
   outcomes, and scheduler-complete evidence, not successive halving itself.
3. **“The baseline is weak and the bot does not reliably win.”** Keep both facts
   in the abstract and main result. The positive claim is improvement over the
   prospectively frozen generic interface reference, not dominance over
   Supalosa or the deployed StrongBot default.
4. **“One opponent and one faction mirror are too narrow.”** Treat this as the
   principal limitation. Additional post hoc games on the opened population
   would not repair it; a broader study must be separately registered.
5. **“The engineering detail overwhelms the agent contribution.”** Preserve the
   RQ-led structure and connect each validity control to a concrete bias it
   prevents. Keep scheduler mechanics concise in the main paper and detailed
   in the supplement/artifact.
6. **“The mechanism is speculative.”** Do not promote RQ3 into a causal claim.
   The current language (“consistent with,” “does not establish”) is the right
   boundary.

## Consequences for submission

1. No further outcome-bearing experiment is required for the current paper.
2. No scientific rewrite is justified by this calibration; the present title,
   abstract, contribution list, joint-gate disclosure, and limitation language
   already answer the sample-calibrated risks.
3. Submit to ICAART as a **regular empirical paper**, not a position paper, if
   the venue decision packet selects ICAART.
4. Obtain written confirmation of online presentation and the exact placement
   of generative-AI disclosure under double-blind review before uploading.
5. Seek one independent cold read. Reopen the paper only for claim-preserving
   clarity corrections, then repeat deterministic build, anonymity, character,
   and rendered-page checks.
