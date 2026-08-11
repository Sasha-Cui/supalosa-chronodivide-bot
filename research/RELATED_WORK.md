# Related work and novelty map

This is a verified seed bibliography, not a systematic review. Each link below
resolves to the publisher or DOI record. A submission requires forward/backward
citation search and coverage of work published after these papers.

| Work | What it establishes | Consequence for this project |
|---|---|---|
| Fernández-Ares et al. (2011), [“Optimizing Strategy Parameters in a Game Bot”](https://doi.org/10.1007/978-3-642-21498-1_41), IWANN, pp. 325–332 | Evolutionary optimization of constants, weights, and probabilities in a hand-designed Planet Wars rule system, evaluated across maps. | Evolving scripted-bot parameters is prior art, not this project's novelty. |
| Mora et al. (2012), [“Effect of Noisy Fitness in Real-Time Strategy Games Player Behaviour Optimisation Using Evolutionary Algorithms”](https://doi.org/10.1007/s11390-012-1281-5), JCST 27(5):1007–1023 | Repeated combats, multiple maps, and elite/incumbent reevaluation mitigate noisy fitness in RTS bot tuning. | The reconstructed legacy runs exposed uncontrolled wall-clock randomness; the frozen study therefore uses explicit engine and participant streams, reciprocal starts, common-seed comparisons, and family-level inference. |
| Young & Hawes (2012), [“Evolutionary Learning of Goal Priorities in a Real-Time Strategy Game”](https://doi.org/10.1609/aiide.v8i1.12503), AIIDE 8(1):87–92 | Case-injected genetic optimization of StarCraft goal-priority profiles and comparison to static knowledge. | Seeded evolutionary tuning of high-level scripted priorities is established. |
| Othman et al. (2012), [“Simulation-based Optimization of StarCraft Tactical AI through Evolutionary Computation”](https://doi.org/10.1109/CIG.2012.6374182), IEEE CIG, pp. 394–401 | Simulation-based evolutionary refinement of XML-configured StarCraft tactical behavior. | A simulator plus evolutionary tactical tuning is established; equal-launched-budget comparisons and transfer are needed. |
| Liu, Louis & Ballinger (2016), [“Evolving Effective Microbehaviors in Real-Time Strategy Games”](https://doi.org/10.1109/TCIAIG.2016.2544844), IEEE TCIAIG 8(4):351–362 | GA tuning of 14 potential-field/influence-map parameters, including limited transfer to unseen combat scenarios. | Unseen-scenario transfer has direct precedent; this paper must go beyond a single tuned map and compare mechanisms. |
| Hutter, Hoos & Leyton-Brown (2011), [“Sequential Model-Based Optimization for General Algorithm Configuration”](https://doi.org/10.1007/978-3-642-25566-3_40), LION 5, pp. 507–523 | Introduces random-forest SMAC for mixed configuration spaces and sets of instances. | SMAC is an essential standard configurator baseline if the paper discusses optimization quality. |
| López-Ibáñez et al. (2016), [“The irace Package: Iterated Racing for Automatic Algorithm Configuration”](https://doi.org/10.1016/j.orp.2016.09.002), OR Perspectives 3:43–58 | Iterated racing for mixed/conditional parameters; explicitly separates tuning instances from unseen test instances. | Family-disjoint tuning/test data are established algorithm-configuration practice, not an optional refinement. |
| Lucas, Liu & Pérez-Liébana (2018), [“The N-Tuple Bandit Evolutionary Algorithm for Game Agent Optimisation”](https://doi.org/10.1109/CEC.2018.8477869), IEEE CEC, pp. 1–9 | NTBEA uses n-tuple statistics, UCB exploration, and evolutionary neighborhoods for noisy, expensive game-agent configuration. | NTBEA is a particularly relevant game-oriented comparison for the discrete configuration space. |
| Fernández-Ares et al. (2012), [“Adaptive Bots for Real-Time Strategy Games via Map Characterization”](https://doi.org/10.1109/CIG.2012.6374185), IEEE CIG, pp. 417–423 | Evolves bots for map types and selects among them using online map characterization, outperforming a general offline-trained bot. | This is the closest novelty collision: map-conditioned portfolios and their comparison to a generalist are prior art; the contribution must be leakage-controlled held-out and worst-group evaluation, not map selection itself. |
| Lucas et al. (2019), [“Efficient Evolutionary Methods for Game Agent Optimisation: Model-Based is Best”](https://arxiv.org/abs/1901.00723), AAAI Games and Simulations workshop | Directly compares NTBEA and SMAC on Fast Planet Wars and finds both competitive while exposing useful parameter interactions. | A game-agent study should compare configurators under equal launched-simulation budgets rather than presenting the local GA alone. |
| Eggensperger, Lindauer & Hutter (2019), [“Pitfalls and Best Practices in Algorithm Configuration”](https://doi.org/10.1613/jair.1.11420), JAIR 64:861–893 | Catalogues failures in configuration scenario design, configurator comparison, over-tuning, and validation. | The sealed family split, equal launched-attempt ledger, repeated optimizer runs, and final validation are core validity requirements, not merely artifact polish. |

## RTS benchmark and inference landscape

- Vinyals et al. (2017), [*StarCraft II: A New Challenge for Reinforcement
  Learning*](https://arxiv.org/abs/1708.04782), introduced SC2LE/PySC2,
  mini-games, expert replays, and standardized supervised/RL interfaces. It is
  a heavier commercial-game precedent for task standardization.
- Machado et al. (2018), [*Revisiting the Arcade Learning Environment:
  Evaluation Protocols and Open Problems for General
  Agents*](https://doi.org/10.1613/jair.5699), show that divergent evaluation
  practices can make results within one nominal benchmark incomparable and
  introduce controlled stochasticity. This is the closest precedent for
  treating simulator randomness and evaluation protocol as first-class study
  variables.
- Henderson et al. (2018), [*Deep Reinforcement Learning That
  Matters*](https://doi.org/10.1609/aaai.v32i1.11694), document sensitivity to
  environment nondeterminism, random seeds, hyperparameters, and reporting
  choices. StrongBot is scripted rather than deep RL, but its head-to-head
  outcomes have the same need for controlled randomness and uncertainty.
- Ontañón et al. (2018), [*The First microRTS Artificial Intelligence
  Competition*](https://doi.org/10.1609/aimag.v39i1.2777), established μRTS as
  a shared simplified RTS competition substrate. Chrono Divide required an
  additional seed-isolation layer to make cross-process comparisons
  deterministic.
- Andersen, Goodwin & Granmo (2018), [*Deep RTS: A Game Environment for Deep
  Reinforcement Learning in Real-Time Strategy Games*](https://doi.org/10.1109/CIG.2018.8490409),
  foregrounded the speed/fidelity tradeoff in accelerated RTS simulation.
- Samvelyan et al. (2019), [*The StarCraft Multi-Agent
  Challenge*](https://arxiv.org/abs/1902.04043), standardized decentralized
  micromanagement scenarios and MARL evaluation. This SMAC benchmark is
  distinct from the SMAC algorithm configurator cited above.
- Balla, Lucas & Pérez-Liébana (2020), [*Evaluating Generalisation in General
  Video Game Playing*](https://doi.org/10.1109/CoG47356.2020.9231530), train on
  visible GVGAI levels and evaluate hidden ones, finding that training-level
  selection and stochasticity affect transfer. Hidden-level evaluation is
  therefore prior art; this study's narrower distinction is revision-aware map
  families and sealed outcome access in a nonprocedural corpus.
- Agarwal et al. (2021), [*Deep Reinforcement Learning at the Edge of the
  Statistical Precipice*](https://proceedings.neurips.cc/paper/2021/hash/f514cec81cb148559cf475e7426eed5e-Abstract.html),
  motivates task-stratified intervals, performance profiles, and probability of
  improvement; raw matches sharing a policy/run are not independent samples.
- Menzel (2021), [*Bootstrap With Cluster-Dependence in Two or More
  Dimensions*](https://doi.org/10.3982/ECTA15383), is the relevant reference
  when maps and opponents are crossed dependence dimensions. Neither method
  compensates for having only a few unique map/opponent clusters.

OpenRA-RL is not included as scholarly prior art: as of the audit, its own
[research page](https://openra-rl.dev/research/) said an academic paper was
forthcoming and no archival paper was verified.

## What is and is not novel

Not novel on present evidence:

- use of a genetic/evolutionary algorithm;
- tuning numeric or categorical parameters in a scripted RTS bot;
- simulation-based head-to-head evaluation;
- map-specific policies;
- observing that stochastic match fitness is noisy;
- testing transfer to unseen scenarios in principle.

Supported contribution in the frozen study:

- an exact-provenance reconstruction identifying baseline, map-family, start,
  randomness, and adaptive-test failure modes in exploratory RTS bot runs;
- a low-cost Chrono Divide evaluation protocol with reciprocal starts,
  participant-isolated random streams, family-disjoint roles, repeated searches,
  sealed outcomes, and family-clustered uncertainty;
- a held-out case study showing a 0.336 family-weighted improvement over a
  prospectively frozen generic reference while preserving a negative
  absolute-strength conclusion;
- an author-owned manifest/hash artifact layer whose aggregate results can be
  regenerated without redistributing third-party game assets.

The strongest novelty sentence supported by the completed evidence is:

> This study contributes an integrated, leakage-resistant configuration and
> evaluation workflow for a scripted Chrono Divide agent, together with held-out
> evidence that the workflow substantially improves a frozen generic StrongBot
> reference against one pinned opponent without establishing absolute
> superiority. The comparator is not the deployed map-profile-enabled default.

The manuscript bibliography now covers the primary sources used by the paper.
It remains a scoped review rather than evidence of a universal literature gap;
the paper therefore claims an integrated empirical contribution rather than
that no prior reproducible game-agent configuration workflow exists.
