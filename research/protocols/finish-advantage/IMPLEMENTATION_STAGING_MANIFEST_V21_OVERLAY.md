# Finish-advantage implementation staging manifest, version 21 overlay

Status: staged outside the tracked checkout while repaired sealed V5
confirmation array `22341679`, dependent technical gate `22342013`, and
authorized unblinder `22342015` remain active or dependency-blocked.

Recorded: 2026-08-15 (America/New_York)

## Purpose and boundary

This prospective, outcome-blind overlay applies after the complete V18 staging
set and the V19/V20 overlays. It turns the terminal-objective doctrine into a
time-consistent building-versus-force decision. It changes no active V5 source,
policy, job, population, output, or analysis.

- V18 manifest SHA-256:
  `3a4f2c655ba1ef6e6bf575eeb827ea607626b6a8426e9060865f56a029ef7ae4`
- V19 overlay manifest SHA-256:
  `69c758d912c716c22d03f22fa0b4e8ab0aac9e057a3dd1ac74e3f899f5d5f0ed`
- V20 overlay manifest SHA-256:
  `61ace1dcab80b3aa85c41d588d8cbc9ec7769c2d3846c21bf82e8ceb601d2434`
- decision-doctrine amendment 7 SHA-256:
  `d1bf17baa7d5a383c8417572e71d7c2b3a029e81dc4846002f5b44b815649168`

## Executable change

The controller now estimates a target's earliest destruction tick from the
actual arrival time and damage rate of every assigned attacker. Formally, it
selects the earliest tick at which cumulative post-arrival damage reaches the
target's remaining hit points. A slow unit that arrives after nearer units can
already destroy the target therefore cannot delay or invalidate that strike.

Enemy forces are not treated as objectives merely because they lie near the
route. Visible ordinary threats are aggregated into a strike-collapse
certificate. The controller clears only the participating causal blockers when
their collective damage can destroy the committed strike before the building
is destroyed (including the predeclared safety allowance). Otherwise it keeps
attacking the building. The existing own-base race remains an earlier safety
gate, so a force that can destroy the candidate's last buildings first is still
defended against.

This implements the predeclared terminal-objective rule:

- destroy enemy buildings directly when the strike can survive long enough;
- eliminate armed forces only when they causally prevent that destruction or
  win the candidate's own base race; and
- do not divert from a remaining building to irrelevant off-route forces, even
  when those forces are numerous.

Uncalibrated or special-weapon threats remain a separate fail-closed interface
requirement; this overlay does not silently assign them ordinary DPS.

## File commitments

| File | SHA-256 |
|---|---|
| `finishAdvantageControl.ts` | `a4d8086ec3d13fd2d746c72bf6d43cc7c1fbb747cbe1f729f59434f618847076` |
| `finishAdvantageControl.test.ts` | `d8840d1a78aab234e7e8c1102ddcb18cec4253ef3002fd358d7f09666cb71ff0` |
| `finishAdvantageStrategy.ts` | `734f9c56d60ceb47157e49c14a765303b8c79f99276e420e01958dadaed1e632` |
| `finishAdvantageStrategy.test.ts` | `c291df93c0ca3a48e095ed918283a9de4de6ca8e7e360e717d017f29c525e580` |

All other integration files remain those committed by V18, V19, and V20.

## Verification

In an isolated copy of the staged TypeScript mirror:

- strict TypeScript checking passed for the changed controller and strategy
  with their dependency closure;
- Vitest 4.1.10 passed five files and 60 tests with zero failures;
- staggered-arrival tests prove that a near unit may finish a building before a
  far assigned unit arrives and that later waves join only when needed;
- policy tests prove that one non-causal weak route force is ignored, multiple
  forces whose collective damage collapses the strike are cleared, and a
  lethal route blocker is cleared; and
- fixtures isolate route blocking from the distinct own-base-race safety gate.

These checks authorize later integration testing only after the active sealed
chain is terminal. They do not authorize competitive evaluation or a paper
claim.
