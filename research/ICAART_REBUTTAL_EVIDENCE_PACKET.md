# ICAART rebuttal evidence packet

Prepared: **2026-08-11**

## Purpose and boundary

This is a pre-submission fact index for a human-authored ICAART rebuttal. It is
not a review, a prediction of reviewer comments, or a license to strengthen the
paper after seeing confidential feedback. ICAART's public policy prohibits
processing a manuscript under review through a public AI platform. After the
initial upload, do not provide reviews, rebuttal text, or the submitted paper to
Codex, ChatGPT, or another public generative-AI service. Use this frozen packet
offline, verify every response against the submitted PDF, and write the actual
rebuttal without public-AI assistance.

The packet supports factual correction and scope clarification only. It cannot
add games, reinterpret opened test families, introduce a new baseline, or turn
a diagnostic into confirmatory evidence. It contains no new outcome-bearing
analysis and authorizes none after submission.

## Bound candidate

| Item | Frozen identity |
| --- | --- |
| Reviewed manuscript source | `ccc0c101de207a7100fd553e15efc4fa18108a35` |
| ICAART PDF | 11 A4 pages; SHA-256 `98500e11d7ccaa6d1c0f88f2e741b499737124cdac1565190379029bc82c4c07` |
| Portal metadata | SHA-256 `285af4e101ea36d6e5190a3c0ceb5d4a52ded5e56f96210b1295360bb077e4ca` |
| Anonymous aggregate artifact | 60 immutable files; SHA-256 `39f761b1cb0b9fe587b197be9151e63f0ee1368b883cbf541f2bb86c33ea5437` |

Stop if the submitted PDF hash differs. Page references below are invalid for
another build. The current PDF has empty author/title metadata, 39,210
non-whitespace characters, and a 193-word abstract.

## One-page evidence index

| Reviewer issue | Primary manuscript location | Frozen aggregate |
| --- | --- | --- |
| Principal claim and failed stronger claim | Abstract p. 1; RQs and result p. 2; Sec. 5.2 pp. 7-8; conclusion p. 10 | `method_v2_confirmatory_result_v1.json` |
| Existing environment and established optimizer boundary | Contributions p. 2; related work pp. 2-3; limitations p. 9 | manuscript source and bibliography |
| Threats and joint evidence contract | Sec. 3 p. 3; Table 1 p. 4; fail-closed provenance p. 5 | aggregate claim map plus accepted accounting |
| Map lineage and family-disjoint split | Sec. 3.3 pp. 4-5; Figure 1 p. 6 | `supported_temperate_families_v1.json`; `family_role_commitments_v1.json` |
| Training, adaptation, and sealed-test chronology | Secs. 4.1-4.4 pp. 5-6; Figure 1 p. 6 | role commitments and accepted accounting |
| Estimand and clustered inference | Sec. 4.5 p. 6; Sec. 5 pp. 7-8; Table 4 p. 8 | confirmatory result and family diagnostics |
| High draw rate and paired outcome changes | Endpoint p. 4; Sec. 5.3 p. 7; Figure 3 p. 8; limitations p. 9 | confirmatory result and family diagnostics |
| Component and championship diagnostics | Secs. 6.1-6.3 pp. 8-9; Figure 4 p. 8 | mechanism, component, and terminal-state records |
| Attempt accounting and reproducibility | Sec. 3.4 p. 5; Sec. 5 p. 6; Sec. 7.1 p. 9 | `accepted_compute_accounting_v1.json` |
| External-validity and comparator limits | Scope p. 2; limitations p. 9; conclusion p. 10 | confirmatory `claimBoundary` |

All artifact paths are under `research/artifacts/` inside the anonymous review
archive. Its README maps each of the eight records to authoritative JSON fields.

## Immutable fact sheet

- The accepted path contains **8,704 policy games**: 4,680 optimizer, 2,112
  championship, 440 fresh development, 512 confirmatory, and 480 in each of two
  diagnostic panels.
- Confirmatory evaluation contains **512 games** across **16 sealed map
  families**, with 256 games per method, eight seed blocks, and reciprocal
  physical starts.
- The frozen generic reference scores **0.199** (1 win, 100 draws, 155 losses).
  The champion scores **0.535** (47 wins, 180 draws, 29 losses).
