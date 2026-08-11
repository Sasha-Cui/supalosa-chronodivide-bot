# Reviewer-response guide

Prepared: **2026-08-11**

This is an internal evidence index for pre-submission review and any permitted
author response. It is not a substitute for reading the manuscript or the
primary artifacts, and it does not authorize a new analysis on the opened test
families.

## Positioning sentence

The paper contributes a leakage-resistant, provenance-bound workflow for
configuring and evaluating one scripted Chrono Divide agent, plus a held-out
result showing a large improvement over a prospectively frozen coordinate-free
StrongBot reference against one pinned opponent; it does not contribute a new
optimizer, a new environment, a deployed-product comparison, or evidence of
reliable absolute superiority.

## Response discipline

1. Acknowledge a real limitation before describing the control that remains.
2. Point to a manuscript section, table, figure, or frozen artifact; do not
   answer with undocumented implementation intent.
3. Distinguish the passed relative gate from the failed absolute gate in every
   response about strength.
4. Treat the map family, not an individual game, as the inferential unit.
5. Do not add a subgroup, endpoint, baseline, seed batch, or test-family
   analysis after seeing the confirmatory outcome.
6. If a reviewer requests evidence outside the frozen estimand, classify it as
   a prospective follow-up rather than implying it already exists.

## Anticipated objections and bounded responses

### “The reference is artificially weak.”

**What is true.** The reference scores 0.19922, and the study does not compare
the champion with the fork's map-profile-enabled deployed default.

**Response.** Candidate 0 was frozen prospectively as
`DEFAULT_RESEARCH_POLICY` before search. It, every search candidate, and the
champion use the same coordinate-free interface. The deployed default is not
an admissible comparator for this estimand because its built-in profiles and
exact-map tactics encode map identity. The study therefore estimates
configuration improvement within the declared generic policy class, not
product-level improvement. The low reference score and missing deployed
baseline are stated as limitations rather than used to imply a stronger claim.

**Evidence.** Protocol Section 4.1; Limitations, “Comparator boundary”;
Table 2; `research/OPTIMIZER_PROTOCOL.md`; policy hashes in the supplement.

**Do not say.** Do not call the reference shipped, standard, competitive, or
the deployed product baseline. Do not estimate how the deployed default would
have performed.

### “This is ordinary tuning, not a new algorithm.”

**What is true.** Successive halving, deterministic mutation-generated pools,
common random numbers, and the championship are established techniques.

**Response.** The paper explicitly makes no optimizer-novelty or efficiency
claim. Its contribution is the integrated evaluation design: revision-aware
family roles, outcome-free screening, independent opponent loading, isolated
random streams, reciprocal starts, fail-closed campaign accounting, sealed
test outcomes, and family-level uncertainty. The empirical case study shows
what that workflow finds.

**Evidence.** Introduction contributions; Related Work; Sections 3-4;
Limitations, “Algorithmic comparison”; Table 1 and Figure 1.

### “The configured bot is not actually strong.”

**What is true.** The champion wins 47 of 256 games; its score is 0.53516, but
the one-sided 95% lower score margin over 0.5 is -0.02117.

**Response.** Agree. The absolute-strength gate fails and appears in the
abstract, introduction, Table 3, results, limitations, and conclusion. The
positive claim is champion-minus-reference improvement: 0.33594 with
family-clustered 95% CI [0.21456, 0.45732].

**Evidence.** RQ1-RQ2; Table 3; Results Sections 5.1-5.2; generated confirmatory
artifact.

**Do not say.** Do not say StrongBot reliably beats Supalosa, wins most games,
or is generally stronger.

### “One opponent and one faction mirror are too narrow.”

**What is true.** Supalosa is the only independently authored opponent and all
games are Iraq mirrors under one pinned simulator version.

**Response.** This is the largest external-validity limitation. The estimand is
performance against that pinned opponent on the supported Temperate family
population, not general agent strength. Adding an opponent or faction after
unblinding would require a separately registered prospective study.

**Evidence.** Abstract scope sentence; Introduction final paragraph;
Environment Section 3.1; Limitations, “One opponent and matchup.”

### “Method v2 was chosen after method v1 failed, so this is post-selection.”

**What is true.** Method v2 is a transparent adaptation, not a single-shot
preregistration.

**Response.** Method v1 failed only on the original development role. Test
identities and outcomes remained inaccessible. Method v2 used training-only
evidence and a disjoint fresh development pool, then froze the champion,
reference, runtime, test analysis, and attempt budget before the single test
opening. The paper reports the adaptation rather than erasing it.

**Evidence.** Figure 1; Protocol Section 4.4; Supplement Section 6; execution
ledger; development commitment artifacts.

