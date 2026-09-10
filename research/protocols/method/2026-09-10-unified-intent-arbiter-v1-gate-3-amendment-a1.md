# Unified intent arbiter V1 Gate 3 Amendment A1: failure-class diagnostic

Frozen: 2026-09-10, after array `25831840` failed and before any diagnostic
initialization or fresh trace.

Parent protocol:

- `research/protocols/method/2026-09-09-unified-intent-arbiter-v1-gate-3.md`

Failure record:

- `research/results/2026-09-10-unified-intent-arbiter-v1-gate-3-failed.md`

## Purpose

The first Gate 3 array produced 18 generic technical failures in two systematic
map/direction/faction groups. The frozen failure schema intentionally omitted
the cause. This amendment defines one fresh, outcome-blind diagnostic to
distinguish a fixed-horizon lifecycle failure from an arbiter telemetry/trace
contract failure without opening any of the 907 successful case artifacts.

This diagnostic cannot pass Gate 3, select a ceiling, estimate strength, or
authorize M2.

## Fresh complete population

Use the audited reserved interval with 72 new base seeds:

`3,350,101,000 + diagnosticCaseIndex`, for indices 0–71.

Cross completely:

- maps: HFO LE and Tour of Egypt;
- opponent: pinned external Supalosa;
- first two starts in both directed orientations;
- all nine countries; and
- candidate slots 0 and 1.

This is 2 x 2 x 9 x 2 = 72 cases. Each case runs all four frozen arms as
separate Slurm tasks, yielding exactly 288 tasks. The design includes every
counterfactual faction and direction cell on the two implicated maps rather
than selectively rerunning the 18 failed assignments. No original Gate 3 seed
is reused.

## Fixed runtime and actions

Retain source/runtime/map/external-Supalosa/firewall/game-setting identities,
the 3,600-update horizon, and the disabled/75/150/300 arms exactly. Reserve is
35. Do not change arbitration, retry, TTL, priority, grouping, chunk, terminal,
strategy, map profile, observation, or action behavior.

One Slurm task runs exactly one case-arm so a technical failure cannot hide the
later arms in the same case.

## Allowed diagnostic output

Each task writes one compact technical record and marker. It may contain only:

- immutable source, program, protocol, runtime, map, opponent, assignment,
  seed, arm, and scheduler identities;
- one categorical technical status from `clean`, `fixed_horizon_incomplete`,
  `telemetry_contract`, `trace_contract`, or `setup_contract`;
- for `clean`, fixed update/snapshot counts, telemetry schema identity, and
  boolean satisfaction of the already frozen per-arm gates;
- for a contract failure, the violated technical gate names as booleans; and
- checksums.

It must never serialize the update of failure, W/D/L, winner, score, endpoint
orientation, defeated side, terminal building state/count, unit inventory,
credits, damage, action/trajectory contents, or competitive ranking. A fixed
horizon failure is a single categorical technical value with no arm-dependent
interpretation in the paper.

Every task exits successfully after writing a schema-valid diagnostic record;
unexpected runner/setup exceptions remain ordinary failed Slurm tasks and
block aggregation.

## Analysis and scheduler

- clean synchronized `main` and pinned Node 20.13.1;
- `pi_jss233/day`, CPU only, no requeue;
- selector: one CPU, 8 GiB, at most one hour;
- exact array `0-287%64`, one CPU and 8 GiB per task, at most four hours;
- afterok finalizer: one CPU, 8 GiB, at most one hour;
- exact scheduler IDs, zero restarts/retries/exclusions;
- one preserved smoke from a fresh case before the array;
- no partial task inspection; and
- aggregate only after all 288 records exist and scheduler accounting passes.

Report the complete contingency table by map, direction, faction, slot, and
arm for the categorical technical status. Do not compute or report a policy
performance statistic.

## Advancement

- If any telemetry or trace contract fails, repair only that technical
  interface prospectively and freeze a new complete Gate 3 population.
- If the only non-clean category is `fixed_horizon_incomplete`, do not shorten
  the 3,600-update gate and do not admit partial traces. Design a separate
  source-identical nonterminating technical harness that preserves actions and
  telemetry for 3,600 updates before freezing another complete Gate 3 attempt.
- If every diagnostic task is clean, treat the first failure as unexplained;
  do not rerun Gate 3 or advance without a new protocol identifying another
  falsifiable cause.

The original 907 successful artifacts remain sealed in every branch.
