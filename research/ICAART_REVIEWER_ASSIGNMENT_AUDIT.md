# ICAART reviewer-assignment audit

Prepared: **2026-08-11**

This record freezes the claim-preserving metadata for an ICAART 2027 regular
paper. It does not authorize submission or resolve the remote-presentation and
AI-disclosure gates.

## Decision

- **Conference area:** Agents
- **Preferred call topics, in order:** Agent Models and Architectures;
  Simulation; Task Planning and Execution
- **Title:** Configuring a Scripted RTS Agent: Held-Out Evaluation in Chrono
  Divide
- **Keywords:** Game Artificial Intelligence; Real-time Strategy Games;
  Scripted Agents; Algorithm Configuration; Reproducible Evaluation
- **Paper class:** Regular paper reporting completed and validated research

Use the exact topic labels only if PRIMORIS offers the published call taxonomy.
If the form limits the number of topics, retain them in the order above. Copy
the abstract from `paper_scitepress/abstract.tex`; do not improvise a stronger
submission-system summary.

## Evidence for the assignment

ICAART 2027 has two main areas, Agents and Artificial Intelligence. The Agents
area explicitly includes Agent Models and Architectures, Simulation, and Task
Planning and Execution. The paper configures and evaluates one scripted RTS
agent architecture through controlled head-to-head simulation, so those labels
describe the object, method, and behavior under study without inflating the
contribution.

The title already exposes the agent type, domain, and held-out design. The
abstract identifies the existing environment, StrongBot and the external
Supalosa opponent, the deterministic configuration workflow, the frozen
family-level experiment, the positive relative result, the failed absolute
gate, and the scope boundary. Rewriting either field for venue fit would risk
claim drift and is unnecessary.

The old **Distribution Shift** keyword was removed. Map-family holdout is part
of the validity design, but the paper does not estimate a general shift model,
introduce a distribution-shift algorithm, or claim broad temporal/domain
generalization. That label could send the paper to a generic ML reviewer who
would reasonably expect multiple datasets, model families, and shift types.

## Deliberate non-selections

- **Multi-Agent Systems:** two adversarial bots interact, but the contribution
  is not cooperation, communication, collective learning, or a multi-agent
  architecture.
- **Machine Learning / Deep Learning / Neural Networks:** StrongBot is scripted
  and the study does not train a learned function approximator.
- **Evolutionary Computing:** deterministic mutation generates a finite search
  set, but the paper explicitly disclaims a new evolutionary optimizer.
- **Fairness and Reliability:** reliability is an evaluation goal, but this
  call label is broader than the concrete simulation/provenance contribution.
- **SPIKE special session:** the paper concerns a game agent, not esports
  performance analytics, player modeling, audience engagement, or match
  prediction. The main Agents area is the more faithful assignment.

## Review-criterion audit

ICAART says regular papers are rated on relevance, originality, technical
quality, significance, and presentation. The metadata supports those criteria
without changing the evidence:

| Criterion | Reader-facing support | Residual risk |
| --- | --- | --- |
| Relevance | Scripted RTS agent, simulation, task execution, and configuration are explicit on page 1 | Chrono Divide is niche |
| Originality | Family-disjoint, provenance-bound evaluation is distinguished from a new environment or optimizer | Engineering contribution may look incremental |
| Technical quality | Sealed families, isolated baseline, controlled randomness, reciprocal starts, clustered inference, and fail-closed accounting | One opponent and one matchup |
| Significance | Large family-consistent relative gain and a reusable audit pattern | Absolute superiority failed; generality is bounded |
| Presentation | Title, abstract, RQs, tables, figures, and conclusion expose the positive and negative endpoints | High draw rate requires careful reading |

The correct reviewer-facing claim remains: configuration robustly improves the
frozen generic coordinate-free reference against pinned Supalosa on the tested
map-family population. It is not a claim that StrongBot reliably beats
Supalosa, improves the deployed StrongBot default, introduces Chrono Divide,
or contributes a new optimizer.

## Upload-time controls

1. Select **Agents**, then the three preferred call topics when available.
2. Paste the frozen title, abstract, and keywords exactly.
3. Do not add **distribution shift**, **multi-agent learning**, **new game
   environment**, or **state-of-the-art bot** to free-text fields.
4. Recheck the downloaded venue-rendered PDF against the retained SHA-256.
5. Apply only the written venue-approved AI disclosure; do not silently add an
   acknowledgment that breaks double-blind review.

## Official sources

- [ICAART 2027 call and topic taxonomy](https://icaart.scitevents.org/CallForPapers.aspx?y=2027)
- [ICAART 2027 submission and review criteria](https://icaart.scitevents.org/Guidelines.aspx?y=2027)
- [ICAART 2027 reviewer guidance](https://icaart.scitevents.org/EthicsOfReview.aspx?y=2027)
- [ICAART 2027 SPIKE special-session scope](https://icaart.scitevents.org/SPIKE.aspx?y=2027)
