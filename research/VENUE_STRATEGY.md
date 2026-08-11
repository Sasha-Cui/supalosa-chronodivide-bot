# Venue strategy

Verified **2026-08-11** from official venue pages. Recheck the call,
registration price, and presenter instructions immediately before submission.

## Decision

**Primary target: EvoApplications 2027, Soft Computing Applied to Games (SCAG)
special session.** This is the best topical and ambition-level fit for the
completed study. EvoApplications explicitly welcomes applications of
evolutionary computation, including significant work in progress, while SCAG's
current call lists empirical analysis of computational-intelligence techniques
for games and game-based benchmarking and says bio-inspired approaches are
especially encouraged rather than required. The study uses five run-distinct,
deterministically mutation-generated policy pools and successive halving. This
is finite algorithm configuration, not a conventional iterative evolutionary
algorithm; the venue fit rests on the applied game-agent configuration and
evaluation contribution and should be confirmed in writing.

- Paper deadline: **2026-11-01**.
- Internal full-draft deadline: **2026-09-20**.
- Internal submission-ready deadline: **2026-10-15**.
- Notification: **2027-01-10**; camera-ready: **2027-01-24**.
- Format: double-blind Springer LNCS, **14 pages plus unlimited references and
  acknowledgements**.
- Review: at least three program-committee reviewers.
- Supplementary material: the official submission page provides a 10 MB
  EasyChair supplementary-material field and permits identity-neutral external
  links. The current supplement and 60 KB aggregate artifact fit this route;
  every essential claim and method detail must nevertheless remain in the main
  paper.
- Conference: **2027-03-31 through 2027-04-02**, Mainz, Germany, in **hybrid
  mode**.
- Attendance: at least one author must register, attend, and present. The event
  states that it is hybrid, but the 2027 site does not yet spell out online
  presenter selection or online registration. Obtain written confirmation that
  an accepted paper may be presented remotely before submission; retain the
  response in the submission records.
