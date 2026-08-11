# Results-driven paper plan

Status: **empirical program complete; full evidence-bound manuscript and
supplement committed at `81e87e2`; release QA in progress**.

## Recommended paper

**Working title:** *Reproducible Policy Configuration for a Scripted RTS Agent
in Chrono Divide*

Alternative titles:

1. *Family-Disjoint Evaluation of a Configured Chrono Divide Agent*
2. *From Default Script to Robust Generalist: Reproducible Agent Configuration
   in Chrono Divide*
3. *Common-Seed Configuration and Held-Out Map Evaluation for a Scripted RTS
   Agent*

The primary target is a lower-tier game-AI/evolutionary-computation workshop or
special session. The paper is an empirical evaluation and reproducibility
contribution, with an agent-configuration case study. It is not a new general
learning-algorithm paper.

## One-sentence takeaway

A deterministic, family-disjoint Chrono Divide evaluation shows that a
training-only configuration pipeline increases StrongBot's held-out score
against a pinned Supalosa opponent by 0.336 (family-clustered 95% CI
[0.215, 0.457]), mainly by replacing losses with survival or wins, although the
optimized agent's absolute score is not precise enough to claim that it
reliably beats Supalosa.

## Research questions

**RQ1 — Can Chrono Divide support reproducible, leakage-controlled scripted-agent
evaluation?**

Yes within the documented scope. The harness provides explicit engine and
participant seeds, reciprocal physical starts, source/runtime/baseline/map
commitments, family-disjoint roles, fail-closed job accounting, sealed outcome
access, and family-level inference. Of 67 Temperate map families screened twice,
54 passed the outcome-free compatibility criteria.

**RQ2 — Does training-only configuration improve a generic StrongBot policy on
held-out map families?**

Yes. On 16 sealed families, the frozen champion scores 0.53516 versus 0.19922
for the shipped default. The equally family-weighted improvement is 0.33594,
with two-sided 95% interval [0.21456, 0.45732]. Fourteen family effects are
positive and two are zero.

**RQ3 — Does the configured StrongBot reliably beat Supalosa?**

Not established. The champion's score margin above 0.5 is 0.03516, but its
prespecified one-sided 95% lower margin is -0.02117. This failed gate is a main
result, not a footnote.

**RQ4 — What observed behavior accounts for the improvement?**

Descriptively, the champion converts many default losses into tick-cap draws or
wins and ends matched draw-to-draw games with substantially more relative
combatants and fewer banked credits. The joint infantry+rush strategy group is
the dominant component signal, but its multiplicity-controlled interval
includes zero. These results support a mechanism hypothesis, not a proven
single-component cause.

## Contribution statement

The paper should claim exactly three contributions:

1. **Research harness and protocol.** We operationalize the existing Chrono
   Divide game and bot API as a deterministic scripted-agent evaluation testbed,
   including map-family construction, compatibility screening, common random
   numbers, reciprocal starts, clean opponent loading, sealed outcomes, and
   complete job provenance.
2. **Configured StrongBot policy.** We implement a coordinate-free 32-policy,
   three-stage successive-halving search with five independent candidate pools,
   followed by a common-seed championship that selects one generic policy from
   30 finalists without test access.
3. **Held-out empirical evidence.** We show a large, family-consistent
   improvement over the shipped StrongBot default on 16 sealed families, report
   the failed absolute-strength gate, and decompose the result with paired
   outcome transitions, terminal states, optimizer-selection comparisons, and
   component reverts.

The novelty is the integrated leakage-resistant evaluation and evidence, not
the use of successive halving, random search, common random numbers, or a
hand-authored policy space in isolation.

## What the paper must not claim

- Chrono Divide was created by this project or is itself a new environment.
- The optimizer is a novel general-purpose learning algorithm.
- StrongBot reliably beats Supalosa.
- Performance generalizes to other opponents, factions, theaters, RTS games,
  or human play.
- The strategy component has a multiplicity-controlled causal effect.
- Endpoint-identical scouting policies necessarily take identical internal
  actions.
- A paradigm shift in game AI or machine learning.

## Actual study design

### Environment and agents

