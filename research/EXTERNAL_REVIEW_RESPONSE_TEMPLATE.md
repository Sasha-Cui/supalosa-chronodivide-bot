# Independent cold-read response template

Prepared: **2026-08-11**

Status: **blank private-copy template; no review has been requested or
received**.

Do not add reviewer names, contact details, correspondence, or completed
responses to this tracked file. Copy it to the private submission record before
use. Preserve the returned Phase A review verbatim before revealing Phase B.

## Frozen handoff identity

Use exactly one row. Do not ask one reader to compare formats.

| Candidate | Source commit | PDF SHA-256 |
| --- | --- | --- |
| LNCS / SCAG | `91f9978ae6df7d400e751712c07a8e8816fc9c07` | `d5ea2c2893f4452b3889489101b74c9151f1d41a5f51b316acd3e25fbe29755e` |
| SCITEPRESS / ICAART | `91f9978ae6df7d400e751712c07a8e8816fc9c07` | `6f605941b8a0bee2b14d875bc973166f2710981746ffb245f563a74618926093` |

Private selection record:

    Selected candidate:
    Verified PDF SHA-256:
    Verification timestamp and timezone:

## Reader and protocol record

Record privately after selecting a reader:

| Field | Private record |
| --- | --- |
| Reader background relevant to this paper | |
| Prior knowledge of this project | none / limited / substantial |
| Conflict or collaboration relationship | |
| Phase A PDF sent timestamp and timezone | |
| Phase A response received timestamp and timezone | |
| Approximate reading time | |
| Repository seen before Phase A | no / yes / unknown |
| Supplement seen before Phase A | no / yes / unknown |
| Targeted questions seen before Phase A | no / yes / unknown |
| Phase A response SHA-256 | |

If the reader saw the repository, supplement, intended takeaway, or targeted
questions before returning Phase A, retain the response but classify it as
primed; it cannot satisfy the unprimed-review gate.

## Phase A: locked unprimed review

The only prompt sent with the anonymous PDF must be the neutral prompt in
`EXTERNAL_REVIEW_PACKET.md`. Paste the returned review verbatim into the private
copy, with no author corrections or inline rebuttal.

    Verbatim Phase A review:

### Criterion record

| Criterion | Score (1--5) | Reader's one-sentence justification |
| --- | ---: | --- |
| Relevance | | |
| Originality | | |
| Technical quality | | |
| Significance | | |
| Presentation | | |

| Overall item | Reader response |
| --- | --- |
| Vote | accept / borderline / reject |
| Confidence (1--5) | |
| Main claim, in the reader's words | |
| Strongest acceptance argument | |
| Strongest rejection argument | |
| Required revisions | |
| Optional revisions | |

Phase A lock:

    Lock timestamp and timezone:
    Locked response SHA-256:
    Person recording the lock:

Do not continue to Phase B until the lock is complete.

## Phase B: targeted comprehension answers

Record the answers before discussing the paper with the reader.

### 1. Principal claim

Answer:

### 2. Positive result and failed stronger result

Answer:

### 3. Training/test and inferential units

Answer:

### 4. Method-v1/method-v2 adaptation and sealed-test access

Answer:

### 5. Contribution type

Answer:

### 6. What the component and terminal diagnostics establish

Answer:

### 7. Two most serious generalization threats

Answer:

### 8. Hardest paragraph, table, figure, or term

Answer:

### 9. Venue vote and strongest argument on each side

Answer:

### 10. Sentences stronger than the evidence

Answer:

### 11. Generic-reference versus deployed-default boundary

Answer:

Phase B record:

    Questions sent timestamp and timezone:
    Answers received timestamp and timezone:
    Phase B response SHA-256:

## Boundary scoring

For each boundary, record exactly one status: `unprompted`, `phase_b_only`, or
`missing_or_wrong`. Quote the reader rather than inferring understanding from a
general accept vote.

| Required boundary | Status | Verbatim evidence or misunderstanding |
| --- | --- | --- |
| Positive claim is champion versus frozen generic reference, not reliable superiority over Supalosa or the deployed default | | |
| Chrono Divide is an existing environment, not introduced by the paper | | |
| Configuration uses established techniques and is not a novel optimizer claim | | |
| Component and terminal analyses are post-confirmatory and non-causal | | |

The cold read passes only if boundaries 1--3 appear unprompted and all four are
correct by the end of Phase B. A prompted correction does not retroactively
count as unprompted comprehension.

## Separate visual pass

This pass may use a second reader or a later, separately timestamped pass by the
same reader.

| Item | Result and exact location of any problem |
| --- | --- |
| Title and abstract communicate the bounded relative claim | |
| Table 3 distinguishes the passed relative and failed absolute gates | |
| Figures and captions are interpretable without repository context | |
| Comparator is not mistaken for the deployed StrongBot default | |
| One-opponent, one-matchup, high-draw scope is visible | |
| Diagnostic evidence is not read as causal | |
| Clipping, overlap, illegible labels, or malformed references | |

## Revision and disposition log

Classify every concern before editing. `paper_revision` means a
claim-preserving communication repair. `future_prospective_study` means the
request requires new outcomes or generalization units. `no_change_with_reason`
means the concern is real but already disclosed or cannot be repaired honestly
inside the frozen paper.

| Concern | Classification | Exact action or reason | Commit/hash after action |
| --- | --- | --- | --- |
| | | | |

Record exactly one disposition:

- `COLD_READ_PASS`: boundaries 1--3 were unprompted, all four were ultimately
  correct, and no required presentation repair remains;
- `CLAIM_BOUNDARY_REVISION_REQUIRED`: at least one core boundary was missing or
  wrong and a claim-preserving manuscript repair is feasible;
- `PRESENTATION_REVISION_REQUIRED`: the claim is understood but a required
  clarity or visual defect remains;
- `SCIENTIFIC_OBJECTION_RECORDED_NO_POSTHOC_REPAIR`: a rejection concern
  requires a new prospective study and cannot be repaired on opened tests; or
- `REVIEW_INCOMPLETE_OR_PRIMED`: Phase A was not locked, was materially primed,
  or lacks a decision-complete response.

Private disposition record:

    Disposition:
    Decision timestamp and timezone:
    Decision maker:
    Required manuscript action:
    Prospective future-work item:
    Final response-record SHA-256:

After any manuscript edit, rerun the complete tests, deterministic builds,
anonymity and citation checks, page/character limits, and rendered-PDF review.
Update every frozen identity before another reader or venue sees the paper.
