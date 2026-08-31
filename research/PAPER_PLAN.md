# Final paper plan

Status: **empirically complete; anonymous manuscript and review artifact pass**.

## Title

**StrongBot: Auditable Map-Profiled RTS Agent Development in Chrono Divide**

## One-sentence takeaway

A layered scripted agent, developed through prospectively scoped and
trace-isolated interventions, reliably beats pinned Supalosa under literal
all-building elimination on two Chrono Divide maps, while a paired RA2Web
Advanced test exposes a sharp cross-opponent limitation.

## Research questions and answers

1. **Does StrongBot reliably beat Supalosa on HFO?** Yes: 633/24/63 over 720
   balanced games; pooled and country-by-start one-sided lower bounds exceed
   0.84.
2. **Which scoped mechanisms matter?** Allied and Soviet west rush/guard and
   bottom progress-gated retarget each replicate on fresh paired cases and are
   exactly inactive outside their declared cells.
3. **Can the policy extend beyond HFO?** On Peak, applying an existing macro
   profile to the reciprocal start improves 92/16/72 control to 134/14/32 on
   fresh cases, with paired lower gain +0.167.
4. **Does the HFO policy generalize across opponents?** No. Against RA2Web
   Advanced, StrongBot falls to 79/19/262 and underperforms pinned Supalosa.

## Contributions

1. An auditable use of the existing Chrono Divide offline API for deterministic
   paired, literal-objective full-game evaluation.
2. StrongBot, a map-profiled layered scripted policy with interpretable west
   rush/guard, progress-gated building retarget, and literal closeout logic.
3. Fresh paired mechanism replications with exact inactive-cell trace equality.
4. A factorial and sealed replication of reciprocal spatial-profile scope on
   Peak of Perfection.
5. Protocol-selected deterministic game frames and an independently sourced
   opponent test that bound the positive claim.

## Paper structure

1. Introduction and four research questions.
2. Related RTS agents, programmatic strategies, configuration, and evaluation.
3. Chrono Divide environment, literal endpoint, deterministic streams, and
   threat-to-control evidence contract.
4. StrongBot policy layers, pseudocode, prospective gates, and uncertainty.
5. HFO, mechanisms, Peak, and Advanced results.
6. Deterministic tactical frames and design implications.
7. Reproducibility, release boundary, limitations, and AI disclosure.
8. Bounded conclusion.

## Claims to avoid

- Chrono Divide is new or authored by this project.
- The configuration machinery is a novel general optimizer.
- StrongBot dominates all bots, maps, or human players.
- The negative Advanced result can be repaired by post-hoc subset selection.
- Screenshots are causal evidence or substitutes for the complete replications.
- This is a paradigm shift.

## Target and finish line

ICAART 2027 is the operational archival target because the contribution is an
applied agent/evaluation paper and the 12-page SCITEPRESS candidate already
passes. A relevant remote-compatible workshop is the fallback if venue policy
or author logistics block ICAART. The technical paper and reviewer artifact are
finished; only the human actions in `SUBMISSION_CHECKLIST.md` remain.
