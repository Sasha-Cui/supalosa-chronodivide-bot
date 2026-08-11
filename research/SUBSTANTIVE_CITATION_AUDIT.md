# Substantive citation audit

Verified: **2026-08-11**

## Scope, identity, and boundary

This is a machine-assisted proposition-level precheck of the 33 bibliography
keys used at 41 key-by-citation placements in the shared manuscript sources.
It is bound to:

- reviewed submission source:
  `4c2d011cacb4a3c98bf203153dd300e2075f142c`;
- LNCS PDF SHA-256:
  `0b0a5c55a9cbbc123693524597e520922ce927fcc21001cb5dd79b9004914bf6`;
- ICAART PDF SHA-256:
  `5a7450582b7452a9c568a08247e39cc9e9f0f5e0e1afcc9e9986ec9ef8ca5f21`.

The check compared every cited proposition with the primary paper,
publisher record, project page, package record, or pinned repository named
below. It does **not** replace human verification: the author must still read
each source, inspect the cited page or section, confirm the complete
bibliographic record, and sign the private verification packet. Abstracts
were treated as adequate only for claims made at the same level of
generality; detailed method claims were checked against the paper body or
software interface.

Classifications mean:

- **supported**: the cited source directly supports the manuscript wording;
- **supported with wording boundary**: the source supports the bounded
  wording recorded here, but would not support a broader interpretation;
- **source placement corrected**: the proposition was supportable, but its
  original citation group omitted the precise software/repository source.

## Proposition map

