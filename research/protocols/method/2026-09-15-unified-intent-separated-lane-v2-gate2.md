# Unified intent arbiter V2 Gate 2: full-horizon live compatibility

Frozen: 2026-09-15, after V2 Gate 1 passed and before any Gate 2
initialization or live trace.

Parents:

- `research/protocols/method/2026-09-14-unified-intent-separated-lane-v2.md`
- `research/results/2026-09-15-unified-intent-separated-lane-v2-gate1.md`

## Question

Can separated-lane V2 execute through natural literal termination or 24,000
updates across every frozen map, opponent, country, start, and slot while
respecting its 115-call command ceiling and preserving every essential action?

This is an outcome-blind technical gate. All competitive payloads are
discarded.

## Fresh population

Use requested engine seed:

`3,350,105,000 + caseIndex`, for case indices 0–899.

Cross exactly:

- pinned external Supalosa on all 15 maps: 540 cases;
- pinned RA2Web Advanced on ten HFO maps: 360 cases;
- first two starts in both directions;
- all nine countries; and
- candidate slots 0 and 1.

There are 900 unique cases in 25 opponent-map families. Every case runs only
deployed StrongBot with `separated_lanes_v2` and command ceiling 115.

Add 25 deterministic execution duplicates: select the cases with the smallest
SHA-256 of `unified-intent-v2-gate2-duplicate-v1`, NUL, and canonical case
identity. Duplicates reuse their original case, seed, runtime, and policy.
There are 925 tasks and 925 episodes total.

## Runtime and endpoint boundary

Use the pinned physical-building adjudicator, symmetric resignation
suppression, `api_full_state` firewall for both players, and the same game
settings as M2. Run to natural literal terminal or 24,000 updates.

The episode may internally determine termination so it can stop safely, but
the successful technical record must not serialize winner, score, endpoint
orientation, defeated side, terminal update, building or unit state, credits,
damage, overflow magnitude, or action/state contents.

## Per-case record

Each successful task writes one compact record and one checksum marker with:

- source, program, protocol, Gate 1, runtime, map, opponent, case, seed, and
  scheduler identities;
- fixed V2 mode, command ceiling 115, and rolling window 900;
- booleans for command-cap, one-forward, target-validation, chunk,
  production-atomicity, public-call/state hash, and resignation gates;
- measured aggregate counts of essential calls, proposals, forwarded orders,
  conflicts, duplicate suppressions, and deferrals; and
- a canonical technical digest.

Counts may demonstrate mechanism activation but cannot encode the competitive
endpoint or terminal time. Essential calls are reported and may exceed 35;
they must never be suppressed, coalesced, or deferred by V2.

## Gates

Every case must satisfy:

- mode exactly `separated_lanes_v2`;
- command ceiling 115 and rolling window 900;
- maximum rolling command calls at most 115;
- zero command-ceiling overflow update;
- maximum forwarded chunk size at most 128;
- zero multiple-forward, forwarded-validation, and partial-production-batch
  violation;
- every essential request observed by the central wrapper is forwarded;
- zero forwarded resignation under the symmetric evaluator;
- valid public-call, public-state, telemetry, assignment, and provenance
  hashes; and
- schema-valid, finite, nonnegative telemetry.

Across the complete population require at least one proposal, one forwarded
order, one same-unit conflict, one duplicate suppression, one deferral, one
essential call, and one production batch. All 25 duplicates must be exact for
technical counts, booleans, and hashes after excluding scheduler and
task/replicate indices.

## Selector, scheduler, and storage

Before live episodes, initialize all 900 unique cases at zero updates and
freeze a manifest binding all source, method, Gate 1, C1, runtime, asset, map,
opponent, endpoint, dependency, and Slurm hashes. Verify exact starts, seeds,
coverage, duplicate selection, and absence of competitive fields.

Then run one preserved outcome-discarding smoke, followed by:

- exact array `0-924%64`;
- `pi_jss233/day`, CPU only, no GPU or requeue;
- one CPU and 8 GiB per episode, at most four hours;
- afterok fail-closed finalizer, one CPU and 16 GiB, at most two hours;
- exact unique scheduler IDs and zero restart/retry/exclusion/replacement;
- successful task stdout/stderr to `/dev/null`; and
- final file count below 2,000.

Do not inspect individual or partial records. Inspect only the complete
aggregate after all 925 tasks and the finalizer complete cleanly.

## Advancement

Gate 2 passes only if every per-case, aggregate-mechanism, duplicate, pure,
provenance, scheduler, and storage gate passes. Preserve the complete result.

Only then may a new paired open-development outcome protocol compare disabled
StrongBot against V2 on fresh seeds. If Gate 2 fails, repair only the failed
technical interface prospectively; do not expose or infer competitive payloads.
