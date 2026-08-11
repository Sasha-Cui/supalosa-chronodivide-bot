# Human author verification packet

Prepared: **2026-08-11**

Status: **template only; human verification not yet complete**.

This packet turns the seven author-accountability requirements in
`research/AUTHORSHIP_AND_AI_POLICY.md` into an evidence-indexed sign-off
procedure. It does not certify the paper, replace reading the sources, or
authorize submission. Make a private copy before adding a name, signature,
email, or other identifying information; keep this tracked version anonymous
and blank.

## Candidate identity

Verify these files before beginning. Stop if any value differs.

| Item | Frozen identity |
| --- | --- |
| Reviewed source | `ccc0c101de207a7100fd553e15efc4fa18108a35` |
| ICAART PDF | `98500e11d7ccaa6d1c0f88f2e741b499737124cdac1565190379029bc82c4c07` |
| LNCS PDF | `efcc9856799493fdb93b29f58ad895abee7b0822d075297433f273507a25aaa3` |
| LNCS supplement | `7674eb4190f422d66da9b7a9e50d464abc0c33894fbbedf85da6cb7a5d302d56` |
| Anonymous artifact | `39f761b1cb0b9fe587b197be9151e63f0ee1368b883cbf541f2bb86c33ea5437` |
| ICAART portal metadata | `285af4e101ea36d6e5190a3c0ceb5d4a52ded5e56f96210b1295360bb077e4ca` |

Run from the repository root:

```text
git rev-parse 92a4c87
sha256sum paper/build/main.pdf paper/build/supplement.pdf
sha256sum paper_scitepress/build/main.pdf
python3 artifact/scripts/verify_frozen_archive.py
sha256sum artifact/dist/chrono-divide-review-artifact.tar.gz
make -C paper_scitepress metadata
sha256sum paper_scitepress/build/submission_metadata.json
```

Private record fields:

- verifier and date: `[private]`
- candidate identities matched: `[ ]`
- tools used for independent calculations: `[private]`
- deviations or unresolved questions: `[private]`

## 1. Claim-by-claim manuscript approval

Read the complete ICAART PDF first, without relying on this summary. Then read
`paper/main.tex`, `paper/supplement.tex`, every imported file under
`paper/sections/`, and `paper_scitepress/abstract.tex`. For each row, record the
exact page or sentence reviewed and whether the wording is supported.

| Boundary to approve | Authoritative evidence | Human status |
| --- | --- | --- |
| Positive claim is champion minus frozen generic reference | `research/artifacts/method_v2_confirmatory_result_v1.json`; `research/METHOD_V2_CONFIRMATORY_RESULT.md` | `[ ]` |
| Absolute superiority over Supalosa and the joint gate fail | same confirmatory record; `research/CONFIRMATORY_PROTOCOL.md` | `[ ]` |
| Comparator is not the deployed map-profile-enabled default | `paper/sections/protocol.tex`; `research/EMPIRICAL_COMPLETION_AUDIT.md` | `[ ]` |
| Chrono Divide is an existing environment | `paper/sections/introduction.tex`; `paper/sections/environment.tex` | `[ ]` |
| Successive halving and common random numbers are established methods | `paper/sections/related_work.tex`; `paper/sections/reproducibility.tex` | `[ ]` |
| Component and terminal analyses are post-confirmatory and non-causal | `research/METHOD_V2_COMPONENT_ABLATION_RESULT.md`; `research/METHOD_V2_TERMINAL_STATE_ANALYSIS.md` | `[ ]` |
| Scope is one pinned opponent, Iraq mirror, simulator revision, and Temperate family population | `paper/sections/reproducibility.tex`; `research/SUPPORTED_SCOPE_DECISION.md` | `[ ]` |
| Release statements exclude unauthorized third-party content | `artifact/THIRD_PARTY.md`; `research/ANONYMITY_RELEASE_RISK.md` | `[ ]` |
| Anonymous archive reconstructs outside the repository | `research/ARTIFACT_CLEANROOM_REPRODUCTION.md` | `[ ]` |

Reject or rewrite any sentence that implies a new environment, novel general
optimizer, deployed-default improvement, causal component, broad agent
strength, reliable Supalosa superiority, or paradigm shift.

## 2. Independent numerical verification

Do not merely compare displayed numbers. Inspect the JSON fields, write the
calculation independently in a calculator, spreadsheet, R, or separately
authored script, and retain the formulas and output privately.

### Descriptive scores and design

Source: `research/artifacts/method_v2_confirmatory_result_v1.json`.