| BibTeX key | Proposition checked and primary locator | Classification |
| --- | --- | --- |
| `elimam2026maco` | MACO is presented as a strategic board-game environment for advanced AI research; [SCITEPRESS paper abstract and introduction](https://doi.org/10.5220/0014358500004052). | supported |
| `ontanon2018microrts` | microRTS is presented as an RTS AI research testbed and competition platform; [AI Magazine article abstract and opening sections](https://doi.org/10.1609/aimag.v39i1.2777). | supported |
| `vinyals2017sc2le` | SC2LE exposes StarCraft II as an AI research environment; [arXiv abstract and introduction](https://arxiv.org/abs/1708.04782). | supported |
| `samvelyan2019smac` | SMAC is a StarCraft-based cooperative multi-agent benchmark; [arXiv abstract and benchmark description](https://arxiv.org/abs/1902.04043). | supported |
| `chronodivide2026` | Chrono Divide is an existing browser reconstruction of *Command & Conquer: Red Alert 2*; the [project homepage](https://chronodivide.com/) supports the reconstruction claim but not, by itself, the offline API or pinned bot revision. The introduction and environment citation groups now also cite the package and repository records. | source placement corrected |
| `chronodivideGameApi2026` | The exact `@chronodivide/game-api` version 0.75.0 exists and exposes the offline-game interface used by the driver; [npm package record](https://www.npmjs.com/package/@chronodivide/game-api/v/0.75.0) and the pinned package declarations. | supported |
| `supalosa2026bot` | The public Supalosa bot, pinned opponent revision, and headless-driver role are documented by the [pinned repository revision](https://github.com/Supalosa/supalosa-chronodivide-bot/tree/165b77a71d0cf5ebd27c65b19d0486bcbae78d0f). | supported |
| `fernandezAres2011optimizing` | Rule-system constants were optimized for the Planet Wars bot; [Springer chapter, pp. 325--332](https://doi.org/10.1007/978-3-642-21498-1_41). | supported |
| `young2012goal` | Goal priorities in a real-time strategy bot were evolved; [AIIDE paper abstract and method](https://doi.org/10.1609/aiide.v8i1.12503). | supported |
| `othman2012starcraft` | XML-configured StarCraft tactical behavior was optimized through evolutionary computation; [IEEE paper abstract and method](https://doi.org/10.1109/CIG.2012.6374182). | supported |
| `liu2016microbehaviors` | Microbehavior parameters were evolved and evaluated beyond their training combat scenarios; [IEEE article abstract and experiments](https://doi.org/10.1109/TCIAIG.2016.2544844). | supported |
| `ouessai2022evolving` | A genetic algorithm configures parametric action-preselection heuristics for particular $\mu$RTS map--opponent settings, and EvoPMCTS is compared with several agents on those maps; [Entertainment Computing article abstract and method](https://doi.org/10.1016/j.entcom.2022.100493). | supported with wording boundary |
| `mora2012noisy` | Noisy RTS fitness motivates repeated games, multiple maps, and incumbent reevaluation; [journal paper, methods and Sections 4--5](https://doi.org/10.1007/s11390-012-1281-5). | supported |
| `castejon2026tales` | The work compares coevolution, fixed, and hybrid training modes for a bot governed by weighted behavioral rules; [Springer chapter](https://doi.org/10.1007/978-3-032-23607-4_33). | supported |
| `marino2021programmatic` | Map-specific programmatic $\mu$RTS strategies were synthesized from a domain-specific language; [AAAI paper, introduction and method](https://doi.org/10.1609/aaai.v35i1.16114). | supported |
| `medeiros2022sketches` | Behavioral cloning is used to learn program sketches that guide programmatic-strategy synthesis in $\mu$RTS; [AAAI paper, abstract, introduction, and method](https://doi.org/10.1609/aaai.v36i7.20744). | supported |
| `aleixo2023bilevel` | Bilevel search jointly considers state features and programs to strengthen the search signal for programmatic-strategy synthesis in $\mu$RTS; [AAAI paper, abstract, introduction, and method](https://doi.org/10.1609/aaai.v37i4.25626). | supported |
| `moraes2023opponents` | Local Learner actively selects a set of reference strategies to strengthen the search signal for programmatic-strategy synthesis and is evaluated in $\mu$RTS; [IJCAI paper, abstract and Sections 1, 5, and 6](https://doi.org/10.24963/ijcai.2023/539). | supported |
| `moraes2024semantic` | Library-induced neighborhoods approximate a programmatic language's semantic space and improve sample efficiency in $\mu$RTS; [IJCAI paper, abstract and Sections 1 and 4](https://doi.org/10.24963/ijcai.2024/662). | supported |
| `fernandezAres2012map` | Specialized policies are selected using online map characterization; [IEEE paper abstract and method, pp. 417--423](https://doi.org/10.1109/CIG.2012.6374185). | supported |
| `hutter2011smac` | SMAC configures algorithms over training instances and evaluates configurations on separate test instances; [author-hosted paper, Sections 4.2 and 5.1 and Table 2](https://www.cs.ubc.ca/sites/default/files/tr/2010/TR-2010-10_0.pdf). | supported |
| `lopezIbanez2016irace` | irace tunes over a set of training instances, while the documented workflow evaluates selected configurations on separate testing instances; [article Sections 2.2 and 3.2 and Appendix A.1](https://doi.org/10.1016/j.orp.2016.09.002) and [official workflow documentation](https://mlopez-ibanez.github.io/irace/). The separation is a workflow boundary, not an assertion that the core racing loop consumes test outcomes. | supported with wording boundary |
| `lucas2018ntbea` | NTBEA is applied to discrete game-agent hyperparameter configuration; [arXiv abstract and game experiments](https://arxiv.org/abs/1802.05991). | supported |
| `lucas2019model` | Competitive model-based game configurators expose useful parameter interactions; [arXiv abstract, results, and interaction figures](https://arxiv.org/abs/1901.00723). | supported |
| `li2018hyperband` | Hyperband repeatedly allocates larger resources to a smaller surviving candidate set through successive halving; [JMLR article, algorithm description](https://www.jmlr.org/papers/v18/16-558.html). | supported |
| `eggensperger2019pitfalls` | Algorithm-configurator comparisons are sensitive to scenario selection, train/test handling, tuning, and budget fairness; [JAIR paper, Sections 2.2, 4, and 5.2--5.4](https://ai.dmi.unibas.ch/research/reading_group/eggensperger-et-al-jair2019.pdf). This is a general methodological warning, not causal evidence about the present study. | supported with wording boundary |
| `cobbe2019coinrun` | Agents can overfit a finite set of training levels and fail to generalize; [PMLR paper abstract and experiments](https://proceedings.mlr.press/v97/cobbe19a.html). | supported |
| `cobbe2020procgen` | Procgen uses explicit training and test level distributions to study generalization; [PMLR paper abstract and evaluation protocol](https://proceedings.mlr.press/v119/cobbe20a.html). | supported |
| `balla2020generalisation` | Training-level selection and stochasticity affect generalization in GVGAI; [official IEEE CoG paper, setup and results](https://ieee-cog.org/2020/papers/paper_151.pdf). | supported |
| `agarwal2021precipice` | Aggregate point estimates from few runs or tasks can be unstable and uncertainty-aware evaluation is needed; [NeurIPS paper abstract and evaluation methodology](https://proceedings.neurips.cc/paper/2021/hash/f514cec81cb148559cf475e7426eed5e-Abstract.html). The source motivates robust aggregate evaluation; it does not prescribe this paper's exact family-clustered estimator. | supported with wording boundary |
| `machado2018ale` | Protocol variation and controlled stochasticity materially affect ALE evaluation; [JAIR paper abstract and protocol review](https://arxiv.org/abs/1709.06009). | supported |
| `henderson2018matters` | Environment nondeterminism, seeds, and reporting choices can change deep-RL conclusions; [AAAI paper abstract and experiments](https://arxiv.org/abs/1709.06560). | supported |
| `schruben2011crn` | Common random numbers are a paired simulation variance-reduction method; [Wiley reference entry](https://onlinelibrary.wiley.com/doi/abs/10.1002/9780470400531.eorms0166). | supported |

## Correction and disposition

The manuscript edits justified by this audit were source attribution and
closest-work positioning. The Chrono Divide website supports the reconstruction
claim, while the exact
offline interface and pinned bot revision are supported by the package and
repository records. Commit `e91674f4eff69c4ceccb3a65e617cfb91d01ec5c`
therefore cites all three sources at the two environment-description
placements and positions the evaluation contribution against the closest
map-specific and later program-synthesis work. Commit
`92a4c870b6e697682b51fa41fd0f785c97c6b121` additionally records the close
automatic action-preselection configuration precedent while distinguishing
its map--opponent-specific setup. No empirical result, method description,
scope boundary, or conclusion changed.

All 33 keys have a source-support classification above. This precheck found
no citation use that required claim removal or a bibliographic replacement.
Human source reading and the blank statuses in
`research/HUMAN_AUTHOR_VERIFICATION_PACKET.md` remain mandatory before
submission.