- Game: Chrono Divide, a browser reconstruction of Red Alert 2 with a headless
  bot API.
- Candidate: StrongBot, authored by the project owner.
- Opponent: clean, independently loaded Supalosa commit `165b77a`.
- Matchup: Iraq (`Arabs`) versus Iraq, 10,000 starting credits, superweapons
  disabled, short-game defeat, 18,000-tick cap.
- Endpoint: win = 1, draw = 0.5, loss = 0.
- Generic-policy boundary: default map profiles, exact-map tactics, coordinate
  routes, placement anchors, and orientation gates disabled.

### Map population and leakage control

- 67 Temperate families received reciprocal outcome-free compatibility probes.
- Independent screens reproduced 54 pass, 7 review, and 6 fail classifications.
- The original 54-family pass population was frozen as 22 training, 12
  development, 16 test, and 4 reserve families before policy training.
- Method v2 used only the 22 training families for search/championship, a fresh
  11-family pool (4 original reserve plus 7 technically admissible review
  families) for its one development gate, and all 16 sealed test families once.
- Exact duplicates and map revisions stay in one family; test identities and
  outcomes were inaccessible to training and development commands.

### Configuration and selection

Each of five deterministic search runs generates 32 distinct policies from a
fixed coordinate-free policy space. Candidate 0 is default; other candidates
anchor attack-composition and strategic-plan choices and receive additional
hash-ranked mutations. Successive halving evaluates:

| Stage | Policies | Families | Reciprocal slots | Games/run |
| --- | ---: | ---: | ---: | ---: |
| 0 | 32 | 6 | 2 | 384 |
| 1 | 12 | 12 | 2 | 288 |
| 2 | 6 | 22 | 2 | 264 |
| **Total** |  |  |  | **936** |

The five runs produce 30 unique finalists. A common-seed championship evaluates
all 30 on all 22 training families (1,320 games), advances six, and evaluates
those six on three new seed blocks per family (792 games). Ranking is
lexicographic by family-macro score, lower-20% family CVaR, worst-family score,
and policy hash. Terminal material cannot determine the champion.

The champion differs from default in seven stored fields:

| Field | Default | Champion |
| --- | --- | --- |
| Attack composition | assault | infantry |
| Strategic plan | macro | rush |
| Defense-radius growth/tick | 0.00045 | 0.0001 |
| Emergency-defense radius | 48 | 64 |
| Forced attack | enabled | disabled |
| Forced-attack minimum combatants | 10 | 4 (inactive while disabled) |
| Scout cooldown | 120 | 45 ticks |

### Confirmatory allocation and inference

The confirmatory design contains 16 families, eight new seed blocks/family, two
reciprocal candidate slots, and two methods: 512 games total. The primary
estimand is the equally-family-weighted champion-minus-default score difference
after reciprocal-slot averaging. The primary interval uses the frozen
finite-family cluster sandwich and Student-$t_{15}$ critical value.

The confirmatory gate had two components:

1. two-sided 95% interval for champion-minus-default entirely above zero; and
2. one-sided 95% lower bound for champion score minus 0.5 above zero.

Both results are reported. The first passed; the second failed.

## Final results to report

### Main table

| Quantity | Estimate | Uncertainty/status |
| --- | ---: | --- |
| Default score | 0.19922 | 1 W / 100 D / 155 L |
| Champion score | 0.53516 | 47 W / 180 D / 29 L |
| Champion - default | 0.33594 | SE 0.05695; 95% CI [0.21456, 0.45732]; pass |
| Champion - 0.5 | 0.03516 | SE 0.03213; one-sided 95% lower -0.02117; fail |
| Family signs | 14 positive / 2 zero / 0 negative | descriptive support |
| Improvement family bootstrap |  | diagnostic 95% [0.23047, 0.44727] |
| Exact family sign-flip |  | diagnostic two-sided $p=0.000122$ |

### Paired outcome decomposition

Of 256 common family-seed-slot pairs:

- 28 default losses become champion wins;
- 104 default losses become champion draws;
- 18 default draws become champion wins;
- 6 default draws become champion losses;
- 100 pairs have equal frozen score.

