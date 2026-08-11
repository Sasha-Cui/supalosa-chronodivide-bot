# Venue strategy

Verified **2026-08-11** from official venue pages. Recheck the call,
registration price, and presenter instructions immediately before submission.

## Decision

**Operational primary target: ICAART 2027, first-round regular paper, subject
to the four written rulings below.** Its public policy permits writing and
revision assistance, expressly subjects AI-generated code to disclosure, and
its site explicitly documents an exceptional live-online presentation route.
Those facts make
it the safest current match to the author's no-travel requirement and the
project's actual provenance. Its broader Agents area is a weaker topical fit
than SCAG, but calibration against recent accepted ICAART papers supports a
weak-accept assessment with meaningful reviewer variance.

**Topical secondary: EvoApplications 2027, Soft Computing Applied to Games
(SCAG) special session.** SCAG is the best topical and ambition-level fit for
the completed study, but it remains ineligible as an operational primary until
the chairs resolve remote presentation and the venue's apparently stricter
generative-AI rule in writing. EvoApplications explicitly welcomes applications
of evolutionary computation, including significant work in progress, while
SCAG's current call lists empirical analysis of computational-intelligence
techniques for games and game-based benchmarking and says bio-inspired
approaches are especially encouraged rather than required. The study uses five
run-distinct, deterministically mutation-generated policy pools and successive
halving. This is finite algorithm configuration, not a conventional iterative
evolutionary algorithm; the venue fit rests on the applied game-agent
configuration and evaluation contribution and should be confirmed in writing.

- Paper deadline: **2026-11-01**.
- Internal full-draft deadline: **2026-09-20**.
- Internal submission-ready deadline: **2026-10-15**.
- Notification: **2027-01-10**; camera-ready: **2027-01-24**.
- Format: double-blind Springer LNCS, **14 pages plus unlimited references and
  acknowledgements**.
- Review: at least three program-committee reviewers.
- Supplementary material: the official submission page provides a 10 MB
  EasyChair supplementary-material field and permits identity-neutral external
  links. The current supplement and aggregate artifact fit this route;
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
public-repository exposure. A fourth written ruling is now required for
generative-AI eligibility and disclosure: Codex assisted beyond copy editing,
while the latest discoverable EvoStar code says AI should not produce material.
Springer Nature permits broader declared use with human accountability, but the
venue-specific rule controls submission eligibility. See
[`AUTHORSHIP_AND_AI_POLICY.md`](AUTHORSHIP_AND_AI_POLICY.md). The
supplementary-material upload route is already documented by the official
submission instructions. Public redistribution of the combined bot separately
depends on upstream permission.

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
| The reference is artificially weak | State that it was prospectively frozen inside the common coordinate-free interface; disclose that the map-profile-enabled deployed policy is outside the estimand and that its performance was not measured. |
| This is not an evolutionary algorithm | Agree. Call it deterministic mutation-based finite configuration with multi-fidelity selection. Ground SCAG fit in applied game-agent configuration, empirical CI analysis, and game benchmarking rather than manufacturing optimizer novelty. |
| Only one opponent and matchup are studied | State this limitation in the abstract, introduction, and conclusion; define the estimand as performance against pinned Supalosa on the supported family population. |
| Map or test leakage explains the gain | Show revision-aware family grouping, pre-training role commitments, training-only championship, single development gate, and one-time sealed test opening. |
| The simulator or opponent is contaminated | Document explicit seeds, reciprocal physical starts, source/runtime hashes, and independent loading of the pinned opponent. |
| Individual games are treated as independent | Use family-level estimands and the frozen family-clustered interval; keep match-level counts descriptive. |
| The mechanism is overstated | Lead with the passed relative endpoint; label component and terminal analyses post-confirmatory and acknowledge multiplicity and endpoint-only limitations. |
| The commercial game prevents reproduction | Release author-owned code, plans, hashes, metadata, aggregates, and asset-acquisition instructions; do not redistribute third-party maps or game assets without permission. |

## Operational route and fallbacks

### ICAART 2027 — operational primary candidate

ICAART covers agents, simulation, evolutionary computing, planning, and
learning. It is a broader and weaker topical fit than SCAG, but its official
site gives specific live-online oral and poster instructions. Its generative-AI
policy explicitly permits responsible writing and revision, includes
AI-generated code in the disclosure rule, and keeps human authors accountable.
The actual implementation and orchestration history still needs a
project-specific ruling. This is materially safer than relying on an unresolved
interpretation of the EvoStar code, but it is not blanket clearance.