- The equally family-weighted champion-minus-reference effect is **0.336** with
  family-clustered 95% CI **[0.215, 0.457]**. Fourteen family effects are
  positive, two are zero, and none is negative at the family-average level.
- The champion-minus-0.5 margin is 0.035, but its prespecified one-sided 95%
  lower bound is **-0.021**. The absolute-strength gate and therefore the joint
  gate fail. The study does **not** establish that StrongBot reliably beats
  Supalosa.
- The most common improvement is loss-to-tick-cap survival: 104 reference
  losses become draws and 28 become wins; 150 pairs improve, 6 regress, and 100
  are unchanged.
- The comparator is candidate 0 in the coordinate-free research interface,
  **not** the map-profile-enabled deployed StrongBot default. No deployed-
  default improvement is estimated.
- Chrono Divide is an existing environment. Successive halving, common random
  numbers, and deterministic selection are established techniques. The paper
  claims neither environment nor optimizer novelty.
- Supalosa is the only independent opponent; all games are Iraq mirrors on the
  supported Temperate family population. This is a real external-validity
  limitation, not an omitted robustness claim.
- Component, terminal-state, bootstrap, sign-flip, and championship analyses
  are sensitivity or post-confirmatory diagnostics. They cannot rescue the
  failed absolute gate or identify a causal infantry-rush mechanism.

## Decision-critical objections

### 1. “The bot does not reliably beat Supalosa.”

Agree. RQ2 was prespecified and fails: the one-sided lower margin is -0.021.
The positive RQ1 claim is a 0.336 improvement over the frozen generic reference
on the declared family population. Point to the abstract (p. 1), Sec. 5.2
(pp. 7-8), Table 4 (p. 8), and the conclusion (p. 10). Never answer by calling
0.535 a reliable win rate or by substituting the relative interval for the
absolute gate.

### 2. “The reference is weak or a strawman.”

The reference is weak, and the paper says so. It was prospectively frozen as
candidate 0 inside the same coordinate-free 28-field policy interface. It is
not the deployed map-profile-enabled StrongBot default, which is inadmissible
to the shared interface because it uses exact-map profiles and tactics. The
comparison estimates configuration gain within the declared generic policy
class, not product-level improvement. Point to pp. 1, 5, and 9. Do not imply a
deployed-default comparison that was never run.

### 3. “This is ordinary parameter tuning, not an original algorithm.”

Agree that the optimizer components are established. The paper's original
technical object is the integrated, executable evidence contract: map-family
lineage, role access, physical starts, participant-specific randomness,
comparator identity, sealed outcomes, and attempt accounting must all satisfy
their commitments before a campaign is admitted. Point to contributions p. 2,
related work p. 3, the definition p. 3, and Table 1 p. 4. Do not claim a new
optimizer, new environment, or new individual control.

### 4. “One opponent and one faction are insufficient.”

This is the strongest valid limitation. The estimand covers one independently
authored pinned opponent, one Iraq mirror, one simulator version, and the
supported Temperate family population. The limitation restricts external
validity but does not invalidate the paired held-out estimate for that matchup.
Point to scope p. 2 and limitations p. 9. The honest next step is a new
prospective multi-opponent, cross-faction study, not post-hoc games on opened
families.

### 5. “Map duplicates or revisions could leak across roles.”

The outcome-free inventory reduced 333 files to 313 content hashes and 145
conservative connected families. Sixty-seven Temperate representatives were
screened twice; 54 passed. Exact copies and likely revisions were grouped
before a keyed family-level role assignment, and ambiguity favored grouping.
The paper explicitly says this heuristic does not prove semantic independence.
Point to Sec. 3.3 pp. 4-5 and Figure 1 p. 6.

### 6. “The analysis treats correlated games as independent.”

It does not. Reciprocal slots are averaged inside family-seed blocks, the
estimand weights families equally, and the prespecified variance clusters at
the 16-family level with Student-t15 critical values. Match-level W/D/L counts
are descriptive. Point to Sec. 4.5 p. 6 and Table 4 p. 8. Do not cite 512 games
as 512 independent generalization units.

### 7. “Method v2 is post-selection disguised as preregistration.”

The paper reports adaptation rather than claiming a single-shot design. A
map-conditioned selector failed on the original development role and was
retired without opening test identities or outcomes. Method v2 used training
evidence and a disjoint fresh development pool, then froze the champion,
analysis, runtime, and attempt budget before the one-time test opening. Point
to p. 2, Sec. 4.4 p. 6, and limitations p. 9.