| Calculation | Expected value | Human status |
| --- | ---: | --- |
| Reference games: `1 + 100 + 155` | 256 | `[ ]` |
| Reference score: `(1 + 0.5 * 100) / 256` | 0.19921875 | `[ ]` |
| Champion games: `47 + 180 + 29` | 256 | `[ ]` |
| Champion score: `(47 + 0.5 * 180) / 256` | 0.53515625 | `[ ]` |
| Score difference | 0.3359375 | `[ ]` |
| Planned games: `16 * 8 * 2 * 2` | 512 | `[ ]` |
| Completed tasks / failures / extra attempts | 128 / 0 / 0 | `[ ]` |

### Family-level inference

Use `research/artifacts/method_v2_confirmatory_family_diagnostics_v1.json` to
recompute the equal mean and signs of all 16 family effects. Then use the 128
reciprocal block records in the private single-unblinding evidence at
`research-evidence/confirmatory-v2/champion-v2-698dc76/confirmatory-unblinding.json`
to independently implement Eq. 4 in `paper/sections/protocol.tex`.

| Quantity | Expected value | Human status |
| --- | ---: | --- |
| Mean family effect | 0.3359375 | `[ ]` |
| Positive / zero / negative families | 14 / 2 / 0 | `[ ]` |
| Family-clustered SE | 0.056947355531958926 | `[ ]` |
| Two-sided 95% interval | [0.21455708493060094, 0.45731791506939906] | `[ ]` |
| Champion absolute margin | 0.03515625 | `[ ]` |
| Absolute family-clustered SE | 0.03213271531055486 | `[ ]` |
| One-sided 95% lower bound | -0.021174018004535798 | `[ ]` |
| Relative / absolute / joint gate | pass / fail / fail | `[ ]` |

Confirm that the technical gate preceded the single unblinding and that the
unblinding SHA-256 is
`2f55de50b4cb4a110b3d8d48a3734866e23fac954f2254ef47556bd041fc0cfb`.

### Full accepted-path accounting

Source: `research/artifacts/accepted_compute_accounting_v1.json` and
`research/EMPIRICAL_COMPLETION_AUDIT.md`.

| Calculation | Expected value | Human status |
| --- | ---: | --- |
| Stage game-count sum | 8,704 | `[ ]` |
| Accepted allocations | 562 | `[ ]` |
| Core-seconds / core-hours | 1,039,401 / 288.7225 | `[ ]` |
| GPU allocations | 0 | `[ ]` |
| Maximum batch-step RSS | 1,712,252 KiB | `[ ]` |

Also reconcile the diagnostic point estimates and uncertainty directly from
`research/artifacts/method_v2_mechanism_ablation_result_v1.json`,
`research/artifacts/method_v2_component_ablation_result_v1.json`, and
`research/artifacts/method_v2_terminal_state_analysis_v1.json`; verify that
none is promoted to a confirmatory or causal result.

## 3. Citation-by-citation source reading

Open each entry in `paper/references.bib`, follow its DOI or pinned URL, and
read enough of the primary source to verify the proposition below. Record the
pages or sections consulted. A correct title or abstract alone is insufficient
when the manuscript makes a detailed methodological claim.

`research/CITATION_INTEGRITY_AUDIT.md` records an automated resolution and
title/year metadata precheck. `research/SUBSTANTIVE_CITATION_AUDIT.md` records
a machine-assisted proposition-level precheck, including the one source-
placement and closest-work corrections made before this candidate was frozen. Both are useful
review aids, but neither replaces reading the primary source, checking the
recorded locator, or completing a row below.

`research/ORIGINALITY_AND_NOVELTY_SCREEN.md` records a limited current-literature
and exact-phrase web screen. It is not a similarity certificate and does not
replace primary-source reading or review of a venue-generated similarity report.

