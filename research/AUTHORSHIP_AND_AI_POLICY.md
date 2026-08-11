# Authorship and generative-AI policy gate

Verified: **2026-08-11**

## Why this is a submission gate

OpenAI Codex has assisted this project beyond copy editing. Its work has
included repository forensics, software implementation, experiment
orchestration, validation scripts, statistical cross-checks, literature
triage, and manuscript drafting and revision. The human author supplied the
project, research objective, domain decisions, compute authorization, and
publication intent, but this history cannot accurately be described as
grammar-only assistance.

The latest discoverable [EvoStar code](https://www.evostar.org/2025/the-evostar-code/)
says that generative AI may correct grammar, typography, and clarity but should
not produce material. The 2027 submission page does not currently state a
separate generative-AI rule. By contrast, current
[Springer Nature guidance](https://group.springernature.com/gp/group/ai/ai-guidance-for-our-researchers-and-communities)
permits declared generative-AI assistance when human authors remain accountable,
fact-check the work, and disclose use beyond copy editing. The venue-specific
language may therefore be stricter than the publisher policy.

Do not infer permission from the publisher policy, and do not characterize the
project history as copy editing. Obtain a written ruling from EvoApplications
before submission.

ICAART 2027 is the operational primary candidate. Its official
[AI-tools guidance](https://icaart.scitevents.org/AiTools.aspx?y=2027) explicitly
permits responsible manuscript writing, revision, literature-overview, and
language assistance. It also treats AI-generated code as content that must be
disclosed and prohibits fabrication or manipulation of research code or
results. Because this project includes substantial implementation and
orchestration assistance, the inquiry asks for project-specific eligibility
rather than inferring it. The policy requires disclosure of the tool and
affected content and keeps human authors fully accountable. The 2027 guidelines
also say that affected sections should cite the AI system. The same
double-blind call asks authors to omit acknowledgments, so the secretariat must
specify where both the disclosure and system citation belong in the review
version. The factual inquiry is in
[`CONTACT_TEMPLATES.md`](CONTACT_TEMPLATES.md), and the conflicting public
instructions are reconciled in
[`ICAART_POLICY_RECONCILIATION.md`](ICAART_POLICY_RECONCILIATION.md).

## Under-review confidentiality embargo

ICAART's AI-tools policy says that manuscripts under review must not be
processed through public AI platforms. The operational boundary for this
project is deliberately conservative:

- pre-submission assistance must be disclosed and independently verified as
  described above;
- at the initial PRIMORIS upload, stop providing the submitted manuscript,
  confidential reviews, or rebuttal drafts to Codex, ChatGPT, or another
  public generative-AI service;
- keep that embargo active until the final selection result; and
- use only human review or a venue-approved, contractually private system for
  confidential post-submission work.

Archive the submitted PDF, source identity, and disclosure record before the
embargo begins. Also retain a private offline copy of
[`ICAART_REBUTTAL_EVIDENCE_PACKET.md`](ICAART_REBUTTAL_EVIDENCE_PACKET.md),
after verifying that its bound PDF hash matches the submitted file. The packet
is a pre-submission fact index, not permission to process a confidential review
with a public AI system. Do not use a public AI system to draft an ICAART
rebuttal.

## Required author verification

Regardless of venue policy, the author must personally complete all of the
following before signing or submitting the paper:

1. Read the complete main paper and supplement and approve every claim,
   limitation, interpretation, and contribution statement.
2. Inspect the frozen aggregate artifacts and independently reproduce the
   headline estimates, confidence intervals, gates, and game counts.
3. Read every cited source sufficiently to verify that the associated sentence
   is accurate and that no citation was selected solely from an AI summary.
4. Review the method-v1/method-v2 adaptation history, sealed-test boundary,
   scheduler failures, and accepted-job ledger against the primary records.
5. Review every committed author-owned code change that affects experimental
   behavior or analysis.
6. Confirm that no confidential, personal, or third-party material was provided
   to a generative system contrary to applicable terms.
7. Approve and retain the exact disclosure language required by the venue and
   publisher.
8. Confirm that the under-review public-AI embargo is documented and ready to
   activate at the initial upload.

Completion should be recorded privately with the manuscript commit and PDF
hash. A checkbox without the underlying review is not evidence.
Use `HUMAN_AUTHOR_VERIFICATION_PACKET.md` for the evidence-indexed procedure
and private sign-off template. The tracked packet must remain blank; completing
it mechanically or through another AI review does not satisfy this gate.

## Chair question and decision rule

The chair inquiry in
[`CONTACT_TEMPLATES.md`](CONTACT_TEMPLATES.md) describes the actual categories
of assistance and asks whether the paper is eligible and what disclosure is
required.

- If the chair permits the use, follow the exact disclosure instruction and
  retain the written response.
- If the chair permits only copy editing, do not submit the current project to
  EvoStar under a misleading description. Ask whether a fully human-verified
  and rewritten manuscript is sufficient; otherwise choose a venue whose policy
  allows transparent declared assistance.
- If no ruling arrives, treat eligibility as unresolved and use a verified
  fallback rather than gambling on silent noncompliance.
- For ICAART, obtain written instructions for the disclosure location,
  wording, and system-citation form, plus the reviewer-artifact delivery route,
  and retain them with the final manuscript hash. Public permission is not a
  reason to reduce the human verification requirement.

## Draft disclosure, if permitted

The following is a factual starting point, not final venue-approved wording:

> OpenAI Codex assisted with software implementation, experiment
> orchestration, research auditing, statistical verification, literature
> triage, and manuscript drafting and editing. The author reviewed the primary
> evidence and cited sources, verified the analyses, approved the final text,
> and takes full responsibility for the work.

Do not include this statement until the listed author verification is actually
complete. For double-blind review, place any required disclosure where the
chairs direct without adding identifying information.
