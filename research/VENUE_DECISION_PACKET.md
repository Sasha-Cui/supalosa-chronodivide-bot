# Venue decision packet

Prepared: **2026-08-11**

This is the operational handoff for choosing one archival venue. It does not
send email, authorize submission, or replace a written venue ruling.

## Submission-ready choices

| Criterion | EvoApplications 2027 SCAG | ICAART 2027 regular paper |
| --- | --- | --- |
| Topical fit | Best: applied game-agent configuration and evaluation | Adequate but broader: agents, simulation, planning, and evolutionary computing |
| First deadline | 2026-11-01 | 2026-09-15 AoE |
| Current paper | 14-page LNCS body plus references | 10-page SCITEPRESS A4 paper |
| Current PDF hash | `e14f8265fb8b386fc2434927737eca15e5989be56cf141fba9f551b790e1aa05` | `9c606c4c5bc92ce762422aa79be79f14ab34e7b4bbe2616ae5f3cef3ff3c3082` |
| Remote presentation | Conference says hybrid; remote-presenter election is not explicit | Live online oral/poster procedures are explicit; election still needs confirmation |
| AI policy | Eligibility unresolved because assistance exceeded copy editing | Assistance is permitted with disclosure; blind-review placement is unresolved |
| Double-blind risk | Prior named public repository requires a ruling | Public submitted-paper posting is prohibited during review; repository handling should still be confirmed if asked |

Neither venue is currently cleared for upload. The remaining uncertainty is
governance, not manuscript or experiment completion.

## Actions requiring the author

Send the two factual inquiries in `CONTACT_TEMPLATES.md` now:

1. SCAG chairs and EvoApplications programme chairs: request one written reply
   covering scope, fully remote presentation, prior public repository exposure,
   and eligibility/disclosure for the recorded Codex assistance.
2. ICAART secretariat: request written confirmation that a regular-paper author
   may elect the live online route and exact instructions for AI disclosure in
   the double-blind version.

Do not describe the AI work as copy editing. Do not send both manuscripts as
submissions, and do not make either PDF public during review. An anonymous PDF
may be supplied privately if a chair requests it.

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
| Evidence identity | Manuscript source commit and PDF SHA-256 |

An informal statement on a website is not a substitute for a response to the
project's exact circumstances.

## Decision rule

- **Choose SCAG** only if all four SCAG questions receive affirmative or
  workable written rulings by **2026-08-20**. It remains the stronger topical
  fit.
- **Choose ICAART's September 15 regular round** if SCAG remains unresolved and
  ICAART confirms both remote election and disclosure placement by
  **2026-08-25**.
- Make the one-venue decision by **2026-09-01**. If ICAART is chosen, insert the
  approved disclosure, perform the human verification and cold read, and
  refreeze by **2026-09-08**, leaving one week for PRIMORIS upload checks.
- If neither venue gives a workable remote/policy ruling, do not gamble on
  eligibility. Use the October 22 ICAART round only if the questions resolve,
  or move to the no-travel journal fallback in `VENUE_STRATEGY.md`.

Never submit simultaneously to both archival venues.

## Work after venue selection

The empirical result is closed. Venue selection may change only formatting,
disclosure, metadata, and claim-preserving wording. It may not add games,
opened-family analyses, baselines, subgroup results, or stronger claims. Every
accepted edit triggers the venue-specific tests, PDF text/metadata scan, and a
complete rendered-page inspection before hashes are updated.
