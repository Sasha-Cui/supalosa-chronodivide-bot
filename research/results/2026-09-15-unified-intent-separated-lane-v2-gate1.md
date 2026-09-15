# Unified intent arbiter V2 Gate 1: pure separated-lane behavior

Date: 2026-09-15

Status: **PASS — eligible for outcome-blind full-horizon compatibility**

This gate validates the source-level separated-lane contract. It contains no
simulation outcome or policy-strength evidence.

## Bound method and source

- V2 protocol and C1 result: commit `6d596cf`
- V2 implementation and tests: commit `cabbfcd`
- Source branch: synchronized `main` / `fork/main`
- Pure-gate job: `26212869`
- Account/partition: `pi_jss233/day`
- CPUs/restarts: one / zero
- Elapsed time: 18 seconds
- Artifact SHA-256:
  `82d9b5abbab8773f0667a65668a984612e92932248a2b8ceef231092d42a152d`

The artifact source commit is
`cabbfcd9fe31ef8f133c41d6161e04723eac5776`, and its pure-runner SHA-256 is
`a8bd95db3beb788f4f01ec3fc45ea31805dc48d9c6f45ca8dca815b86dda2872`.

## Tests

The build, 15 focused files containing 152 tests, and one runtime-schema test
all passed. The suite covers:

- disabled behavior and V1 hard-total compatibility;
- explicit `separated_lanes_v2` configuration;
- command ceiling 115 over a rolling 900-update window;
- order priority over best-effort debug traffic;
- 200 immediate essential calls after command saturation;
- consecutive production-batch passthrough and atomicity;
- deterministic priority, target overloads, canonical grouping, and chunks;
- one-forward-per-unit, validation, duplicate suppression, deferral, expiry,
  and terminal revocation;
- all 52 direct StrongBot order sites in 29 routines;
- terminal-building bypass, blocker, owner-change, and progress rules; and
- full-state and fog-respecting firewall behavior.

The saturated V2 tests forwarded all essential repair and production calls,
forwarded exactly 115 command calls, dropped best-effort debug after the
command lane filled, reported zero command overflow, and reported zero partial
production batch.

## Interface

V2 exposes:

- immutable mode `separated_lanes_v2`;
- immutable command ceiling 115;
- rolling command usage and command-overflow telemetry; and
- measured essential-lane activity without reserve or hard-total enforcement.

Legacy V1 telemetry fields remain populated solely so frozen V1 artifacts can
be reproduced. They do not constrain or define the V2 essential lane.

## Decision

V2 Gate 1 passes. The next admissible step is a fresh, full-map,
dual-opponent, outcome-blind 24,000-update compatibility population. V2 makes
no competitive claim until that gate passes and a separate paired outcome
protocol is frozen.