- First regular-paper deadline: **2026-09-15**.
- Second position/regular-paper deadline: **2026-10-22**.
- Workshop and special-session paper deadline: **2026-12-03**.
- Conference: **2027-02-23 through 2027-02-25**, Valletta, Malta.
- Format: SCITEPRESS two-column A4 template. A regular paper may be accepted as
  a 12-page full paper or an 8-page short paper. Review submissions must contain
  10,000--50,000 non-whitespace characters, and the template requires a
  70--200-word abstract.
- Early speaker registration: **EUR 620** for members or **EUR 680** for
  nonmembers at the currently posted rates.
- Remote status: the home page explicitly permits exceptional remote
  presentation for speakers unable to travel. The presenter page gives complete
  live Zoom instructions and requires synchronous attendance even with a backup
  video. The registration table has no online-speaker row, so ask only for the
  author's eligibility, exception procedure, confirmation timing, and
  applicable fee class before paying.
- AI-disclosure ambiguity: the guidelines require disclosure in the
  acknowledgments and a citation to the AI system in affected sections, while
  the same double-blind instructions require acknowledgments to be omitted.
  Obtain the secretariat's exact review-version placement instruction.
- Under-review AI confidentiality: the public AI-tools rule prohibits
  processing a manuscript under review through a public AI platform. Archive
  the final candidate at initial upload and keep the manuscript, confidential
  reviews, and rebuttal drafts out of public generative-AI services until the
  official selection result.
- Repository ambiguity: the submitted PDF is not publicly posted, but the
  public rules do not say how a previously public named implementation
  repository affects anonymity or whether it must be private during review.
  Obtain a written ruling before changing its visibility.
- Reviewer-artifact ambiguity: the public complete-paper instructions describe
  a PDF submission but do not specify a supplementary-file field or an
  anonymous external-link route. Ask whether the 103,324-byte identity-neutral
  aggregate artifact can accompany the review submission and, if so, by which
  mechanism. If not, keep all essential evidence in the paper and describe the
  artifact as release material rather than implying reviewer access.