### “Map revisions or simulator randomness could explain the effect.”

**Response.** Exact copies and likely revisions are grouped conservatively
before role assignment. Every comparison shares family, engine seed, opponent
stream, and physical slot; starts are reciprocal. Candidate and opponent random
streams are identity-keyed and isolated, and the pinned opponent is loaded from
an independent clean tree. Launches cannot be selectively retried.

**Evidence.** Environment Sections 3.2-3.4; Figure 1; result transition design;
seed-replay and family-role artifacts.

### “There are many games but only 16 independent test units.”

**Response.** Correct; game-level counts are descriptive. The prespecified
estimand first pairs reciprocal slots within family-seed blocks and then weights
families equally. The interval clusters on 16 families and uses a
Student-t critical value with 15 degrees of freedom. A family bootstrap and
exact sign-flip test are labeled post-confirmatory sensitivity checks.

**Evidence.** Protocol Section 4.5; Equation 3; Table 3 caption; Results 5.1;
Supplement Section 5.

### “The result is mostly draws and depends on the tick cap.”

**What is true.** The endpoint scores every completed or tick-cap draw as 0.5,
and most improvement replaces losses with survival.

**Response.** The paper does not convert terminal material into wins and does
not claim a cap-robust effect. Paired transitions disclose the exact pattern;
the cap and alternative outcome definitions are explicit limitations.

**Evidence.** Equation 1; Results 5.3 and Figure 3; Limitations, “High draw rate
and endpoint.”

### “The infantry-rush mechanism is post-hoc storytelling.”

**Response.** The mechanism is not a contribution or causal claim. Component
reverts and terminal snapshots are post-confirmatory diagnostics. The strategy
revert has the largest point contrast, but its familywise interval crosses
zero; terminal records contain endpoints, not action trajectories.

**Evidence.** RQ3 wording; Diagnostics Section 6; Figure 4; Limitations,
“Adaptation and diagnostic power.”

### “Why no SMAC, irace, NTBEA, or hand-tuned comparator?”

**Response.** The study does not claim optimizer efficiency or superiority, so
such a comparison is not required to support the bounded relative result. Its
absence limits algorithmic conclusions and is stated explicitly. A fair
configurator comparison would require a new prospectively budget-matched study,
not a post-hoc run on opened test families.

**Evidence.** Related Work; Limitations, “Algorithmic comparison.”

### “The aggregate artifact is not full match reproduction.”

**What is true.** The anonymous artifact regenerates all tables and figures but
excludes third-party bot code, maps, runtime assets, and private raw logs.

**Response.** The bundle contains hash-pinned aggregate inputs, generators,
tests, sources, and third-party acquisition boundaries. Full replay depends on
rights and exact external assets; the paper does not describe aggregate
reproduction as full match replication.

**Evidence.** Reproducibility Section 7.1; supplement reproduction commands;
artifact `README.md`, `MANIFEST.json`, and `THIRD_PARTY.md`.

### “This is outside a bio-inspired or evolutionary-computation session.”

**Response.** Do not manufacture evolutionary novelty. The 2027 Soft Computing
Applied to Games call explicitly includes learning in games, empirical analysis
of computational-intelligence techniques, and game-based benchmarking while
especially encouraging bio-inspired approaches. Submission still requires the
chairs' written scope ruling because the method is finite configuration, not an
iterative evolutionary algorithm.

**Evidence.** `research/VENUE_STRATEGY.md`, official 2027 call, and
`research/SCAG_ACCEPTED_PAPER_CALIBRATION.md`.

## Claims that must never appear in a response

- Chrono Divide is a new environment introduced by this work.
- The search algorithm is novel, evolutionary, or state of the art.
- The champion improves StrongBot's shipped or deployed default.
- StrongBot reliably beats Supalosa or is generally stronger.
- Sixteen families establish broad cross-game or cross-opponent generalization.
- Terminal material or the component panel proves an infantry-rush mechanism.
- More seeds on the opened tests would be independent confirmation.
- The reviewer artifact enables full match replay without third-party content.

## Response readiness checklist

- [ ] Quote the review concern accurately and answer only that concern.
- [ ] Verify every reported number against generated macros or frozen JSON.
- [ ] Cite a manuscript locator and, where relevant, a frozen artifact.
- [ ] State whether the point is confirmatory, sensitivity-only, diagnostic, or
      future work.
- [ ] Preserve the relative-versus-absolute distinction.
- [ ] Make no new claim from a reviewer-suggested post-hoc calculation.
- [ ] Record any accepted wording change and rerun manuscript/artifact QA.
