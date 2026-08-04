# Venue strategy

Verified 2026-08-04 from official venue pages. Recheck the call and remote-
presentation instructions immediately before submission.

## Decision

**Provisional primary target: EvoApplications 2027, Soft Computing Applied
to Games (SCAG) special session, conditional on written confirmation of remote
presentation.** Its scope explicitly includes empirical analysis of
computational-intelligence techniques, game-based benchmarking, and competitive
coevolution. That is a close fit for a leakage-controlled comparison of global
and map-structure-conditioned StrongBot configurations.

- Paper deadline: **2026-11-01**.
- Internal paper-ready deadline: **2026-10-20**.
- Format: double-blind Springer LNCS, 14 pages plus unlimited references.
- Conference: 2027-03-31 through 2027-04-02 in Mainz, Germany.
- Attendance: EvoStar 2027 is explicitly hybrid, and the 2026 event published
  dedicated instructions and registration for online presenters. The 2027
  presenter and registration instructions are not yet posted, however, so
  remote presentation is highly plausible but not yet guaranteed. Obtain
  written confirmation by early September 2026 and retain it with the
  submission records; do not submit if physical attendance is required.
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
[presentation policy](https://icaart.scitevents.org/presentationdetails.aspx), and
[paper categories](https://icaart.scitevents.org/Guidelines.aspx?y=2027).

The SPIKE eSports special session has a 2026-12-03 deadline, but its emphasis on
player/team performance and strategy prediction is weaker than SCAG for this
agent-configuration study.

### Entertainment Computing — guaranteed no-travel fallback

Elsevier's *Entertainment Computing* is a rolling journal with no conference
attendance or presentation requirement. Its scope explicitly includes computer
and video games and theoretical, technical, and empirical work in entertainment
computing. It is the strongest fallback if remote presentation is not confirmed
or the SCAG deadline is missed.

This route requires the comprehensive study rather than a thin workshop MVP:
family-disjoint evaluation, powered uncertainty, mechanism ablations, exact
reproducibility, and a candid one-game/one-opponent scope. Subscription
publication does not require an author fee; open access is optional. Official
page: [Entertainment Computing](https://www.sciencedirect.com/journal/entertainment-computing).

### IOCAC 2027 — remote dissemination fallback only

The International Online Conference on Applied Computing is fully virtual and
free, with an abstract deadline of 2027-02-26 and a later 4--8 page proceedings
option. Its game-AI fit and archival value are substantially weaker than SCAG
or *Entertainment Computing*, so use it only as a no-travel dissemination
fallback, not as the primary publication target. Official page:
[IOCAC 2027](https://sciforum.net/event/IOCAC2027/home).

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
2. At least 26 family-disjoint held-out map families survive contamination and
   fidelity screening, unless a development-only variance recalibration made
   before protocol freeze justifies and records a different minimum.
3. The global and conditioned methods receive equal launched-attempt budgets.
4. Ten independent primary optimizer runs and the fixed-count sealed
   evaluation are complete; five-run screens remain development-only.
5. The primary estimate, uncertainty analysis, and all prespecified ablations
   are generated from registered manifests.
6. The paper states the one-Supalosa-opponent limitation and does not imply
   broad game-AI superiority.
7. Releasable original code, manifests, hashes, metadata, and aggregate results
   reproduce every table and figure.

If these gates miss the deadline, do not convert exploratory results into a
confirmatory claim. Prefer *Entertainment Computing* as the guaranteed
no-travel route; use FDG 2027 only if its eventual call explicitly permits
remote presentation, and treat IOCAC as dissemination rather than the main paper.
