# RA2Web Advanced public-state diagnostic V7 amendment 1

Status: **prospectively frozen before amended traces**

Date frozen: 2026-08-31

## Reason for amendment

The complete V7 array and finalizer ran cleanly, but the post-aggregate audit in
`research/results/2026-08-31-hfo-advanced-public-state-diagnostic-v7.md`
identified seven telemetry and analysis omissions relative to the original
protocol. The nominal pass is rejected. This amendment repairs only those
omissions; it does not change a policy, case, endpoint, outcome definition, or
scientific success gate.

## Immutable population and policies

- Reuse all and only the same 36 already-consumed V6 development cases selected
  by SHA-256
  `16548a7443a3e1d181a44b46dfc5fefe185241521fe6db06814ca461868d32a7`.
- Run both original arms on every case: pinned external Supalosa and exact
  deployed StrongBot.
- Run exactly 72 cells. No subset, replacement, retry, or new seed is allowed.
- Retain the original map, runtime, baseline, Advanced bundle, literal endpoint,
  90,000-update cap, 300-update snapshots through 30,000, symmetric resignation
  suppression, scheduler accounting, and source-hash rules.
- The 72 V6 validation and 360 V6 replication cases remain sealed and are
  prohibited inputs.

The repeated development endpoints are diagnostic only and do not add
independent performance evidence.

## Required telemetry repairs

Each cell must add:

1. candidate-view public snapshots generated only from the candidate's
   `GameApi` and production API;
2. opponent-view public snapshots generated separately only from the
   opponent's `GameApi` and production API;
3. separate canonical hashes for both public traces;
4. first `queueForProduction` timing in the candidate milestone record;
5. explicit action-ownership conflict output. Because neither immutable arm has
   an overlay, this must be `applicable=false`, `count=0`, with the declared
   reason; and
6. recursive prohibited-key audits for both public traces.

Opponent-view fields are analysis-only and are never admissible inputs to the
later StrongBot policy grammar.

## Required aggregate repairs

The finalizer must add:

- actionable-window fractions separately for Allied, Soviet, slot 0, and slot
  1 losses at every frozen candidate update; each group must contain at least
  eight observed losses and must independently remain at least 0.75 viable for
  the selected window;
- leave-country-out, leave-slot-out, and leave-repeat-block-out depth-one trees
  with deterministic permutation importance;
- the same three grouped analyses using only deployed StrongBot rows, reported
  separately from the pooled analysis;
- a declaration that pooled early credit classification is policy-confounded
  whenever the selected stump primarily separates immutable arms;
- fixed representative trace selection within each arm. Sort complete rows by
  outcome score (`loss=0`, `draw=0.5`, `win=1`), then update count, then
  population-case index; select array indices
  `floor(0.25*(n-1))`, `floor(0.50*(n-1))`, and
  `floor(0.75*(n-1))`; report only case identity and both trace hashes; and
- explicit zero action-ownership conflicts in all 72 cells.

## Amended pass criteria

The amended diagnostic passes only if:

- all original V7 identity, determinism, coverage, endpoint, and scheduler
  gates pass;
- both candidate/opponent task-0 trace hashes reproduce on the prespecified
  repeat for each arm;
- both public traces have zero prohibited keys;
- first-production timing is present in every cell that issued production;
- every cell reports the exact non-applicable zero-conflict declaration;
- an actionable window passes overall and in all four side/slot groups;
- all three grouped analyses are present for pooled and StrongBot-only rows;
- fixed representative traces are present for both arms; and
- the aggregate labels policy-confounded pooled classification conservatively.

No minimum predictive accuracy is introduced by this amendment. Classification
is diagnostic, and absence of within-StrongBot predictability is a valid result.

## Execution discipline

Commit implementation and tests on clean synchronized `main`, run an
outcome-free 1,200-update smoke, then submit exactly 72 CPU `day` tasks under
`pi_jss233` with concurrency at most 64 and an `afterok` fail-closed finalizer.
Do not inspect partial cells or modify tracked source while jobs run. Inspect
only the complete amended aggregate, preserve it with all scheduler IDs and
hashes, and only then decide whether the V7 synthesis grammar may be frozen.