| BibTeX key | Proposition to verify | Manuscript location | Human status |
| --- | --- | --- | --- |
| `elimam2026maco` | MACO is a recent game-AI environment/testbed | introduction | `[ ]` |
| `ontanon2018microrts` | microRTS is an RTS research testbed | introduction | `[ ]` |
| `vinyals2017sc2le` | SC2LE exposes StarCraft II as an AI research environment | introduction | `[ ]` |
| `samvelyan2019smac` | SMAC is a StarCraft-based multi-agent benchmark | introduction | `[ ]` |
| `chronodivide2026` | Chrono Divide is an existing browser reconstruction of Red Alert 2 | introduction; environment | `[ ]` |
| `chronodivideGameApi2026` | Pinned game API package/version and offline interface | environment | `[ ]` |
| `supalosa2026bot` | Supalosa repository and pinned opponent revision | introduction; environment | `[ ]` |
| `fernandezAres2011optimizing` | Rule-system constants were optimized for Planet Wars | related work | `[ ]` |
| `young2012goal` | StarCraft goal priorities were evolved | related work | `[ ]` |
| `othman2012starcraft` | XML-configured StarCraft tactical behavior was optimized | related work | `[ ]` |
| `liu2016microbehaviors` | Microbehavior parameters and transfer to unseen combat scenarios were studied | related work | `[ ]` |
| `ouessai2022evolving` | A genetic algorithm configured action-preselection heuristics for particular $\mu$RTS map--opponent settings | related work | `[ ]` |
| `mora2012noisy` | Noisy RTS fitness motivates repeated combats, maps, and reevaluation | related work; supplement | `[ ]` |
| `castejon2026tales` | Recent work compares evolutionary training modes for a weighted game bot | related work | `[ ]` |
| `marino2021programmatic` | Map-specific programmatic $\mu$RTS strategies were synthesized from a domain-specific language | related work | `[ ]` |
| `medeiros2022sketches` | Learned sketches guide programmatic-strategy synthesis in $\mu$RTS | related work | `[ ]` |
| `aleixo2023bilevel` | Bilevel feature--program search strengthens programmatic-strategy synthesis in $\mu$RTS | related work | `[ ]` |
| `moraes2023opponents` | Local Learner selects reference strategies to guide programmatic-strategy synthesis in $\mu$RTS | related work | `[ ]` |
| `moraes2024semantic` | Library-induced semantic-space neighborhoods improve programmatic-policy search efficiency in $\mu$RTS | related work | `[ ]` |
| `fernandezAres2012map` | Specialized policies were selected using online map characterization | related work; supplement | `[ ]` |
| `hutter2011smac` | SMAC configures algorithms over problem instances | related work | `[ ]` |
| `lopezIbanez2016irace` | irace separates configuration and evaluation instances | related work | `[ ]` |
| `lucas2018ntbea` | NTBEA applies to discrete game-agent configuration | related work | `[ ]` |
| `lucas2019model` | Model-based game configurators expose parameter interactions | related work | `[ ]` |
| `li2018hyperband` | Hyperband allocates increasing resources to fewer candidates | related work | `[ ]` |
| `eggensperger2019pitfalls` | Configurator comparisons are vulnerable to scenario, tuning, and budget choices | related work; supplement | `[ ]` |
| `cobbe2019coinrun` | Agents can overfit training levels | related work | `[ ]` |
| `cobbe2020procgen` | Procgen motivates explicit train/test level distributions | related work | `[ ]` |
| `balla2020generalisation` | Training-level choice and stochasticity affect GVGAI generalization | related work | `[ ]` |
| `agarwal2021precipice` | Few-task point estimates can be unstable; uncertainty-aware evaluation is needed | related work; supplement | `[ ]` |
| `machado2018ale` | Protocol variation and controlled stochasticity matter in ALE | related work | `[ ]` |
| `henderson2018matters` | Environment nondeterminism, seeds, and reporting choices affect conclusions | related work | `[ ]` |
| `bhatia2023generally` | A Generals.io framework exposed quadrant-dependent scripted-bot performance, connected it to directional path-selection bias, and evaluated a repair | related work | `[ ]` |
| `schruben2011crn` | Common random numbers provide paired simulation variance reduction | related work | `[ ]` |

For every row, record one of: `verified`, `wording corrected`, `citation
replaced`, or `unresolved`. Do not sign this section with an unresolved row.

## 4. Adaptation, sealing, and scheduler history

Review the following in chronological order and compare them with
`research/RESULT_REGISTRY.tsv`:

| Question | Primary records | Human status |
| --- | --- | --- |
| Why old exploratory wins are excluded | `research/FORENSIC_AUDIT.md`; `research/DECISIONS_2026-08-04.md` | `[ ]` |
| How map copies/revisions were grouped and roles sealed | `research/MAP_FAMILY_ELIGIBILITY.md`; `research/artifacts/family_role_commitments_v1.json` | `[ ]` |
| Why method v1 was retired | `research/METHOD_INTERFACE_GATE.md`; `research/METHOD_V2_PROTOCOL.md` | `[ ]` |
| Why method v2 used a fresh development pool | `research/METHOD_V2_DEVELOPMENT_PROTOCOL.md`; `research/METHOD_V2_DEVELOPMENT_AMENDMENT_1.md` | `[ ]` |
| What was frozen before test opening | `research/CONFIRMATORY_PROTOCOL.md` | `[ ]` |
| Why confirmatory evidence is one indivisible campaign | technical gate and single unblinding under the private confirmatory root | `[ ]` |
| Which failed attempts launched zero games | `research/EMPIRICAL_COMPLETION_AUDIT.md`; registry rows for `21655409`--`21655413` and `21938264` | `[ ]` |
| Which failure required a prospective full restart | `research/METHOD_V2_DEVELOPMENT_AMENDMENT_1.md` | `[ ]` |
| Why no additional test-family games are permitted | `research/EMPIRICAL_COMPLETION_AUDIT.md` | `[ ]` |

