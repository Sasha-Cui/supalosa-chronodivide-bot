# ICAART ruling response template

Prepared: **2026-08-11**

Status: **blank private-copy template; no inquiry has been sent and no ruling
has been received**.

Do not add author names, email addresses, message headers, signatures, or
private correspondence to this tracked file. Copy it to the private submission
record before use.

## Evidence identity

| Item | Frozen identity |
| --- | --- |
| Reviewed submission source | `bc0e6096ed89c7640bcbab5f3a4e7444e82f3b89` |
| ICAART PDF SHA-256 | `271363cdad2e6128588b34e5a64f7ddb38487cf3669067406516118b80797c71` |
| Aggregate artifact SHA-256 | `022b5dfdb9c6e58c6c42e4ee13e0e661e1210d5c6b5620b7314d22f31a732bf4` |
| Portal metadata SHA-256 | `8935329266d8b20e53a718371eb74e86ba15a645d6469106f3cc86b74c6c8e4a` |

## Outbound record

Complete these fields privately from the actual sent message:

| Field | Private record |
| --- | --- |
| Recipient | `icaart.secretariat@insticc.org` |
| Subject | ICAART 2027: remote, anonymity, AI disclosure, and reviewer artifact |
| Sent timestamp and timezone | |
| Full sent-message SHA-256 | |
| Sender account retained | yes / no |
| Delivery confirmation retained | yes / no |
| Anonymous manuscript attached | no / requested by venue / other |

Use the exact ICAART draft in `CONTACT_TEMPLATES.md`. If any sentence changes
before sending, retain the actual message and hash that version; this template
must not imply that an unsent draft was the correspondence.

## Ruling extraction

Copy the reply verbatim into the private record, then extract answers without
strengthening ambiguous language.

### 1. Exceptional remote presentation

| Required fact | Venue answer |
| --- | --- |
| This author may use the exceptional remote route | yes / no / conditional / unresolved |
| Request procedure | |
| Approval timing | before submission / after acceptance / other / unresolved |
| Required speaker registration class | |
| Fee and deadline | |
| Synchronous attendance requirements | |

Decision:

- **workable** only if eligibility and a definite approval procedure are
  stated;
- **follow up** if the reply merely links the public online-presentation page
  without addressing eligibility, procedure, or fee class;
- **ICAART no-go** if travel is required or remote approval cannot be known
  before an irreversible payment/registration commitment.

### 2. Previously public named repository

| Required fact | Venue answer |
| --- | --- |
| Prior visibility affects eligibility | no / yes / unresolved |
| Repository may remain public during review | yes / no / unresolved |
| If not, required visibility-change date | |
| Other anonymity action | |

Decision:

- public or temporarily private handling is workable if the prior exposure is
  explicitly permitted;
- make a repository private only after an explicit author decision and retain
  the ruling and visibility timestamps;
- **ICAART no-go** if prior lawful repository visibility itself disqualifies
  the paper;
- follow up if the reply discusses preprints but not the named code repository.

### 3. Generative-AI disclosure

| Required fact | Venue answer |
| --- | --- |
| Recorded beyond-copy-editing assistance is eligible | yes / no / conditional / unresolved |
| Review-version disclosure location | |
| Required wording | |
| Required AI-system citation form | |
| Sections that must carry a citation | |
| Camera-ready change, if different | |

Decision:

- **workable** only if the actual categories of assistance remain accurately
  disclosed and the blind-review placement/citation instruction is explicit;
- follow up if the reply repeats “put it in acknowledgments” without resolving
  the instruction to omit acknowledgments during double-blind review;
- **ICAART no-go** if eligibility depends on describing the assistance as copy
  editing, omitting required categories, or asserting human-only drafting.

### 4. Reviewer artifact

| Required fact | Venue answer |
| --- | --- |
| Artifact may accompany review | yes / no / unresolved |
| Delivery mechanism | PRIMORIS attachment / anonymous link / none / unresolved |
| Allowed archive types | |
| Size limit | |
| Link-anonymity requirements | |

Decision:

- attachment, anonymous link, or a clear “no artifact” ruling is workable;
- if no artifact is allowed, remove any reviewer-facing implication of access
  while retaining the aggregate release plan;
- follow up if the reply refers only to the 10 MB poster upload, which is not a
  review-artifact route.

## Overall venue decision

Record exactly one:

- `ICAART_FIRST_ROUND_WORKABLE`: remote, repository, and AI rulings are
  workable; artifact handling is definite even if the answer is “not allowed”;
- `FOLLOW_UP_REQUIRED`: at least one answer is generic or incomplete;
- `ICAART_INELIGIBLE`: remote, repository, or truthful AI-disclosure
  requirements cannot be met;
- `NO_RESPONSE_BY_INTERNAL_DEADLINE`: no decision-complete reply by the
  current venue-selection deadline.

Private decision record:

    Decision:
    Decision timestamp and timezone:
    Reply-message SHA-256:
    Decision maker:
    Conditions and deadlines:
    Required repository action:
    Required manuscript action:
    Required artifact action:
    Next venue if ineligible:

Do not mark the venue workable from silence, a public web page, an informal
third-party opinion, or a reply that leaves one of the three eligibility
questions unresolved.

## Minimal follow-up for an incomplete reply

Send only the missing items and quote the venue's original answer accurately:

> Thank you for the guidance. To make sure I follow it correctly, could you
> please confirm the unresolved item(s) below for this specific submission?
>
> - Remote presentation: [one missing fact].
> - Named code repository: [one missing fact].
> - Generative-AI disclosure: [one missing fact].
> - Reviewer artifact: [one missing fact].
>
> I will retain your answer with the submitted manuscript hash and follow the
> exact procedure you specify.

## Optional SPIKE special-session fallback

ICAART now lists the SPIKE 2027 special session on AI and agent-based systems
in competitive gaming, with a **2026-12-03** paper deadline. The first regular
round notifies on **2026-11-13**, so a rejected regular paper could in principle
be revised before that deadline. Neither scope nor same-year sequential
resubmission is established by the public pages.

Activate this fallback only if a written reply confirms both:

1. leakage-controlled configuration and held-out evaluation of an autonomous
   scripted RTS agent is within SPIKE's intended esports scope even though the
   paper does not study human player performance; and
2. a substantially revised paper may be submitted after a negative regular-
   round decision, with no simultaneous submission, without violating ICAART's
   originality or duplicate-submission rules.

If either point is unresolved, do not treat SPIKE as an eligible fallback.
