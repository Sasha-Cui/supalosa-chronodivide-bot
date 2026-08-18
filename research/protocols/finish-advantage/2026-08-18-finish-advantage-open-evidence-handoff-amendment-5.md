# Finish-advantage open-screen evidence handoff, amendment 5

Status: **prospectively frozen before competitive campaign generation**

Recorded: 2026-08-18 UTC

## Purpose

The open-screen generator originally required every prerequisite artifact's
simulation source commit to equal the commit generating the competitive
campaign. That condition became impossible after outcome-free validator and
stimulus repairs were committed prospectively. Rewriting historical artifact
source fields would destroy provenance; rerunning passed technical evidence
would add cost without changing the policy.

This amendment permits only the exact completed prerequisite chain below and
records each artifact's distinct simulation and aggregation source rather than
pretending they are one commit.

## Exact prerequisite artifacts

State audit:

- SHA-256 `bb9c77605461b865042d16f49147757699cbd5dc964c34b3df3ac24fd24fd66c`;
- selected margins `[8, 0]`, canonically interpreted as margin 0;
- complete 360-game outcome-blind population.

Official-map gate:

- artifact SHA-256 `b29cc3d0d5501aa303d6e2fe40cd2c1f5aa761b86969100891efc098a18eaa50`;
- campaign SHA-256 `fb887bbc5ca2f827550e47337a207de862ecd39f95177dbde9f4ac7b0d5b03d4`;
- simulation source `0bfd3ef1b2487b3914936d7b516e4abb1ca99b43`;
- aggregator source `7f4a0eb3e23ba29d64cf63ee6fdeded9a91be4be`;
- aggregation repair SHA-256
  `d03f6921568f3c7a709c720447431fb148308e22913a5fae35c5a48c4beef88c`;
- array `22596084`, repaired controller `22597427`, 1,476 accounted probes,
  and 15/41 certified families.

Composite gate:

- artifact SHA-256 `c0391854746f7c4b5bc02d1fd9e01826b5708cedc05b54e42a72a8ffc4edbee9`;
- source `d98bc78296fc80f57ee7a180a9462c5f2782bec4`;
- job `22599105`, 72 accounted games, all nine countries and reciprocal slots;
- strict literal-endpoint base-race mode, surplus-cover margin 0;
- 24,000-tick horizon and amendment-6 commitment; and
- all equivalence, determinism, ownership, irreversible, surplus, protected-
  separation, unseen-approach, and visible-handoff requirements passed.

No prerequisite contains or authorizes a competitive outcome.

## Generator rule

The generator may accept a prerequisite whose simulation source differs from
current `main` only when every exact identity above matches. It must still run
from clean pushed `main` and bind the full artifact bytes and SHA-256 values in
the campaign. Any different source, array, controller, campaign, repair,
selected margin, horizon, map, game count, or status fails closed.

This exception applies only to the exact prerequisite chain above. It is not a
general relaxation of source matching.

## Competitive campaign replacement

The first competitive campaign becomes schema 3, status
`FROZEN_FINISH_ADVANTAGE_COMPLETE_OPEN_CAUSAL_SCREEN_V3`, and fresh seed base
`4,227,100,000`. It retains the ten permanently open families, all nine
countries, reciprocal slots, complete arm set selected from margins `[0, 8]`,
24,000-tick literal endpoint, no selective retry, and every existing absolute,
paired, draw, country, faction, mechanism, and leave-one-family-out gate.

This amendment changes evidence handoff and fresh seeds only. It changes no
policy, arm, map, estimand, threshold, endpoint, or advancement rule.
