# Finish-advantage implementation staging manifest, version 24 overlay

Status: staged outside the tracked checkout while repaired sealed V5
confirmation array `22341679`, dependent technical gate `22342013`, and
authorized unblinder `22342015` remain active or dependency-blocked.

Recorded: 2026-08-15 (America/New_York)

## Purpose and boundary

V24 follows the integration-eligible V18--V21/V23 stack and corrects the
remaining non-staggered candidate-base-loss estimate in the multi-building
finish strategy. It changes no active V5 source, policy, job, population,
output, or analysis.

- V23 overlay manifest SHA-256:
  `5ca8a4bffc7635199e16b336b6344fbfdacec918aebe2cd3ecd6e2f7836f2387`
- staggered-base-loss amendment 10 SHA-256:
  `5c3d04193e59df13ce06b5329a9df41bfbbba18ccc19b20c9f14c8ba52cf868a`

## Executable change

Each candidate-owned building now receives a separate set of enemy
damage-arrival rows. Each ordinary enemy force contributes only after its own
travel time to that building, at its own calibrated damage rate. The shared V21
staggered-damage estimator determines that building's destruction time and the
forces that actually participate before completion.

The predicted zero-building transition is the latest destruction time across
all candidate-owned buildings. If any building lacks a finite destruction
estimate, complete elimination is not asserted. The deterministic threat
witness is the smallest participating force identifier on a building whose
destruction completes the zeroing transition.

This prevents a distant high-damage enemy from borrowing a nearby weak enemy's
arrival time and causing a spurious defensive abstention.

## File commitments

| File | SHA-256 |
|---|---|
| `finishAdvantageStrategy.ts` | `874e5abd28bea3d2ee65dd450a0c98fa871738d15017b8213502f57824e4928a` |
| `finishAdvantageStrategy.test.ts` | `adcdb8a7268ae512d020e5b2c32227a9635e098f247950efb87929153f440427` |

All other integration files remain those committed by V18--V21/V23. V22
remains excluded.

## Verification

In an isolated V18--V21/V23 integration mirror with V24 applied:

- strict TypeScript checking passed for finish control and strategy;
- Vitest 4.1.10 passed five affected files and 61 tests with zero failures;
- an explicit near-weak/distant-heavy fixture reports the physically possible
  300-tick base-loss time rather than the former sub-tick artifact;
- that fixture keeps the safe building strike whose completion is below 300
  ticks; and
- existing earlier-base-loss, route-blocker, collective-blocker, staggered
  friendly arrival, and policy-partition regressions remain green.

These checks authorize later integration testing only after the active sealed
chain is terminal. They do not authorize competitive evaluation or a paper
claim.
