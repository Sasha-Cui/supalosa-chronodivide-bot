# Unified intent M2 C1: long-horizon technical diagnostic

Frozen: 2026-09-13, after array `26114584` was canceled and before any C1
initialization or trace.

Parents:

- `research/protocols/method/2026-09-12-unified-intent-arbiter-v1-m2-open-development.md`
- `research/results/2026-09-13-unified-intent-m2-cancelled-technical-failure.md`

## Purpose

Identify which technical contract invalidated the first M2 array without
opening partial outcomes. C1 cannot estimate policy strength, complete the
failed M2 population, or authorize a paper claim.

## Fresh complete population

Use requested seed:

`3,350,104,000 + caseIndex`, for case indices 0–899.

Repeat the exact 900-case map/opponent/country/start/slot crossing, but run only
the ceiling-150 arm. The disabled arm already passed technical smoke and cannot
identify an enabled-boundary failure. Each case remains capped at 24,000
updates and uses the same physical-building adjudicator, symmetric resignation
suppression, full-state firewall, strategies, maps, opponents, and game options.

No first-M2 seed is reused. No failed or completed first-M2 cell is rerun.

## Allowed output

Each case must run to its natural literal terminal or 24,000-update cap while
discarding the competitive payload. It writes one technical record containing
only immutable identities and booleans for:

- setup and deterministic start;
- adjudicator contract;
- telemetry schema and clock;
- gameplay-reserve overflow absent;
- total-ceiling overflow absent;
- rolling order cap respected;
- rolling total cap respected;
- forwarded chunk cap respected;
- one-forward invariant;
- forwarded target validation;
- production-batch atomicity; and
- action/state hash validity and resignation suppression.

It may report a categorical technical status derived from those booleans. It
must not serialize the episode outcome, endpoint orientation, terminal update,
building counts, units, credits, score, winner, defeated side, action or state
contents, overflow magnitude, or competitive ranking.

Expected technical violations write a complete record and exit successfully so
the entire population can be aggregated. Unexpected runtime exceptions fail
the Slurm task and block analysis.

## Execution and analysis

- current-source pure gate and zero-update 900-case manifest;
- one preserved technical smoke;
- exact array `0-899%64` on `pi_jss233/day`, one CPU and 8 GiB, no requeue;
- afterok finalizer, one CPU and 8 GiB;
- exact unique scheduler IDs and zero restarts/retries/exclusions;
- no partial record inspection; and
- final file count below 2,000.

The finalizer reports the complete boolean/status contingency by opponent, map,
direction, faction, country, and slot. It reports counts only, never outcome or
terminal time.

## Advancement

- If any reserve or total-budget gate fails, the current hard-ceiling arbiter
  is not eligible for 24,000-update outcome evaluation. Do not rerun M2 and do
  not suppress essential actions or retrospectively enlarge reserve 35.
- If only another telemetry or action-boundary invariant fails, repair only
  that interface prospectively and rerun a fresh complete technical gate.
- If the adjudicator or setup fails, repair that infrastructure without
  changing policy, cases, outcomes, or thresholds.
- If all 900 cases are clean, treat the first M2 failure as unexplained and do
  not relaunch outcomes without another prospectively falsifiable diagnosis.

All first-M2 pair files remain sealed permanently.
