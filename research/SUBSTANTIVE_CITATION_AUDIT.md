# Substantive citation audit

Verified: **2026-08-30**

## Scope, identity, and boundary

This is a proposition-level precheck of the 30 bibliography keys used at 34
key-by-citation placements in the eight final manuscript sections. It is bound
to reviewed source
`75cdf7a68763007e45c737ee1773aad1cc71ded1` and SCITEPRESS PDF SHA-256
`628482e622a19700d56de5516e2f91ea1b74c48705a879a78d6b3c77ea91f7fc`.

The check compares each cited proposition with a primary paper, publisher
record, official project/package page, or pinned repository. It **does not
replace human verification**: the author must read every cited source, confirm
that its locator supports the manuscript wording, and sign a private copy of
`HUMAN_AUTHOR_VERIFICATION_PACKET.md`.

Classifications:

- **supported**: the source directly supports the bounded wording;
- **supported with wording boundary**: the source supports the recorded
  statement but not a broader interpretation;
- **source placement corrected**: the proposition is supported and its precise
  software source was added during audit.

## Proposition map

| BibTeX key | Proposition checked and primary locator | Classification |
| --- | --- | --- |
| `fernandezAres2011optimizing` | Rule-system constants were optimized for the Planet Wars bot; [Springer chapter, pp. 325--332](https://doi.org/10.1007/978-3-642-21498-1_41). | supported |
| `mora2012noisy` | Noisy RTS fitness motivates repeated games, multiple maps, and incumbent reevaluation; [journal paper, methods and Sections 4--5](https://doi.org/10.1007/s11390-012-1281-5). | supported |
| `young2012goal` | Goal priorities in a real-time strategy bot were evolved; [AIIDE paper abstract and method](https://doi.org/10.1609/aiide.v8i1.12503). | supported |
| `othman2012starcraft` | XML-configured StarCraft tactical behavior was optimized through evolutionary computation; [IEEE paper abstract and method](https://doi.org/10.1109/CIG.2012.6374182). | supported |
| `ouessai2022evolving` | A genetic algorithm configures parametric action-preselection heuristics for particular $\mu$RTS map--opponent settings, and EvoPMCTS is compared with several agents on those maps; [Entertainment Computing article abstract and method](https://doi.org/10.1016/j.entcom.2022.100493). | supported with wording boundary |
| `fernandezAres2012map` | Specialized policies are selected using online map characterization; [IEEE paper abstract and method, pp. 417--423](https://doi.org/10.1109/CIG.2012.6374185). | supported |
| `marino2021programmatic` | Map-specific programmatic $\mu$RTS strategies were synthesized from a domain-specific language; [AAAI paper, introduction and method](https://doi.org/10.1609/aaai.v35i1.16114). | supported |
| `medeiros2022sketches` | Behavioral cloning is used to learn program sketches that guide programmatic-strategy synthesis in $\mu$RTS; [AAAI paper, abstract, introduction, and method](https://doi.org/10.1609/aaai.v36i7.20744). | supported |
| `aleixo2023bilevel` | Bilevel search jointly considers state features and programs to strengthen the search signal for programmatic-strategy synthesis in $\mu$RTS; [AAAI paper, abstract, introduction, and method](https://doi.org/10.1609/aaai.v37i4.25626). | supported |
| `moraes2023opponents` | Local Learner actively selects a set of reference strategies to strengthen the search signal for programmatic-strategy synthesis and is evaluated in $\mu$RTS; [IJCAI paper, abstract and Sections 1, 5, and 6](https://doi.org/10.24963/ijcai.2023/539). | supported |
| `moraes2024semantic` | Library-induced neighborhoods approximate a programmatic language's semantic space and improve sample efficiency in $\mu$RTS; [IJCAI paper, abstract and Sections 1 and 4](https://doi.org/10.24963/ijcai.2024/662). | supported |
| `hutter2011smac` | SMAC configures algorithms over training instances and evaluates configurations on separate test instances; [author-hosted paper, Sections 4.2 and 5.1 and Table 2](https://www.cs.ubc.ca/sites/default/files/tr/2010/TR-2010-10_0.pdf). | supported |
| `lopezIbanez2016irace` | irace tunes over a set of training instances, while the documented workflow evaluates selected configurations on separate testing instances; [article Sections 2.2 and 3.2 and Appendix A.1](https://doi.org/10.1016/j.orp.2016.09.002) and [official workflow documentation](https://mlopez-ibanez.github.io/irace/). The separation is a workflow boundary, not an assertion that the core racing loop consumes test outcomes. | supported with wording boundary |
| `lucas2018ntbea` | NTBEA is applied to discrete game-agent hyperparameter configuration; [arXiv abstract and game experiments](https://arxiv.org/abs/1802.05991). | supported |
| `eggensperger2019pitfalls` | Algorithm-configurator comparisons are sensitive to scenario selection, train/test handling, tuning, and budget fairness; [JAIR paper, Sections 2.2, 4, and 5.2--5.4](https://ai.dmi.unibas.ch/research/reading_group/eggensperger-et-al-jair2019.pdf). This is a general methodological warning, not causal evidence about the present study. | supported with wording boundary |
| `li2018hyperband` | Hyperband repeatedly allocates larger resources to a smaller surviving candidate set through successive halving; [JMLR article, algorithm description](https://www.jmlr.org/papers/v18/16-558.html). | supported |
| `cobbe2019coinrun` | Agents can overfit a finite set of training levels and fail to generalize; [PMLR paper abstract and experiments](https://proceedings.mlr.press/v97/cobbe19a.html). | supported |
| `cobbe2020procgen` | Procgen uses explicit training and test level distributions to study generalization; [PMLR paper abstract and evaluation protocol](https://proceedings.mlr.press/v119/cobbe20a.html). | supported |
| `henderson2018matters` | Environment nondeterminism, seeds, and reporting choices can change deep-RL conclusions; [AAAI paper abstract and experiments](https://arxiv.org/abs/1709.06560). | supported |
| `agarwal2021precipice` | Aggregate point estimates from few runs or tasks can be unstable and uncertainty-aware evaluation is needed; [NeurIPS paper abstract and evaluation methodology](https://proceedings.neurips.cc/paper/2021/hash/f514cec81cb148559cf475e7426eed5e-Abstract.html). The source motivates robust aggregate evaluation; it does not prescribe this paper's exact family-clustered estimator. | supported with wording boundary |
| `ontanon2018microrts` | microRTS is presented as an RTS AI research testbed and competition platform; [AI Magazine article abstract and opening sections](https://doi.org/10.1609/aimag.v39i1.2777). | supported |
| `vinyals2017sc2le` | SC2LE exposes StarCraft II as an AI research environment; [arXiv abstract and introduction](https://arxiv.org/abs/1708.04782). | supported |
| `samvelyan2019smac` | SMAC is a StarCraft-based cooperative multi-agent benchmark; [arXiv abstract and benchmark description](https://arxiv.org/abs/1902.04043). | supported |
| `schruben2011crn` | Common random numbers are a paired simulation variance-reduction method; [Wiley reference entry](https://onlinelibrary.wiley.com/doi/abs/10.1002/9780470400531.eorms0166). | supported |
| `bhatia2023generally` | The Generally Genius framework supports scripted-agent development and data collection in Generals.io; its Flobot case study finds quadrant-dependent performance, links the pattern to direction-biased path selection, and evaluates an unbiased repair; [AIIDE paper abstract and pp. 400, 404--406](https://doi.org/10.1609/aiide.v19i1.27536). | supported with wording boundary |
| `chronodivide2026` | Chrono Divide is an existing browser reconstruction of *Command & Conquer: Red Alert 2*; the [project homepage](https://chronodivide.com/) supports the reconstruction claim but not, by itself, the offline API or pinned bot revision. The introduction and environment citation groups now also cite the package and repository records. | source placement corrected |
| `chronodivideGameApi2026` | The exact `@chronodivide/game-api` version 0.75.0 exists and exposes the offline-game interface used by the driver; [npm package record](https://www.npmjs.com/package/@chronodivide/game-api/v/0.75.0) and the pinned package declarations. | supported |
| `supalosa2026bot` | The public Supalosa bot, pinned opponent revision, and headless-driver role are documented by the [pinned repository revision](https://github.com/Supalosa/supalosa-chronodivide-bot/tree/165b77a71d0cf5ebd27c65b19d0486bcbae78d0f). | supported |
| `ra2web2026bot` | The public repository identifies the RA2WEB Chrono Divide bot fork used as the independent bot source; the experiment binds a separate client release and bundle hash rather than claiming the repository represents every release; [GitHub repository](https://github.com/ra2web/ra2web-chronodivide-bot). | supported with wording boundary |
| `openai2026codex` | The official product page identifies OpenAI Codex, the system named in the generative-AI disclosure; [official Codex page](https://openai.com/codex/). It is cited for system identity, not as scientific evidence. | supported |

## Disposition

All 30 cited keys have one row and a non-unresolved classification. Chrono
Divide environment claims use the project and exact package sources; Supalosa
and RA2Web use their public repositories; Codex is cited only to identify the
disclosed system. Closest-work wording distinguishes this scripted,
map-profiled agent and evidence contract from program synthesis, generic
algorithm configuration, and learned-policy benchmarks.

No empirical result, estimate, protocol, or claim was changed by this audit.
Human source reading and private sign-off remain mandatory before submission.