Thus 150 pairs improve, six regress, and 100 are unchanged. This transition
view should accompany W/D/L counts because the main practical gain is avoided
losses, not a dominant raw win rate.

### Mechanism diagnostics

- Champion minus equal average of five run-local optimizer policies: 0.08250,
  95% CI [-0.02679, 0.19179].
- Champion minus equal average of five single-group reverts: 0.05750, 95% CI
  [-0.00347, 0.11847].
- Champion minus strategy revert: 0.33125; ordinary 95% CI
  [0.09556, 0.56694], Bonferroni familywise 95% CI
  [-0.00734, 0.66984].
- Champion minus defense-growth revert: -0.03750; all intervals include zero.
- Champion minus force-attack revert: -0.01250; all intervals include zero.
- Champion versus scouting revert: exact endpoint equality in all 80 games.
- Stable confirmatory draw-to-draw pairs: +22.71 relative combatants, +12.43
  relative total units, and -683.82 relative credits for champion.

These are post-confirmatory diagnostics. Use “consistent with,” “suggests,” and
“dominant observed signal,” not “causes” or “proves.”

## Draft abstract

Scripted game agents are often tuned on a small set of maps, while reported
gains can conflate policy quality with map memorization, start position,
simulator randomness, or a contaminated opponent implementation. We present a
reproducible evaluation and configuration pipeline for StrongBot in Chrono
Divide, a browser reconstruction of *Command & Conquer: Red Alert 2*. The
pipeline groups maps into revision-aware families, screens simulator
compatibility, isolates a pinned Supalosa opponent, controls engine and
participant randomness, swaps physical starts, seals held-out outcomes, and
binds every result to source, runtime, map, plan, and scheduler commitments.
Five 32-policy successive-halving searches followed by a common-seed
championship select one coordinate-free generic policy using training families
only. In a frozen 512-game evaluation over 16 sealed families, the selected
policy scores 0.535 versus 0.199 for the shipped StrongBot default. The
equally-family-weighted improvement is 0.336 (family-clustered 95% CI
[0.215, 0.457]); 14 family effects are positive and two are zero. The
prespecified absolute-strength gate does not pass: the one-sided 95% lower bound
for the selected policy's score margin above 0.5 is -0.021, so the study does
not establish that StrongBot reliably beats Supalosa. Paired outcome and
terminal-state analyses show that the configured policy mainly replaces losses
with survival or wins and is consistent with converting banked resources into
combat power; component-level evidence remains suggestive after multiplicity
control. We release the author-owned harness, protocols, manifests, metadata,
and aggregate results, and delimit claims to one opponent, matchup, and
supported map population.

## Manuscript outline

### 1. Introduction

- Why scripted RTS-agent results are vulnerable to map, start, randomness, and
  opponent contamination.
- Chrono Divide as an underused programmable setting, not a newly authored
  environment.
- The main positive held-out result and the failed absolute gate in the opening
  page.
- Three contributions exactly as stated above.

### 2. Related work

- Scripted, evolutionary, and automatically configured RTS agents.
- Algorithm configuration and racing/successive-halving methods.
- Generalization and overfitting across game levels/maps/opponents.
- Common random numbers, paired evaluation, and reproducible simulation.
- Chrono Divide, Supalosa, and browser RTS engineering context using primary
  project sources where academic literature is absent.

### 3. Environment and reproducibility threats

- Game/API, StrongBot, and Supalosa.
- Why old 192-game/1,100-run artifacts were inadmissible.
- Clean baseline loading, explicit seeds, reciprocal starts, and deterministic
  replay.
- Map-family compatibility and legal redistribution boundary.

### 4. Configuration and evaluation protocol

- Coordinate-free policy space and disabled map-specific behavior.
- Five successive-halving runs and exact game budgets.
- Common-seed championship and champion freeze.
- Fresh development gate, sealed confirmatory design, estimands, and clustered
  uncertainty.

### 5. Held-out results

- Main scores, W/D/L, interval, family signs, and per-family plot.
- Failed absolute-strength gate.
- Outcome-transition visualization and family heterogeneity.
- Diagnostic bootstrap/sign-flip sensitivity, labeled post-confirmatory.

