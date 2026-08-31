# ICAART 8-page short-paper reduction plan

Updated: **2026-08-30**

Status: **contingency only; do not apply before an acceptance decision**.

## Trigger and frozen source

ICAART may classify an accepted regular submission as a 12-page full paper or
an 8-page short paper. Apply this plan only if the acceptance notice requires
eight proceedings pages.

Controlling review source:

- source commit: `4e2ba4eb599ffd37fec5d0f5da620c20dca80fa5`;
- PDF SHA-256:
  `4b6a2d17bf20c77c46ab4f6c0f010648edcb226862008dbc386fc69a18b62e9b`;
- 12 A4 pages, 36,004 non-whitespace characters, 190-word abstract.

Do not shorten the review submission preemptively. The full paper uses its
space to answer likely objections about map/opponent scope, literal victory,
mechanism isolation, uncertainty, and screenshot selection.

## Scientific invariants

An 8-page version must retain all of these:

1. Chrono Divide is an existing environment and StrongBot is a scripted
   derivative, not a new learned general policy.
2. HFO confirmation is 633W/24D/63L over 720 balanced games, with pooled
   Wilson lower 85.78% and country-start lower 84.49%.
3. Peak reciprocal macro replication is 134W/14D/32L versus 92W/16D/72L
   control, with paired lower +0.167 and country-start lower 63.26%.
4. Allied west, Soviet west, and bottom-retarget mechanisms each have fresh
   paired replication and exact inactive-cell gates.
5. Victory means literal destruction of every enemy building; resignation is
   suppressed symmetrically.
6. Advanced transfer is negative: StrongBot 79/19/262 versus Supalosa
   178/30/152 on the same independent-opponent cases.
7. The paper claims neither optimizer novelty, universal opponent dominance,
   nor broad map generalization.
8. Generative-AI disclosure, third-party rights, and aggregate-versus-full
   replay boundaries remain accurate.

No cut may turn the result into an HFO-only paper, hide Advanced, remove the
deployed Peak control, or replace uncertainty with raw W/D/L alone.

## Current page anatomy

- Pages 1--3: abstract, introduction, related work, environment.
- Pages 4--5: threat table, policy layers, algorithm, development gates,
  uncertainty.
- Pages 5--7: quantitative results and tactical discussion.
- Page 8: six-frame Peak sequence.
- Page 9: nine-frame HFO tactics/limitation sequence and reproducibility start.
- Page 10: limitations, disclosure, conclusion, references start.
- Pages 11--12: references.

Four pages must be removed without shrinking type or weakening claims.

## Ordered reduction

Apply one class at a time, rebuild, and stop once the PDF is at most eight
pages.

### 1. Compress screenshots while preserving tactics

Expected saving: **1.0--1.4 pages**.

- Peak: return to a 3-by-2 panel at 0.325 text width, retaining all six fixed
  frames. This remains readable but uses roughly half a page rather than a
  dedicated page.
- HFO: retain the six force-clearance/final-building frames. Move the three
  tick-cap images to the artifact and retain one sentence with the exact
  terminal inventory and honest failure interpretation.
- Do not crop or substitute cases. The source PNGs and selection manifest stay
  unchanged.

This preserves annotated tactical evidence for reciprocal activation, force
clearance, and winning by destroying the final building.

### 2. Merge or prose-render secondary tables

Expected saving: **0.5--0.8 pages**.

- Keep the primary HFO/Peak table and the mechanism replication table.
- Render Peak side/start/slot strata in one sentence, preserving all W/D/L
  counts in the artifact.
- Render Advanced StrongBot/Supalosa W/D/L and paired difference in one compact
  paragraph instead of a separate table.
- Keep exact sample sizes and lower bounds in prose.

### 3. Compress related work and references together

Expected saving: **0.8--1.1 pages**.

- Reduce related work to approximately 300 words.
- Retain Chrono Divide/game API/Supalosa/RA2Web software sources.
- Retain the closest map adaptation, automatic RTS configuration,
  programmatic-policy, evaluation, uncertainty, and common-random-number
  sources.
- Remove a citation only when its associated proposition is removed.
- Regenerate the 30-key citation audit for the short source; never leave
  uncited entries.

### 4. Tighten method without deleting the evidence contract

Expected saving: **0.5--0.8 pages**.

- Convert Algorithm 1 to a compact boxed decision list or eight-line
  pseudocode.
- Merge the prose repetition after the mechanism table into the results.
- Keep the paired-difference and country-start formulas, seed isolation,
  literal endpoint, no-retry rule, and exact inactive-cell definition.
- Compress the threat table from eight to five rows by merging related
  provenance controls.

### 5. Tighten discussion, reproducibility, and limitations

Expected saving: **0.6--0.9 pages**.

- Keep one paragraph each on conditional-program design, literal objective
  completion, and opponent overfitting.
- Collapse artifact implementation detail to hashes, fail-closed generation,
  and the third-party exclusion boundary.
- Keep all six substantive limitations: opponent, map, agent class, residual
  failure, causal resolution, and adaptive research history, but reduce each
  to one or two sentences.
- Keep the full AI disclosure unless the venue supplies shorter approved
  wording.

### 6. Last-resort claim-neutral cuts

Expected saving: **up to 0.4 pages**.

- Shorten captions after confirming each visual remains independently
  interpretable.
- Merge adjacent paragraphs and remove repeated numerical restatements.
- Move detailed scheduler/job provenance to the artifact while retaining the
  no-selective-retry rule.

Never reduce font size, margins, line spacing, column gap, bibliography font,
or screenshot resolution below readability. Do not purchase extra pages before
trying content-preserving cuts.

## Required 8-page contents

The short paper must still contain:

- the four research questions or their exact equivalents;
- threat/evidence controls in prose or compact table;
- StrongBot policy layers and inferential-unit definition;
- one primary table with HFO and Peak;
- one mechanism table;
- Advanced negative transfer;
- at least 12 deterministic tactical frames if feasible, with six as the
  absolute minimum;
- reproducibility/release boundary, limitations, and AI disclosure; and
- a conclusion naming both positive maps and the Advanced limit.

## Verification

1. Branch from the exact accepted source; never edit the frozen review PDF.
2. Record each cut and its page/character effect.
3. Regenerate metrics/tables from the same final evidence artifact.
4. Require at most eight A4 pages including references and disclosure.
5. Run all research, paper, artifact, citation, anonymity, and frozen-identity
   tests.
6. Verify every headline number, 70--200-word abstract, character band, and
   citation key.
7. Render and inspect all eight pages at normal and full resolution.
8. Build twice from a clean export and require byte-identical PDFs.
9. Repeat the human verification and an unprimed cold read on the reduced
   paper; the 12-page sign-off does not transfer automatically.

## Acceptance test

An unprimed reader must still answer:

- On which two maps does StrongBot reliably beat Supalosa?
- What mechanism evidence supports the improvement?
- What is the literal victory condition?
- What does the Advanced reversal rule out?
- Which units underlie paired and country-start uncertainty?
- What is original if Chrono Divide and the configuration techniques already
  exist?

If compression makes any answer weaker or ambiguous, restore the missing
context and cut elsewhere.
