# External contact templates

Prepared: **2026-08-11**

These messages are drafts only. The repository has not sent them or contacted
any third party.

## EvoStar / EvoApplications / SCAG chairs

**Subject:** EvoApplications 2027 SCAG: scope, remote presentation, and policy questions

Suggested recipients: the SCAG organizers listed on the official call, with
the EvoApplications programme chairs copied. Replace `(at)` with `@` only in
the private message: `alberto.tonda(at)inra.fr`, `amorag(at)ugr.es`,
`mjdiaz(at)unex.es`, and `jamal(at)uma.es`.

> Dear EvoApplications/SCAG Chairs,
>
> I am preparing a submission to the 2027 Soft Computing Applied to Games
> session on reproducible configuration and held-out evaluation of a scripted
> real-time-strategy agent. Before submitting, could you please clarify four
> policy points?
>
> 1. If the paper is accepted, may the presenting author deliver the talk fully
>    online rather than travel to Mainz? The conference site describes the event
>    as hybrid, but I could not find a definitive 2027 remote-presenter rule.
> 2. The submission PDF and reviewer artifact will be anonymous, but development
>    source and result records have previously appeared in a named public GitHub
>    repository. Does this conflict with the double-blind policy? If so, would
>    making that repository non-public for the review period satisfy the policy,
>    or is the prior public posting itself disqualifying?
> 3. The study applies established configuration techniques rather than proposing
>    a new evolutionary algorithm. Its contribution is a leakage-controlled,
>    reproducible evaluation protocol plus held-out evidence for a scripted game
>    agent. Is that application/evaluation emphasis within the intended SCAG
>    scope?
> 4. OpenAI Codex has assisted beyond copy editing, including software
>    implementation, experiment orchestration, research auditing, statistical
>    cross-checks, literature triage, and manuscript drafting and revision. I
>    remain solely accountable for the work, will personally verify the primary
>    evidence and cited sources, and will make any required disclosure. The
>    published EvoStar code says that AI may enhance clarity but should not
>    produce material, whereas Springer Nature permits broader declared use with
>    human accountability. Is this project eligible for EvoApplications, and if
>    so, what disclosure do you require?
>
> For context, the anonymous study uses five run-distinct, deterministically
> mutation-generated 32-policy pools, successive halving, and a training-only
> common-seed championship. Evaluation groups map revisions into disjoint
> families and opens 16 sealed families once. The configured policy improves
> a prospectively frozen generic StrongBot reference by 0.336
> (family-clustered 95% CI [0.215, 0.457]) against
> one pinned external opponent, but a separate prespecified gate does not
> establish that it reliably beats that opponent. The paper claims an applied
> configuration-and-evaluation workflow, not optimizer novelty or broad game-AI
> superiority.
>
> I plan to use the official 10 MB supplementary-material field for a separate
> anonymous supplement and a small aggregate reproducibility artifact while
> keeping all essential claims and methods in the main paper.
>
> I would appreciate a written ruling before registration or submission. I am
> happy to provide the anonymous manuscript if useful.
>
> Best regards,
> [author name]

Retain the response with the submission records. Do not infer permission from
the word “hybrid” alone, and do not describe the recorded AI assistance as
copy editing.

## ICAART secretariat

**Subject:** ICAART 2027: online presentation and double-blind AI disclosure

Suggested recipient from the official call: `icaart.secretariat(at)insticc.org`.

> Dear ICAART Secretariat,
>
> I am considering a 2027 regular-paper submission on reproducible
> configuration and held-out evaluation of a scripted real-time-strategy
> agent. I have prepared an anonymous 10-page version in the official
> SCITEPRESS template. Before submitting it, could you please clarify two
> points?
>
> 1. The presenter instructions describe live online oral and poster
>    presentations over Zoom. May an author elect this online route for an
>    accepted regular paper without traveling to the physical venue?
> 2. The ICAART AI-tools policy permits disclosed assistance with manuscript
>    writing, revision, and code. OpenAI Codex assisted this project with
>    software implementation, experiment orchestration, research auditing,
>    statistical cross-checks, literature triage, and manuscript drafting and
>    revision. The human author will personally verify the evidence, citations,
>    code, and final manuscript and remain fully accountable. The 2027
>    guidelines require AI-generated text to be disclosed in acknowledgments
>    and say that affected sections should cite the AI system, but the same
>    double-blind instructions require authors to omit acknowledgments. Where
>    should the disclosure and any system citation appear in the review
>    version, and what exact wording or citation form do you require?
>
> The paper reports a completed 8,704-game study with family-disjoint training
> and evaluation. Its configured policy improves a prospectively frozen generic
> StrongBot reference on 16
> sealed map families, while a separate absolute-strength gate fails; the paper
> does not claim a new optimizer or broad agent superiority.
>
> I would appreciate written confirmation before submission or registration.
>
> Best regards,
> [author name]

Retain the answer with the submission record. The public AI policy establishes
that disclosed assistance is allowed in principle, but the disclosure location
and availability of the online route still require confirmation.

## Supalosa

**Subject:** Permission and licensing for a research fork of your Chrono Divide bot

> Hi Supalosa,
>
> I am the author of StrongBot, a research fork of your
> `supalosa-chronodivide-bot`. I now have a paper draft and a completed held-out
> study. The result is deliberately scoped: the configured StrongBot policy
> substantially improves a prospectively frozen generic StrongBot reference
> against a pinned copy of
> your bot, but the experiment does not establish that StrongBot reliably beats
> Supalosa.
>
> I would like to release the derived bot and the author-written research
> harness after review. Your repository currently has no license file and its
> package metadata says `UNLICENSED`, so I have excluded all bot source from the
> anonymous reviewer artifact and will not assign it an open-source license
> without your permission.
>
> Would you be willing to grant permission to redistribute the derived bot? If
> so, please let me know your preferred license and attribution language. I can
> provide the exact fork revision, a source diff, the paper, and the proposed
> third-party notice. Red Alert 2 maps/assets and Chrono Divide code would remain
> excluded under their own terms.
>
> Thank you for creating and sharing the original bot.
>
> Best,
> [author name]

Ask for an explicit written license or permission statement, not only an
informal expression of support.

## Chrono Divide author/maintainer

**Subject:** Reproducibility and citation guidance for a Chrono Divide bot paper

> Hi,
>
> I have completed a paper draft that uses Chrono Divide 0.75.0 as the simulator
> for reproducible configuration and held-out evaluation of a scripted bot. The
> paper clearly describes Chrono Divide as an existing independent browser
> reconstruction of Red Alert 2; it does not claim to introduce the environment.
>
> For peer review I currently release only aggregate results, hashes,
> author-written orchestration, and paper-generation code. I do not redistribute
> Chrono Divide source/binaries, Red Alert 2 maps, MIX archives, or game assets.
> Could you advise on the preferred scholarly citation and any permitted way to
> pin or acquire the exact 0.75.0 runtime/API for reproduction? If you allow
> archival redistribution of any specific runtime component, please identify
> the applicable license and attribution.
>
> I would also welcome a factual check of the short environment description once
> the paper is ready to share. This is not a request to endorse the empirical
> claims.
>
> Best regards,
> [author name]

Record any version, license, attribution, or acquisition instructions in the
artifact boundary before public release.
