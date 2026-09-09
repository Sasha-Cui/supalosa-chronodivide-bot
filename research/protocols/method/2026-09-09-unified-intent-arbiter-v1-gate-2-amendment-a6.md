# Unified intent arbiter V1 Gate 2 amendment A6

Frozen: 2026-09-09, after manifest job 25678716 failed and before the wrapper
repair or replacement submission.

Parents: Gate 2 and Amendments A1–A5.

Failure record:

research/results/2026-09-09-unified-intent-gate2-manifest-wrapper-failure.md

## Failure

Job 25678716 failed in four seconds before invoking Node because the committed
wrapper contained literal plus separators where shell continuations were
intended. It wrote no execution file and initialized no game.

## Repair

- place each Node command on one physical line;
- require shell syntax plus a regression assertion that no Node command
  contains the literal sequence --no-warnings plus;
- bind updated manifest, trace, and finalizer Slurm hashes;
- use fresh root execution-v1-wrapper-a1; and
- regenerate the complete zero-update manifest from the beginning.

## Unchanged requirements

The selected seed base and certificate, five maps, two directions, nine
countries, both slots, 180 pairs, 360 tasks, arms, fixed horizon, action
forwarding, snapshot schema, pairwise identity gate, outcome prohibitions,
resources, file budget, and advancement rules are unchanged.
