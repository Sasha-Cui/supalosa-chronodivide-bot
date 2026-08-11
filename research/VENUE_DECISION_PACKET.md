# Venue decision packet

Prepared: **2026-08-11**

This is the operational handoff for choosing one archival venue. It does not
send email, authorize submission, or replace a written venue ruling.

## Submission-ready choices

| Criterion | EvoApplications 2027 SCAG | ICAART 2027 regular paper |
| --- | --- | --- |
| Topical fit | Best: applied game-agent configuration and evaluation | Adequate but broader: agents, simulation, planning, and evolutionary computing |
| First deadline | 2026-11-01 | 2026-09-15 AoE |
| Current paper | 15-page LNCS body plus references | 11-page SCITEPRESS A4 paper |
| Current PDF hash | `c44c0d5739a33ae4155c18f0eba8c480785f4e3e1b9e2250dc03a43733a6d0a1` | `7d4c26640a5f4da34783d1a533c8cfeb807d2d7b37a1e52acdc37b8cf6386c07` |
| Remote presentation | Conference says hybrid; remote-presenter election is not explicit | Home page permits exceptional remote presentation when travel is impossible; procedure and fee class need confirmation |
| AI policy | Eligibility unresolved because assistance exceeded copy editing | Writing/revision are permitted and AI-generated code is disclosure-covered; project-specific implementation eligibility and blind-review placement remain unresolved |
| Under-review AI confidentiality | Resolve with chairs if selected | Public-platform embargo is explicit; activate it at initial upload |
| Double-blind risk | Prior named public repository requires a ruling | Submitted-paper posting is prohibited; named code-repository handling is unspecified and requires a ruling |

Neither venue is currently cleared for upload. The remaining uncertainty is
governance, not manuscript or experiment completion.

ICAART is the operational primary candidate because its public AI policy
matches the recorded assistance and it publishes a live-online presentation
route. SCAG remains the stronger topical fit, but it should displace ICAART
only if its chairs give workable written answers to all four project-specific
questions.

ICAART reviewer assignment is already frozen: submit under **Agents**, choose
**Agent Models and Architectures**, **Simulation**, and **Task Planning and
Execution** when the exact call taxonomy is available, and copy the title,
abstract, and five keywords from `ICAART_REVIEWER_ASSIGNMENT_AUDIT.md` without
adding a broader ML claim.

## Actions requiring the author

Send the two factual inquiries in `CONTACT_TEMPLATES.md` now:

1. SCAG chairs and EvoApplications programme chairs: request one written reply
   covering scope, fully remote presentation, prior public repository exposure,
   and eligibility/disclosure for the recorded Codex assistance.
2. ICAART secretariat: request the exceptional remote-route procedure and fee
   class, a ruling on the named public code repository, exact instructions for
   AI disclosure in the double-blind version, and the permitted review-artifact
   attachment or anonymous-link route. The public evidence and remaining
   ambiguities are in `ICAART_POLICY_RECONCILIATION.md`.

Do not describe the AI work as copy editing. Do not send both manuscripts as
submissions, and do not make either PDF public during review. An anonymous PDF
may be supplied privately if a chair requests it.

For ICAART, the initial upload also starts the project's conservative
public-AI confidentiality embargo. Archive the exact submitted identity first,
then do not provide the manuscript, confidential reviews, or rebuttal drafts to
Codex, ChatGPT, or another public generative-AI service until the official
selection result.

## Required response record

Retain the original sent message and full response privately with:

| Field | Record |
| --- | --- |
| Venue and recipient | Name, role, and official address |
| Sent and answered | UTC timestamps |
| Exact questions | Unedited sent text |
| Scope ruling | Yes / no / conditions |
| Remote ruling | Yes / no / conditions and registration class |
| Repository ruling | Yes / no / required action |
| AI ruling | Eligibility, wording, placement, and citation instruction |
| Artifact ruling | Attachment/link mechanism, size limit, or not permitted |
| Evidence identity | Manuscript source commit and PDF SHA-256 |

An informal statement on a website is not a substitute for a response to the
project's exact circumstances.
Use a private copy of `ICAART_RULING_RESPONSE_TEMPLATE.md` to extract the four
ICAART answers and apply the fail-closed decision rules.

## Decision rule

- **Choose ICAART's September 15 regular round** if it confirms remote
  eligibility/procedure, repository handling, disclosure placement, and a
  definite reviewer-artifact instruction by **2026-08-25**. Artifact attachment
  is desirable rather than an eligibility condition: a ruling that no artifact
  is permitted is workable if the manuscript is revised not to imply reviewer
  access. This is the default route because it best matches the no-travel and
  transparent-AI constraints.
- **Choose SCAG instead** only if ICAART cannot provide a workable ruling and
  all four SCAG questions receive affirmative or workable written answers by
  **2026-08-25**. SCAG remains the stronger topical fit but the riskier policy
  fit.
- Make the one-venue decision by **2026-08-25**. If ICAART is chosen, insert the
  approved disclosure, perform the human verification and cold read, and
  refreeze by **2026-09-08**, leaving one week for PRIMORIS upload checks.
- If neither venue gives a workable remote/policy ruling, do not gamble on
  eligibility. Use the October 22 ICAART round only if the questions resolve,
  or move to the no-travel journal fallback in `VENUE_STRATEGY.md`.

Never submit simultaneously to both archival venues.

If the ICAART first-round paper is rejected, SPIKE 2027 may be considered
before its 2026-12-03 deadline only if the secretariat or special-session
chairs have already confirmed both topical scope and the permissibility of a
substantially revised, non-simultaneous same-year submission. The public dates
alone do not establish either condition.

## Work after venue selection

The empirical result is closed. Venue selection may change only formatting,
disclosure, metadata, and claim-preserving wording. It may not add games,
opened-family analyses, baselines, subgroup results, or stronger claims. Every
accepted edit triggers the venue-specific tests, PDF text/metadata scan, and a
complete rendered-page inspection before hashes are updated.