- Official pages: [SCAG session](https://www.evostar.org/2027/evoapps/scag/),
  [EvoApplications call](https://www.evostar.org/2027/evoapps/),
  [important dates](https://www.evostar.org/2027/important-dates/),
  [submission instructions](https://www.evostar.org/2027/submit-paper/), and
  [hybrid conference statement](https://www.evostar.org/2027/).

The project is now **near the expected SCAG standard and internally
submission-ready**: its empirical program is complete, the relative
confirmatory endpoint passed, the failed absolute endpoint is reported, every
result is tied to frozen manifests and job records, the anonymous LNCS paper
and supplement have received full rendered QA, and the deterministic aggregate
artifact passes a clean extraction and rebuild. Submission still depends on
written rulings about topical scope, remote presentation, and prior
public-repository exposure. The supplementary-material upload route is already
documented by the official submission instructions. Public redistribution of
the combined bot separately depends on upstream permission.

This assessment is also calibrated against the eight papers in the 2024--2026
SCAG proceedings. A full-text review of the five 2025--2026 papers found that
the current manuscript exceeds the sample on leakage control, uncertainty,
negative endpoint reporting, and aggregate reproducibility, but trails it on
algorithmic novelty and breadth of independent opponents. See
[`SCAG_ACCEPTED_PAPER_CALIBRATION.md`](SCAG_ACCEPTED_PAPER_CALIBRATION.md).
The comparison strengthens the case that the paper is technically credible at
this level; it does not substitute for the requested written scope ruling.

Likely reviewer concerns and the required answers are:

| Concern | Evidence or response required in the paper |
| --- | --- |
| This is ordinary hand tuning | Describe the fixed policy space, five run-distinct deterministic searches, common-seed championship, and held-out evaluation; claim an empirical workflow, not a new optimizer. |
| This is not an evolutionary algorithm | Agree. Call it deterministic mutation-based finite configuration with multi-fidelity selection. Ground SCAG fit in applied game-agent configuration, empirical CI analysis, and game benchmarking rather than manufacturing optimizer novelty. |
| Only one opponent and matchup are studied | State this limitation in the abstract, introduction, and conclusion; define the estimand as performance against pinned Supalosa on the supported family population. |
| Map or test leakage explains the gain | Show revision-aware family grouping, pre-training role commitments, training-only championship, single development gate, and one-time sealed test opening. |
| The simulator or opponent is contaminated | Document explicit seeds, reciprocal physical starts, source/runtime hashes, and independent loading of the pinned opponent. |
| Individual games are treated as independent | Use family-level estimands and the frozen family-clustered interval; keep match-level counts descriptive. |
| The mechanism is overstated | Lead with the passed relative endpoint; label component and terminal analyses post-confirmatory and acknowledge multiplicity and endpoint-only limitations. |
| The commercial game prevents reproduction | Release author-owned code, plans, hashes, metadata, aggregates, and asset-acquisition instructions; do not redistribute third-party maps or game assets without permission. |

## Fallbacks

### ICAART 2027 — earlier, broader, and more expensive fallback

ICAART covers agents, simulation, evolutionary computing, planning, and
learning. It is a broader and weaker topical fit than SCAG, but its site gives
specific online oral and poster instructions and says speakers may present
remotely when unable to travel.

- First regular-paper deadline: **2026-09-15**.
- Second position/regular-paper deadline: **2026-10-22**.
- Workshop and special-session paper deadline: **2026-12-03**.
- Conference: **2027-02-23 through 2027-02-26**.
- Early speaker registration: **EUR 620** for members or **EUR 680** for
  nonmembers at the currently posted rates.
- Remote status: supported exceptionally for speakers unable to travel; online
  presentations are live over Zoom and require presence even when a backup
  video is uploaded. Ask the secretariat to confirm eligibility before paying.
- Official pages: [call and dates](https://icaart.scitevents.org/CallForPapers.aspx?y=2027),
  [conference and hybrid statement](https://icaart.scitevents.org/home.aspx),
  [online presentation instructions](https://icaart.scitevents.org/presentationdetails.aspx),
  and [registration fees](https://icaart.scitevents.org/RegistrationFees.aspx?y=2027).

If the manuscript is unusually strong by early September, ICAART's first
regular round is possible but unnecessarily rushed. The October round is the
practical fallback if EvoStar does not confirm remote presentation. Submit the
completed study as a regular paper, not as a position paper. The SPIKE eSports
special session is available in December but emphasizes player and team
performance more than agent configuration.

### Entertainment Computing — no-travel archival fallback

Elsevier's *Entertainment Computing* is a rolling journal with no conference
presentation requirement. Its scope includes computer and video games and
theoretical, technical, and empirical work in entertainment computing. It is a
reasonable archival fallback if neither conference confirms remote
presentation, although the user's preference is a lower-tier conference or
workshop rather than a journal. Official page:
[Entertainment Computing](https://www.sciencedirect.com/journal/entertainment-computing).

### IOCAC 2027 — fully online dissemination fallback only

The International Online Conference on Applied Computing is fully virtual and
free, with an abstract deadline of **2027-02-26** and an online event on
**2027-06-28 through 2027-06-30**. Its game-AI fit and archival value are much
weaker than SCAG or ICAART, so use it only for dissemination, not as the main
paper. Official page: [IOCAC 2027](https://sciforum.net/event/IOCAC2027/home).

### FDG 2027 — watch list

FDG is thematically plausible, but no official 2027 call and remote-presenter
policy was verified on 2026-08-11. Monitor the
[FDG conference series](https://www.foundationsofdigitalgames.org/) and consider
it only if the eventual call fits the deadline and explicitly permits remote
presentation.

## Excluded current options

- NeurIPS, ICLR, ICML, and similarly broad flagships: the one-game,
  one-opponent empirical contribution does not support that ambition or scope.
- IEEE Conference on Games 2026: its deadline has passed, and no official 2027
  call with a remote-presenter route is available yet.
- Any event that requires an in-person talk: incompatible with the author's
  stated attendance constraint.

## Submission gate

Submit to SCAG only when all of the following are true:

1. The LNCS manuscript fits 14 pages excluding references and acknowledgements,
   and the abstract, introduction, results, and conclusion use the frozen claim
   boundary.
2. Every reported number and figure is regenerated from committed aggregate
   artifacts, with an automated consistency check against the result registry.
3. The paper distinguishes the passed champion-versus-default endpoint from the
   failed champion-versus-Supalosa absolute-strength endpoint.
4. The one-opponent, one-faction matchup, fixed tick cap, supported-map, and
   endpoint-only diagnostic limitations are explicit.
5. The anonymous artifact reproduces the tables and figures in a clean
   environment, contains no author-identifying URLs or metadata, and keeps the
   complete supplementary upload below the official 10 MB limit.
6. The release manifest separates author-owned code and metadata from
   third-party maps, MIX archives, and game assets.
7. Written remote-presentation confirmation has been obtained from EvoStar.
8. The program chair has confirmed the intended handling of the named public
   repository, or the repository has been made non-public for the double-blind
   review period without rewriting the evidence history.

No more outcome-bearing games should be added to the opened family population
to improve the story. Any future opponent, faction, or instrumented-trajectory
study must be registered as a separately versioned prospective experiment.
