# SCAG accepted-paper calibration

Reviewed: **2026-08-11**

## Purpose and boundary

This is a venue-level calibration, not a scientific meta-analysis. The 2024,
2025, and 2026 *Soft Computing Applied to Games* (SCAG) proceedings were
enumerated, and all five 2025--2026 papers were read in full. The comparison
uses what the published papers report; absence of an item below means it was
not evident in the paper, not necessarily that the authors never performed it.

Official proceedings:

- [EvoApplications 2024, Part II](https://link.springer.com/book/10.1007/978-3-031-56855-8)
- [EvoApplications 2025, Part II](https://link.springer.com/book/10.1007/978-3-031-90065-5)
- [EvoApplications 2026, Part II](https://link.springer.com/book/10.1007/978-3-032-23607-4?page=3)

## Recent session composition

SCAG published three papers in 2024, two in 2025, and three in 2026. The 2024
titles cover evolved pursuit behaviors, evolution plus deep learning for
diverse agents, and vision transformers for Go. The later five papers provide
the closest full-text comparison:

| Paper | Main contribution | Evaluation visible in paper | Reproducibility visible in paper |
| --- | --- | --- | --- |
| [Richoux 2025](https://link.springer.com/chapter/10.1007/978-3-031-90065-5_32) | Inject combinatorial optimization into MCTS for *boop* | One game; vanilla-MCTS and heuristic baselines; seven partial-method ablations; 100 games per AI pairing; 51 games against 28 humans | Versioned source and experimental results linked |
| [Vitel et al. 2025](https://link.springer.com/chapter/10.1007/978-3-031-90065-5_33) | Coordinate-system extraction for sparse black-box binary games | Synthetic number and dimension-space benchmarks; random, hill-climbing, Pareto-layering, and extraction variants; convergence, speed, and monotonicity | Code, raw data, and processed assets linked |
| [Seals and Tauritz 2026](https://link.springer.com/chapter/10.1007/978-3-032-23607-4_32) | Quantify deceptive local fitness and Hall-of-Fame effects in competitive coevolution | Parameterized number games plus a predator--prey meta-game; ground-truth round robins; multiple child/survival/HoF conditions; 30 repeated runs | Public dataset linked; supplemental plots reported |
| [Castejón et al. 2026](https://link.springer.com/chapter/10.1007/978-3-032-23607-4_33) | Compare fixed, coevolutionary, and hybrid evolutionary-strategy training for a 20-weight scripted bot | One card game; four static opponents; six final training configurations plus ten hybrid schedules; five runs; fixed-opponent and round-robin tournaments | Source, execution data, and logs linked |
| [Smith and Heywood 2026](https://link.springer.com/chapter/10.1007/978-3-032-23607-4_34) | Quantify behaviors of evolved Dota 2 Invoker agents | Twenty agents; 100 reciprocal-side matches per agent pair; nine general and four spell-use behavior classes; limited built-in-bot checks | Training/evaluation details reported; no release link was evident |

## Comparison with the Chrono Divide manuscript

| Dimension | Relative position | Evidence-based assessment |
| --- | --- | --- |
| Track-level game relevance | Comparable | The study configures and evaluates a real scripted game agent; SCAG explicitly accepts empirical CI analysis for games and game-based benchmarking. |
| Algorithmic novelty | Weaker | The accepted sample usually centers an evolutionary, coevolutionary, search, or representation method. Our mutation-generated finite pools and successive halving are established engineering choices. |
| Opponent breadth | Weaker than the closest training-mode paper | Chrono Divide has one independently authored opponent; Castejón et al. use four static bots plus evolved-agent tournaments. |
| Environment/map breadth | Strong within one matchup | Sixteen sealed map families are a meaningful within-game distribution, but all use one faction mirror, simulator version, theater, and opponent. |
| Baselines and ablations | Mixed | The shipped default is the correct product baseline and five reverts probe components, but there is no SMAC/irace/NTBEA or alternative training pipeline. Richoux and Castejón et al. have more algorithm-level comparators. |
| Leakage and selection control | Stronger | Family-disjoint roles, outcome-free compatibility screening, a fresh development gate, sealed tests, and explicit adaptation history are more complete than the controls reported in the comparison sample. |
| Uncertainty and multiplicity | Stronger | The paper reports family-clustered intervals, a bootstrap, an exact sign-flip check, and Bonferroni-controlled component contrasts. Several comparison papers rely primarily on means, win rates, or across-run plots. |
| Negative-result discipline | Stronger | The failed absolute-strength gate and unresolved mechanism contrasts are prominent and constrain the title, abstract, and conclusion. |
| Reproducibility | Strong for aggregates; limited for replay | The deterministic anonymous artifact rebuilds every table and figure. Full replay still depends on third-party code/assets and permission-sensitive redistribution. |

## Consequences for the submission

1. The paper is credible at the empirical standard visible in recent SCAG
   proceedings; lack of statistical care is not its rejection risk.
2. The dominant risk is topical and contribution fit, not execution quality.
   The manuscript must remain an empirical configuration/evaluation paper and
   must not manufacture an evolutionary-algorithm claim.
3. Castejón et al. is the closest recent prior work and is cited explicitly in
   the related-work section. The contrast is precise: they compare training
   modes; this paper audits held-out generalization across map families.
4. No new game on the opened Chrono Divide population follows from this
   calibration. A configurator comparison, second opponent, or cross-faction
   study would need a separately registered prospective experiment.
5. Submission to SCAG remains conditional on written confirmation that the
   application/evaluation emphasis is in scope and that remote presentation is
   permitted. If scope is rejected, use the broader ICAART fallback rather
   than changing the scientific story.