- Official pages: [call and dates](https://icaart.scitevents.org/CallForPapers.aspx?y=2027),
  [paper-length definitions](https://icaart.scitevents.org/Glossary.aspx),
  [online presentation instructions](https://icaart.scitevents.org/presentationdetails.aspx?y=2027),
  [generative-AI policy](https://icaart.scitevents.org/AiTools.aspx?y=2027),
  [templates](https://icaart.scitevents.org/Templates.aspx), and
  [registration fees](https://icaart.scitevents.org/RegistrationFees.aspx?y=2027).

The public-policy evidence and exact remaining questions are frozen in
`ICAART_POLICY_RECONCILIATION.md`.

The SCITEPRESS conversion and acceptance-oriented presentation pass were
completed on 2026-08-11 without changing the frozen science. The current
candidate is 11 A4 pages, has a 193-word expanded abstract and 39,210 extracted
non-whitespace characters, and has SHA-256
`98500e11d7ccaa6d1c0f88f2e741b499737124cdac1565190379029bc82c4c07`.
Its title, abstracts, and threat-to-control map foreground the evaluation
contribution without introducing a stronger claim. All pages passed rendered
inspection under TeX Live 2024 and an independent TeX Live 2022 build; see
`SCITEPRESS_QA.md`.

For reviewer assignment, use the main **Agents** area and the exact call topics
**Agent Models and Architectures**, **Simulation**, and **Task Planning and
Execution** when offered. The frozen PDF keywords are **Game Artificial
Intelligence**, **Real-time Strategy Games**, **Scripted Agents**, **Algorithm
Configuration**, and **Reproducible Evaluation**. Do not classify the paper as
generic distribution-shift ML or multi-agent learning; see
`ICAART_REVIEWER_ASSIGNMENT_AUDIT.md`.

The ICAART route is also calibrated against three nearby accepted 2025--2026
papers read in full: a new one-game environment with a 2,100-game tournament,
a 360-instance controlled architecture comparison, and an eight-page
simulation-analysis position paper. The Chrono Divide manuscript is stronger
than this sample on leakage control, held-out evaluation, uncertainty,
negative-endpoint reporting, and aggregate reproducibility. It is weaker than
the environment paper on independent baseline breadth and does not claim a new
environment or optimizer. The resulting internal assessment is **weak accept
with meaningful reviewer variance**, not guaranteed acceptance. See
[`ICAART_ACCEPTED_PAPER_CALIBRATION.md`](ICAART_ACCEPTED_PAPER_CALIBRATION.md).

### ICAART SPIKE special-session fallback -- scope unresolved

ICAART now lists **eSports Performance, Artificial Intelligence and Knowledge
in Esports -- Trends & Applications (SPIKE 2027)** as a special session. Its
scope explicitly mentions AI methods and agent-based systems in competitive
gaming, multi-agent strategy, AI-based esports technologies, and tactical
prediction. The paper deadline is **2026-12-03**, after the first regular-round
notification on **2026-11-13**, and accepted papers enter a special section of
the ICAART proceedings.

The Chrono Divide study is plausibly adjacent but not clearly in scope: it
evaluates an autonomous RTS agent, not human player performance, audience
engagement, or esports operations. The public pages also do not say whether a
paper rejected from ICAART's regular round may be substantially revised and
submitted sequentially to a same-year special session. SPIKE is therefore a
**conditional sequential fallback**, not a current co-submission or replacement
for the regular track. Use the separate inquiry in
`CONTACT_TEMPLATES.md`; activate it only after written confirmation of both
scope and non-simultaneous resubmission eligibility.

Official page: [SPIKE 2027](https://icaart.scitevents.org/SPIKE.aspx?y=2027).

Use the dated rule in `VENUE_DECISION_PACKET.md` because ICAART's first regular
round arrives before the EvoStar deadline. Send both venue inquiries
immediately, but prepare ICAART as the default route. Select ICAART by
**2026-08-25** if its four written answers are workable; use SCAG instead only
if ICAART cannot satisfy the project-governance requirements and SCAG has
affirmatively resolved all four of its questions. The October 22 ICAART regular
round is the final practical conference fallback. Submit the completed study as
a regular paper, not as a position paper, and never submit to both archival
venues simultaneously.

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
- [EXAG 2026](https://www.exag.org/call_for_papers) is the closest currently
  open game-AI workshop: it accepts validated test-bed research, failed
  experiments, and 10--15-page full papers through **2026-08-28**. Its call,
  however, explicitly assigns both paper tracks to **in-person oral
  presentation** on 9--10 November. It is therefore incompatible with the
  no-travel requirement despite strong topical fit.
- The non-archival NeurIPS 2026 workshop
  [Who Verifies the Agents?](https://verify-agents-workshop.github.io/) is a
  close methodological fit: its call includes environment-grounded
  evaluation, simulators, and evolutionary or search-based agent
  optimization, with a **2026-08-29** deadline. It is held in Sydney, requires
  accepted papers to be presented, and publishes no remote-presenter route.
  It also offers only OpenReview dissemination rather than proceedings. Do not
  spend the short submission window on a format conversion unless the
  organizers first provide written remote-presentation permission and the
  author explicitly prefers a non-archival workshop over ICAART.
- [IEEE Conference on Games 2027](https://rt247a.u-aizu.ac.jp/) now advertises
  a **2027-03-01** full-paper deadline and a **2027-05-15** auxiliary-paper
  deadline. It is a strong topical venue, but its current call does not verify
  a remote-presenter route and its broader independent-comparison expectations
  make it a riskier target for the frozen one-opponent study. Keep it as a
  future-study venue, not a reason to delay the current submission.
- Any event that requires an in-person talk: incompatible with the author's
  stated attendance constraint.

## Submission gate

Submit to SCAG only when all of the following are true:

1. The LNCS manuscript fits 14 pages excluding references and acknowledgements,
   and the abstract, introduction, results, and conclusion use the frozen claim
   boundary.
2. Every reported number and figure is regenerated from committed aggregate
   artifacts, with an automated consistency check against the result registry.
3. The paper distinguishes the passed champion-versus-reference endpoint from
   the failed champion-versus-Supalosa absolute-strength endpoint and does not
   imply a comparison with the deployed StrongBot default.
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
9. The program chair has ruled on the recorded generative-AI assistance and any
   required disclosure, and the author has completed the primary-evidence,
   citation, code, and line-by-line manuscript verification.

No more outcome-bearing games should be added to the opened family population
to improve the story. Any future opponent, faction, or instrumented-trajectory
study must be registered as a separately versioned prospective experiment.
