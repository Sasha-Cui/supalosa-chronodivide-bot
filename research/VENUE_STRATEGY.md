# Venue strategy

Verified 2026-08-04 from official venue pages. Recheck the call and remote-
presentation instructions immediately before submission.

## Decision

**Primary target: EvoApplications 2027, Soft Computing Applied to Games
(SCAG) special session.** Its scope explicitly includes empirical analysis of
computational-intelligence techniques, game-based benchmarking, and competitive
coevolution. That is a close fit for a leakage-controlled comparison of global
and map-structure-conditioned StrongBot configurations.

- Paper deadline: **2026-11-01**.
- Internal paper-ready deadline: **2026-10-20**.
- Format: double-blind Springer LNCS, 14 pages plus unlimited references.
- Conference: 2027-03-31 through 2027-04-02 in Mainz, Germany.
- Attendance: EvoStar 2027 is explicitly hybrid, so remote presentation satisfies
  the owner's no-required-travel constraint.
- Official pages: [SCAG scope](https://www.evostar.org/2027/evoapps/scag/),
  [important dates](https://www.evostar.org/2027/important-dates/),
  [submission instructions](https://www.evostar.org/2027/submit-paper/), and
  [hybrid conference statement](https://www.evostar.org/2027/).

The project is currently **below** submission standard because deterministic
engine control, family-disjoint splits, the conditioned method, independent
optimizer runs, and confirmatory results are not complete. It will be **near**
SCAG standard if the workshop MVP passes its frozen primary endpoint and the
artifact is reproducible.

Likely reviewer concerns are that the contribution is ordinary bot tuning, the
single Supalosa opponent limits external validity, map descriptors leak identity,
the proprietary game limits reproduction, or improvements come from unequal
simulation budgets. The paper must answer these with an equal-launched-budget
design, descriptor-shuffle control, family-disjoint sealed test, coordinate-free
features, paired starts/seeds, complete provenance, and a precise one-opponent
claim.

## Fallbacks

### ICAART 2027 — conditional only

ICAART covers agent architectures, simulation, evolutionary computing,
planning, and uncertainty. Its first regular-paper deadline is 2026-09-15 and
its second regular/position round is 2026-10-22. A completed empirical study
should be submitted as a regular paper, not relabeled as a position paper.

ICAART states that remote presentation is allowed only exceptionally when a
speaker cannot travel. It is therefore not an unconditional fit for the owner's
attendance requirement. Use it only after obtaining written remote-presentation
approval from the organizers. Official pages:
[call and dates](https://icaart.scitevents.org/CallforPapers.aspx?y=2027),
[presentation policy](https://icaart.scitevents.org/?y=2027), and
[paper categories](https://icaart.scitevents.org/Guidelines.aspx?y=2027).

The SPIKE eSports special session has a 2026-12-03 deadline, but its emphasis on
player/team performance and strategy prediction is weaker than SCAG for this
agent-configuration study.

### FDG 2027 — watch list

FDG is thematically plausible and its 2026 edition supported hybrid sessions,
but no official FDG 2027 call or attendance policy was available on 2026-08-04.
Monitor the [FDG conference series](https://www.foundationsofdigitalgames.org/)
and use it only if the new call confirms both scope and remote presentation.

## Excluded current options

- **EXAG 2026:** topical, but the official call requires an in-person oral
  presentation. It conflicts with the attendance constraint.
- **IEEE CoG:** the 2026 deadlines passed, current materials do not offer a
  remote-presenter route, and no official 2027 call is posted.
- **NeurIPS/ICLR/general-ML flagships:** wrong ambition and contribution level
  for this single-game, single-opponent empirical study.
- **TMLR/DMLR:** possible only after a substantially broader study or a legally
  redistributable maintained benchmark; neither is the present target.

## Submission gate

Submit to SCAG only if all of the following are true by 2026-10-20:

1. Explicit seed control and same-seed deterministic replay tests pass.
2. At least six family-disjoint held-out map families survive contamination and
   fidelity screening.
3. The global and conditioned methods receive equal launched-attempt budgets.
4. Five optimizer runs and the fixed-count sealed evaluation are complete.
5. The primary estimate, uncertainty analysis, and all prespecified ablations
   are generated from registered manifests.
6. The paper states the one-Supalosa-opponent limitation and does not imply
   broad game-AI superiority.
7. Releasable original code, manifests, hashes, metadata, and aggregate results
   reproduce every table and figure.

If these gates miss the deadline, do not convert exploratory results into a
confirmatory claim. Hold for a hybrid FDG 2027 call or another verified
remote-friendly specialist workshop.