### 6. What changed in the policy?

- Seven parameter differences.
- Run-local selection diagnostic.
- Five component reverts and multiplicity.
- Terminal army/economy decomposition, including stable draw-to-draw stratum.
- Explicit statement that trajectories were not logged.

### 7. Reproducibility, limitations, and release

- 8,704-game job ledger, exact commits and artifact commitments.
- One opponent, Iraq mirror, Temperate-only supported population, high draw
  rate, no standard configurator, no trajectory telemetry.
- Author-owned release versus third-party asset licensing.
- Societal impact is limited; energy/compute accounting is CPU-oriented and
  modest relative to large-model training.

### 8. Conclusion

- Configuration can yield a large robust improvement when evaluated correctly.
- Reliable absolute superiority and general algorithmic novelty remain open.

## Tables and figures

Committed main-paper items:

1. **Figure 1 — Study flow:** 67 screened families to frozen roles, five
   searches, championship, fresh development, and sealed test.
2. **Table 1 — Search allocation:** exact successive-halving policy, family,
   slot, and launched-game counts.
3. **Table 2 — Policy differences:** every stored default/champion difference.
4. **Table 3 — Main confirmatory result:** scores, records, clustered interval,
   and both gate decisions.
5. **Figure 2 — Per-family confirmatory effects:** 16 champion-minus-default
   points with zero line; do not show unearned game-level intervals.
6. **Figure 3 — Paired outcome transitions:** default loss/draw/win to champion
   loss/draw/win counts.
7. **Figure 4 — Component contrasts:** five champion-minus-revert estimates
   with ordinary and familywise intervals.

The complete 8,704-game job ledger, public family-ID mapping, policy-space
summary, artifact commitments, adaptation history, and reproduction commands
are in the supplement.

Appendix/supplement:

- complete family-level scores;
- full policy schema and candidate-generation rules;
- optimizer finalizer commitments;
- failed/superseded attempt ledger;
- terminal metrics by outcome transition;
- clean-clone reproduction commands.

Every numeric item must be generated from committed artifacts. No table or
figure may contain a hand-copied result without a scripted consistency test.

## Likely reviewer objections and direct answers

**“This is ordinary hand-coded bot tuning.”**

Agree on the algorithmic boundary. The contribution is the reproducible,
family-disjoint evaluation and a large held-out empirical effect under exact
provenance, not a claim that successive halving is novel.

**“One opponent cannot establish a strong agent.”**

Correct. Supalosa is a fixed benchmark target. Report the failed absolute gate
and avoid population-level opponent claims.

**“The high draw rate makes 0.535 misleading.”**

Report W/D/L beside score, show the transition matrix, call tick-cap draws
survival rather than wins, and keep the absolute-strength conclusion negative.

**“Map families or simulator warnings could bias the result.”**

Document two independent outcome-free screens, family construction, exact map
hashes, exclusions, reciprocal starts, and the 16-family sealed allocation.

**“The component story is selected after seeing results.”**

Label both mechanism analyses post-confirmatory, show every null and negative
contrast, and lead with familywise intervals. The main claim does not depend on
them.

**“The benchmark is not redistributable.”**

Release author-owned orchestration, patches, protocols, manifests, hashes,
metadata, aggregate results, and asset-acquisition instructions. Do not promise
redistribution of third-party maps or game archives without verified rights.

## Acceptance-oriented completion checklist

- [x] Frozen training, development, and confirmatory runs complete.
- [x] Relative effect, absolute gate, sensitivity audit, and diagnostics frozen.
- [x] Job/result registry and empirical completion audit reconciled.
- [x] Primary-source related work verified and BibTeX committed.
- [x] Tables and figures generated and tested from artifacts.
- [x] Full manuscript drafted in the target template.
- [x] Clean-export reproduction succeeds without private absolute paths.
- [x] Anonymous aggregate review bundle and third-party boundary complete.
- [ ] Public combined-bot license or upstream permission resolved.
- [ ] Remote presentation and deadline reconfirmed from official venue pages.
- [ ] Final claim, statistics, accessibility, and anonymity audits pass.
