# Submission execution roadmap

Prepared: **2026-08-11**

Primary target: EvoApplications 2027, SCAG special session. Official paper
deadline: **2026-11-01**. The plan assumes no additional outcome-bearing games
on the opened family population.

## 11--17 August 2026: external policy decisions

- Send the three drafts in [`CONTACT_TEMPLATES.md`](CONTACT_TEMPLATES.md).
- Obtain written scope, remote-presentation, and double-blind repository
  rulings from EvoStar/SCAG.
- Obtain a written eligibility and disclosure ruling for the recorded
  beyond-copy-editing use of OpenAI Codex. Do not submit under a grammar-only
  description.
- Send the ICAART inquiry in `CONTACT_TEMPLATES.md` in parallel so that the
  online-presentation route and double-blind disclosure location are known
  before a fallback conversion begins.
- Begin the human verification checklist in
  [`AUTHORSHIP_AND_AI_POLICY.md`](AUTHORSHIP_AND_AI_POLICY.md), including
  primary evidence, all citations, experiment-affecting code, and the complete
  manuscript. The official 10 MB supplementary-material field is already
  documented; keep every essential claim and method in the main paper.
- Request explicit redistribution/license terms from Supalosa.
- Request Chrono Divide citation, version-pinning, and acquisition guidance.
- If the chair requires a non-public repository, change visibility without
  deleting or rewriting evidence history.

Exit condition: venue, anonymity, remote-presentation, and generative-AI
eligibility routes are known, even if upstream code permission is still
pending. The aggregate-only artifact is sufficient for review and does not
depend on bot redistribution.

If EvoStar has not supplied affirmative written rulings by **2026-08-20**,
begin a 12-page SCITEPRESS conversion for ICAART without changing the frozen
science. This is preparation, not simultaneous submission.

## 18--31 August 2026: independent reading pass

- Give the PDF, not the repository, to one technically literate reader using
  the neutral prompts in [`EXTERNAL_REVIEW_PACKET.md`](EXTERNAL_REVIEW_PACKET.md).
- Ask the reader to summarize the claim, method-v1/method-v2 sequence, and why
  0.535 does not establish reliable superiority.
- Repair any point the reader cannot explain correctly after one reading.
- Ask a second reader to check only figures, tables, captions, and limitations.
- Rebuild and repeat page, citation, anonymity, and visual QA after edits.

Exit condition: an outside reader reproduces the intended takeaway without
being coached by the authors.

## 1--20 September 2026: venue-shaped revision

- Adjust title, keywords, and related-work emphasis to the chair's SCAG scope
  guidance without changing the frozen claims.
- Keep the evaluation contribution primary; do not manufacture evolutionary
  algorithm novelty.
- Add author names, acknowledgements, funding, and non-anonymous URLs only to a
  camera-ready source revision after double-blind review.
- Test the review archive on a machine other than Bouchet if possible.
- If ICAART is activated, finish the two-column A4 conversion, preserve every
  failed-gate and scope limitation, and submit the regular paper by
  **2026-09-15 AoE**. Keep an 8-page short-paper reduction plan available in
  case the venue changes the acceptance type.

Exit condition: content-complete submission candidate and independently tested
review artifact.

## 21 September--15 October 2026: submission package

- Reverify the official call, 14-page rule, deadline timezone, remote policy,
  registration requirement, and submission fields.
- Freeze the PDF, supplement, anonymous archive, archive SHA-256, abstract,
  keywords, conflicts, and author metadata in a submission checklist.
- Run the final claim/statistics audit against committed JSON artifacts and the
  result registry.
- Render every PDF page one last time and inspect at normal reading scale.

Exit condition: upload-ready package by the internal **2026-10-15** deadline.

## 16 October--1 November 2026: buffer and submit

- Make only error corrections; do not add analyses or outcome-bearing evidence.
- Upload early enough to download and inspect the venue-generated submission
  copy.
- Store the submission ID, uploaded hashes, confirmation email, and exact PDF
  in the private submission record. Use
  [`SUBMISSION_CHECKLIST.md`](SUBMISSION_CHECKLIST.md) as the freeze record.

## Fallback trigger

If EvoStar rejects remote presentation, says the prior public repository is
incompatible with double-blind review, considers the paper out of SCAG scope,
or disallows the recorded generative-AI assistance, activate a policy-compatible
venue fallback rather than conceal the project history or weaken the
methodology:

1. activate ICAART's **2026-09-15** regular-paper round if the conversion is
   ready, or reverify its **2026-10-22** regular-paper round;
2. otherwise use the **2026-12-03** ICAART workshop/special-session round if a
   suitable track exists; or
3. use *Entertainment Computing* as the no-travel archival fallback.

Do not submit simultaneously to incompatible archival venues.