Confirm explicitly that no partial, failed, superseded, or exploratory outcome
is pooled into a paper estimate.

## 5. Author-owned code review

The author must inspect behavior- and analysis-relevant changes, not merely
run their tests. Use `git show --stat <revision>` and
`git show <revision>:<path>` to inspect the exact file state used at each
stage. Use `git log --follow -- <path>` followed by
`git show <change-revision> -- <path>` to inspect its relevant history, and
retain private notes about the reviewed invariants. TypeScript filenames below
are under `packages/chronodivide-bot-driver/src/`; use `git ls-files` to resolve
each basename before review.

| Stage | Frozen revision | Highest-risk code | Human status |
| --- | --- | --- | --- |
| Deterministic game and participant streams | `f2af19a`, `57b81f9` | `seededOfflineGame.ts`, `headToHead.ts`, `provenance.ts` | `[ ]` |
| Coordinate-free policy and optimizer | `bbe7616` | `researchPolicy.ts`, `researchPlanGenerator.ts`, `researchStageReducer.ts`, `researchOptimizerFinalizer.ts` | `[ ]` |
| Common-seed championship | `f11dcd6` | championship generator/reducer and tests | `[ ]` |
| Fresh development gate | `a955ce5` | development-v2 generator, runner, technical gate, unblinder | `[ ]` |
| Confirmatory evaluation | `698dc76` | confirmatory generator, runner, technical gate, unblinder | `[ ]` |
| Optimizer diagnostic | `29ced1d` | mechanism-ablation generator, gate, analyzer | `[ ]` |
| Component diagnostic | `4ada6ed` | component-ablation generator, gate, analyzer | `[ ]` |
| Terminal analysis | `806f685` | `research/scripts/analyze_terminal_states.py` | `[ ]` |
| Paper aggregates and figures | `b08b75e`, `3f6fa36` | `paper/scripts/generate_assets.py` and tests | `[ ]` |

At minimum verify seed namespaces, reciprocal slots, policy identities, role
access, launch counting, no-retry rules, account checks, overwrite refusal,
cluster units, and confirmatory-versus-diagnostic labels.

## 6. Confidentiality, rights, and release review

- `[ ]` Confirm no confidential or personal material was supplied to a
  generative system contrary to applicable terms.
- `[ ]` Review `research/ANONYMITY_RELEASE_RISK.md` and independently scan the
  final PDF and archive for author, institution, account, private-path, and
  personal-repository identifiers.
- `[ ]` Review `artifact/THIRD_PARTY.md`; confirm the anonymous artifact contains
  no bot packages, maps, MIX archives, Chrono Divide runtime, Red Alert 2
  assets, or private raw logs.
- `[ ]` Retain written Supalosa permission before redistributing derived bot
  code and maintainer guidance before redistributing any Chrono Divide runtime
  component.
- `[ ]` Confirm public availability prose distinguishes aggregate
  reproducibility from full match replay.

## 7. Venue ruling and disclosure approval

- `[ ]` Send the factual ICAART inquiry in `research/CONTACT_TEMPLATES.md`.
- `[ ]` Retain the reply resolving remote presentation, named-repository
  handling, blind-review AI-disclosure placement, and artifact delivery.
- `[ ]` Complete every section above before using the draft disclosure in
  `research/AUTHORSHIP_AND_AI_POLICY.md`.
- `[ ]` Apply only the venue-approved wording and citation form.
- `[ ]` Rebuild, rehash, rerun anonymity checks, and repeat PDF QA after any
  disclosure or source edit.

## Final private sign-off

Do not fill this tracked template. The private record should contain:

```text
I personally read the manuscript and cited sources, independently checked the
reported analyses and execution history, reviewed the behavior- and
analysis-relevant author-owned code, verified the rights/privacy boundary, and
approved the venue-compliant disclosure. I understand and accept responsibility
for every claim in the submitted paper.

Verifier:
Date and timezone:
Reviewed source commit:
Submitted PDF SHA-256:
Artifact SHA-256 or "not supplied to reviewers":
Venue ruling reference:
Signature:
```

Attach the completed private record to the submission archive retained by the
author, not to the anonymous reviewer artifact.