### 8. “Retries or cluster failures may have selected favorable games.”

Plans bind source, binaries, runtime, maps, policies, seeds, slots, account, and
attempt semantics. A launch counts even if initialization fails; in-run retry
is forbidden; a post-launch technical failure invalidates the indivisible
campaign. The accepted confirmatory path has 128 shards, exactly 512 launches
and completions, no failed task, no extra attempt, and one irreversible
unblinding. Superseded and failed attempts remain in the ledger. Point to Sec.
3.4 p. 5, the opening of Sec. 5 pp. 6-7, and Sec. 7.1 p. 9.

### 9. “The score gain is mostly draws rather than wins.”

Agree. The endpoint prospectively scores a completed or tick-cap draw as 0.5
and never converts terminal material into a win. The champion gains 46 wins but
avoids 126 losses; its most common transition is loss to tick-cap draw. This is
why RQ1 passes while RQ2 fails. Point to Eq. 1 p. 4, Sec. 5.3 p. 7, Figure 3 p.
8, and limitations p. 9.

### 10. “The ablations do not prove the proposed mechanism.”

Agree. The champion-versus-run-local interval crosses zero. The largest
component signal is the joint infantry+rush revert, but its Bonferroni interval
also crosses zero. Terminal snapshots lack action trajectories and are
outcome-dependent. The paper says these patterns are consistent with, but do
not identify, a mechanism. Point to Sec. 6 pp. 8-9 and Figure 4 p. 8.

### 11. “The study is not fully reproducible without proprietary content.”

The aggregate artifact regenerates every reported number, table, and figure
and verifies 60 immutable files. It deliberately excludes bot packages, maps,
commercial assets, the runtime, and private raw logs. Full replay therefore
depends on lawful third-party acquisition and is not claimed. Point to Sec.
7.1 p. 9 and the artifact scope statement. Do not promise redistribution rights
that have not been granted.

### 12. “There is no configurator baseline.”

Correct. The study does not compare search efficiency, claim optimizer
superiority, or establish that successive halving is better than SMAC, irace,
NTBEA, or hand tuning. The configuration pipeline is a fixed mechanism for
producing one auditable policy. Point to related work p. 3 and limitations p.
9. Treat a requested configurator comparison as future prospective work.

## Rebuttal response rules

1. Correct factual misunderstandings first, using the submitted page and
   frozen value. Quote no confidential review outside the private record.
2. Agree with valid limitations before explaining what the declared estimand
   still supports. Do not answer a breadth objection with stronger rhetoric.
3. Distinguish a request for clarification from a request for new evidence.
   Clarify from existing records; do not inspect or rerun outcome-bearing games.
4. If a reviewer identifies a real error, acknowledge it and assess whether it
   invalidates a gate. Do not hide it behind the artifact or test suite.
5. Prioritize objections that affect correctness, contribution identity, or
   scope. Cosmetic comments can be accepted for camera-ready revision.
6. Keep all quantitative statements at their frozen precision. Never convert
   diagnostic intervals into confirmatory claims or game counts into family
   counts.
7. Promise only claim-preserving camera-ready changes that can actually be
   completed. Do not promise a new opponent, faction, test-family analysis, or
   licensing outcome inside a rebuttal window.

## Prohibited response moves

Do not describe the work as a paradigm shift, a state-of-the-art bot, a new
gaming environment, a novel optimizer, or reliable superiority over Supalosa.
Do not call the generic reference the shipped or deployed default. Do not claim
that all 16 family effects are positive, that component effects are
multiplicity-significant, or that terminal snapshots establish causality. Do
not use post-deadline manuscript changes to answer what the submitted PDF did
not say.

## Private response record

Before submitting a rebuttal, retain privately:

```text
Submitted PDF SHA-256:
Review received timestamp and timezone:
Rebuttal deadline and word/character limit:
Reviewer comment classification:
Frozen evidence consulted:
Exact manuscript pages cited:
New empirical analysis performed: none
Human drafter/verifier:
Final rebuttal SHA-256:
Submission confirmation retained: yes / no
```

Do not commit confidential reviews, reviewer identifiers, or completed
responses to this repository.
